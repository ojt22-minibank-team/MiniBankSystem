package com.corebanking.service;

import com.corebanking.dto.AccountLookupResponseDto;
import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.dto.P2PTransferResponseDto;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.*;
import com.corebanking.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class P2PTransferService {

    private static final BigDecimal MIN_TRANSFER_AMOUNT = new BigDecimal("1.00");

    private final AccountRepository accountRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final FeeScheduleRepository feeScheduleRepository;
    private final LedgerAccountRepository ledgerAccountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final AsyncNotificationService asyncNotificationService;
    private final TransferLimitService transferLimitService;
    private final MerchantSecurityValidationService merchantSecurityValidationService;

    /**
     * Executes internal P2P fund transfer with authentication ownership verification,
     * minimum transfer amount validation (100 MMK), minimum balance enforcement (50,000 MMK),
     * cumulative daily limit validation, deterministic deadlock-free locking, and double-entry ledger entries.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public P2PTransferResponseDto processP2PTransfer(String authenticatedUsername, P2PTransferRequestDto request, String idempotencyKey) {

        // =========================================================================
        // STEP 1: PRE-LOCKING VALIDATIONS & IDEMPOTENCY CHECK
        // =========================================================================
        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<BankTransactions> existingTxn = bankTransactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existingTxn.isPresent()) {
                log.info("Duplicate transaction request detected with idempotencyKey: {}. Returning existing record.", idempotencyKey);
                return mapToResponseDto(existingTxn.get());
            }
        }

        // Self-transfer check
        if (request.getSourceAccountNumber().equalsIgnoreCase(request.getDestinationAccountNumber())) {
            throw new TransactionException("Source and destination accounts cannot be identical.");
        }

        // Minimum Transfer Amount Check 
        if (request.getAmount() == null || request.getAmount().compareTo(MIN_TRANSFER_AMOUNT) < 0) {
            throw new TransactionException(String.format("Transfer amount must be at least %s MMK.", MIN_TRANSFER_AMOUNT));
        }

        // =========================================================================
        // STEP 1.1: TRANSACTION PIN VALIDATION (USING MerchantSecurityValidationService)
        // =========================================================================
        if (request.getTransactionPin() == null || request.getTransactionPin().trim().isEmpty()) {
            throw new InvalidPinException("Transaction PIN is required.");
        }
        UUID customerUuid;
        try {
            customerUuid = UUID.fromString(authenticatedUsername);
        } catch (IllegalArgumentException e) {
            throw new SecurityException("Invalid customer authentication principal");
        }
        merchantSecurityValidationService.validateTransactionPin(customerUuid, request.getTransactionPin().trim());

        BigDecimal serviceFee = calculateTransferFee(request.getAmount());
        BigDecimal totalDebitedAmount = request.getAmount().add(serviceFee);

        // =========================================================================
        // STEP 2: DETERMINISTIC ACCOUNT LOCKING (DEADLOCK PREVENTION)
        // Enforce lock hierarchy by ordering account numbers lexicographically
        // =========================================================================
        String firstAccNo = request.getSourceAccountNumber().compareTo(request.getDestinationAccountNumber()) < 0
                ? request.getSourceAccountNumber()
                : request.getDestinationAccountNumber();

        String secondAccNo = request.getSourceAccountNumber().compareTo(request.getDestinationAccountNumber()) < 0
                ? request.getDestinationAccountNumber()
                : request.getSourceAccountNumber();

        Accounts firstLocked = accountRepository.findByAccountNumberForUpdate(firstAccNo)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + firstAccNo));

        Accounts secondLocked = accountRepository.findByAccountNumberForUpdate(secondAccNo)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + secondAccNo));

        Accounts sourceAccount = firstLocked.getAccountNumber().equalsIgnoreCase(request.getSourceAccountNumber()) ? firstLocked : secondLocked;
        Accounts destAccount = firstLocked.getAccountNumber().equalsIgnoreCase(request.getSourceAccountNumber()) ? secondLocked : firstLocked;

        // =========================================================================
        // STEP 3: SECURITY & BUSINESS RULE VERIFICATIONS
        // =========================================================================
        // Account Ownership Check (IDOR Security Protection)
        if (!sourceAccount.getCustomer().getCustomerId().toString().equalsIgnoreCase(authenticatedUsername)) {
            throw new TransactionException("Authenticated user does not own the source account.");
        }

        // Account Status Check
        if (sourceAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Source account is not active. Status: " + sourceAccount.getStatus());
        }
        if (destAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Destination account is not active. Status: " + destAccount.getStatus());
        }

        // Currency Consistency Check
        String reqCurrency = request.getCurrency() != null ? request.getCurrency() : "MMK";
        if (!sourceAccount.getCurrency().equalsIgnoreCase(destAccount.getCurrency()) || 
            !sourceAccount.getCurrency().equalsIgnoreCase(reqCurrency)) {
            throw new TransactionException(String.format("Currency mismatch. Source: %s, Destination: %s",
                    sourceAccount.getCurrency(), destAccount.getCurrency()));
        }

        BigDecimal minBalance = transferLimitService.getEffectiveMinimumBalance(sourceAccount);

        BigDecimal netAvailable = sourceAccount.getAvailableBalance().subtract(minBalance);
        if (netAvailable.compareTo(totalDebitedAmount) < 0) {
            throw new InsufficientFundsException(String.format(
                    "Insufficient available funds. You must maintain a minimum balance of %,.2f %s. Required: %,.2f %s (Amount: %,.2f + Fee: %,.2f), Net available: %,.2f %s",
                    minBalance, reqCurrency, totalDebitedAmount, reqCurrency, request.getAmount(), serviceFee, netAvailable.max(BigDecimal.ZERO), reqCurrency));
        }

        // Multi-tier Transfer Limit Validations (Bank Max, One-Time Limit, Beneficiary vs Stranger, Cumulative Daily Limit)
        transferLimitService.validateTransferLimits(sourceAccount, destAccount, request.getAmount());

        // =========================================================================
        // STEP 4: ATOMIC BALANCE UPDATES
        // =========================================================================
        BigDecimal sourceBalanceBefore = sourceAccount.getCurrentBalance();
        BigDecimal destBalanceBefore = destAccount.getCurrentBalance();

        sourceAccount.setAvailableBalance(sourceAccount.getAvailableBalance().subtract(totalDebitedAmount));
        sourceAccount.setCurrentBalance(sourceAccount.getCurrentBalance().subtract(totalDebitedAmount));

        destAccount.setAvailableBalance(destAccount.getAvailableBalance().add(request.getAmount()));
        destAccount.setCurrentBalance(destAccount.getCurrentBalance().add(request.getAmount()));

        accountRepository.save(sourceAccount);
        accountRepository.save(destAccount);

        // =========================================================================
        // STEP 5: MASTER TRANSACTION PERSISTENCE
        // =========================================================================
        String transactionRef = generateTransactionRef();
        LocalDateTime now = LocalDateTime.now();

        BankTransactions bankTransaction = BankTransactions.builder()
                .transactionRef(transactionRef)
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .status(TransactionStatus.COMPLETED)
                .sourceAccount(sourceAccount)
                .destinationAccount(destAccount)
                .amount(request.getAmount())
                .serviceFee(serviceFee)
                .currency(reqCurrency)
                .initiatedByType(InitiatedByType.CUSTOMER)
                .initiatedByCustomer(sourceAccount.getCustomer())
                .channel(TransactionChannel.CUSTOMER_PORTAL)
                .idempotencyKey(idempotencyKey)
                .description(request.getDescription() != null ? request.getDescription() : "P2P Fund Transfer")
                .auditNote("P2P transfer ")
                .authorizedAt(now)
                .completedAt(now)
                .expiresAt(null)
                .externalReference(null)
                .failureCode(null)
                .failureMessage(null)
                .build();

        bankTransactionRepository.save(bankTransaction);

        // =========================================================================
        // STEP 6: DOUBLE-ENTRY LEDGER RECORDING
        // =========================================================================
        createLedgerEntries(bankTransaction, sourceAccount, destAccount, request.getAmount(), serviceFee, sourceBalanceBefore, destBalanceBefore);

        // =========================================================================
        // STEP 7: ASYNCHRONOUS POST-PROCESSING (NOTIFICATIONS)
        // =========================================================================
        asyncNotificationService.sendTransferNotificationsAsync(
                sourceAccount.getCustomer(),
                destAccount.getCustomer(),
                bankTransaction
        );

        log.info("P2P Transfer completed successfully. Ref: {}, Source: {}, Dest: {}, Amount: {}, Fee: {}", 
                transactionRef, sourceAccount.getAccountNumber(), destAccount.getAccountNumber(), request.getAmount(), serviceFee);

        return mapToResponseDto(bankTransaction);
    }

    /**
     * Calculates transfer fee solely from active FeeSchedules in the database.
     * Returns BigDecimal.ZERO if no active schedule exists.
     */
    private BigDecimal calculateTransferFee(BigDecimal amount) {
        return feeScheduleRepository.findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(TransactionType.INTERNAL_TRANSFER)
                .map(schedule -> {
                    BigDecimal fee = BigDecimal.ZERO;
                    if (schedule.getFeeType() == FeeType.FLAT) {
                        fee = schedule.getFeeValue();
                    } else if (schedule.getFeeType() == FeeType.PERCENTAGE) {
                        fee = amount.multiply(schedule.getFeeValue()).divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
                    }
                    if (schedule.getMinimumFee() != null && fee.compareTo(schedule.getMinimumFee()) < 0) {
                        fee = schedule.getMinimumFee();
                    }
                    if (schedule.getMaximumFee() != null && fee.compareTo(schedule.getMaximumFee()) > 0) {
                        fee = schedule.getMaximumFee();
                    }
                    return fee;
                })
                .orElse(BigDecimal.ZERO); 
    }

    private void createLedgerEntries(BankTransactions txn, Accounts source, Accounts dest, BigDecimal amount, BigDecimal fee, BigDecimal sourceBalBefore, BigDecimal destBalBefore) {
        BigDecimal totalDebited = amount.add(fee);

        // Line 1: Debit Source Customer Deposit Ledger
        LedgerAccounts sourceLedgerAcc = ledgerAccountRepository.findByCustomerAccount(source)
                .orElseGet(() -> ledgerAccountRepository.findByLedgerCode("GL-CUSTOMER-DEPOSITS")
                        .orElseThrow(() -> new IllegalStateException("GL-CUSTOMER-DEPOSITS ledger account not configured.")));

        LedgerEntries sourceEntry = LedgerEntries.builder()
                .transaction(txn)
                .lineNo(1)
                .ledgerAccount(sourceLedgerAcc)
                .entryType(EntryType.DEBIT)
                .amount(totalDebited)
                .currency(txn.getCurrency())
                .balanceBefore(sourceBalBefore)
                .balanceAfter(sourceBalBefore.subtract(totalDebited))
                .narration("P2P Transfer Debit from Acc: " + source.getAccountNumber())
                .build();
        ledgerEntryRepository.save(sourceEntry);

        // Line 2: Credit Destination Customer Deposit Ledger
        LedgerAccounts destLedgerAcc = ledgerAccountRepository.findByCustomerAccount(dest)
                .orElseGet(() -> ledgerAccountRepository.findByLedgerCode("GL-CUSTOMER-DEPOSITS")
                        .orElseThrow(() -> new IllegalStateException("GL-CUSTOMER-DEPOSITS ledger account not configured.")));

        LedgerEntries destEntry = LedgerEntries.builder()
                .transaction(txn)
                .lineNo(2)
                .ledgerAccount(destLedgerAcc)
                .entryType(EntryType.CREDIT)
                .amount(amount)
                .currency(txn.getCurrency())
                .balanceBefore(destBalBefore)
                .balanceAfter(destBalBefore.add(amount))
                .narration("P2P Transfer Credit to Acc: " + dest.getAccountNumber())
                .build();
        ledgerEntryRepository.save(destEntry);

        // Line 3: Credit Fee Income Ledger (If fee > 0)
        if (fee.compareTo(BigDecimal.ZERO) > 0) {
            LedgerAccounts feeLedgerAcc = ledgerAccountRepository.findByLedgerCode("GL-FEE-REVENUE")
                    .orElseThrow(() -> new IllegalStateException("GL-FEE-REVENUE ledger account not configured."));

            LedgerEntries feeEntry = LedgerEntries.builder()
                    .transaction(txn)
                    .lineNo(3)
                    .ledgerAccount(feeLedgerAcc)
                    .entryType(EntryType.CREDIT)
                    .amount(fee)
                    .currency(txn.getCurrency())
                    .narration("P2P Transfer Fee Income for Ref: " + txn.getTransactionRef())
                    .build();
            ledgerEntryRepository.save(feeEntry);
        }
    }

    private String generateTransactionRef() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        int randomNum = ThreadLocalRandom.current().nextInt(1000, 9999);
        return String.format("TXN-P2P-%s-%d", dateStr, randomNum);
    }

    private P2PTransferResponseDto mapToResponseDto(BankTransactions txn) {
        BigDecimal totalDebited = txn.getAmount().add(txn.getServiceFee());
        return P2PTransferResponseDto.builder()
                .transactionRef(txn.getTransactionRef())
                .status(txn.getStatus())
                .sourceAccountNumber(txn.getSourceAccount() != null ? txn.getSourceAccount().getAccountNumber() : null)
                .destinationAccountNumber(txn.getDestinationAccount() != null ? txn.getDestinationAccount().getAccountNumber() : null)
                .amount(txn.getAmount())
                .serviceFee(txn.getServiceFee())
                .totalDebitedAmount(totalDebited)
                .currency(txn.getCurrency())
                .completedAt(txn.getCompletedAt())
                .description(txn.getDescription())
                .build();
    }

    @Transactional(readOnly = true)
    public AccountLookupResponseDto lookupAccount(String accountNumber) {
        Accounts account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + accountNumber));

        String accountName = (account.getCustomer() != null && account.getCustomer().getFullName() != null)
                ? account.getCustomer().getFullName()
                : "N/A";

        return AccountLookupResponseDto.builder()
                .accountNumber(account.getAccountNumber())
                .accountName(accountName)
                .accountType(account.getAccountType() != null ? account.getAccountType().name() : null)
                .status(account.getStatus() != null ? account.getStatus().name() : null)
                .build();
    }
}
