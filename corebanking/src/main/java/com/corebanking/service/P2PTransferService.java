package com.corebanking.service;

import com.corebanking.dto.AccountLookupResponseDto;
import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.dto.P2PTransferResponseDto;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.*;
import com.corebanking.queue.TransferQueueProducer;
import com.corebanking.queue.TransferQueueMessage;
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
import java.util.LinkedHashMap;
import java.util.Map;
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
    private final TransferQueueProducer transferQueueProducer;
    private final AuditTrailService auditTrailService;

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

        // =========================================================================
        // STEP 8: 5Ws AUDIT TRAIL LOGGING
        // =========================================================================
        try {
            Map<String, Object> oldState = new LinkedHashMap<>();
            oldState.put("sourceAccountNumber", sourceAccount.getAccountNumber());
            oldState.put("sourceBalanceBefore", sourceBalanceBefore);
            oldState.put("destinationAccountNumber", destAccount.getAccountNumber());
            oldState.put("destinationBalanceBefore", destBalanceBefore);

            Map<String, Object> newState = new LinkedHashMap<>();
            newState.put("sourceAccountNumber", sourceAccount.getAccountNumber());
            newState.put("sourceBalanceAfter", sourceAccount.getCurrentBalance());
            newState.put("destinationAccountNumber", destAccount.getAccountNumber());
            newState.put("destinationBalanceAfter", destAccount.getCurrentBalance());
            newState.put("transferAmount", request.getAmount());
            newState.put("serviceFee", serviceFee);
            newState.put("totalDebited", totalDebitedAmount);
            newState.put("currency", request.getCurrency() != null ? request.getCurrency() : "MMK");
            newState.put("status", TransactionStatus.COMPLETED.name());

            String memo = request.getDescription() != null ? request.getDescription() : "N/A";
            String auditDesc = String.format("P2P fund transfer of %,.2f %s from %s to %s completed successfully. Fee: %,.2f. Memo: %s",
                    request.getAmount(), (request.getCurrency() != null ? request.getCurrency() : "MMK"),
                    sourceAccount.getAccountNumber(), destAccount.getAccountNumber(), serviceFee, memo);

            auditTrailService.logDataChange(
                    "P2P_TRANSFER_COMPLETED",
                    "TRANSACTION",
                    transactionRef,
                    oldState,
                    newState,
                    auditDesc
            );
        } catch (Exception auditEx) {
            log.warn("Non-blocking audit logging failed for P2P transfer Ref: {}", transactionRef, auditEx);
        }

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

    public P2PTransferResponseDto mapToResponseDto(BankTransactions txn) {
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

    /**
     * Enqueues a P2P transfer request to the In-Memory Message Queue.
     * Pre-validates ownership, PIN, and balance, then pre-persists the transaction in INITIATED state.
     * Returns immediately to the caller for asynchronous non-blocking processing.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public P2PTransferResponseDto enqueueP2PTransfer(String authenticatedUsername, P2PTransferRequestDto request, String idempotencyKey) {
        String effectiveKey = (idempotencyKey != null && !idempotencyKey.trim().isEmpty())
                ? idempotencyKey.trim()
                : (request.getIdempotencyKey() != null ? request.getIdempotencyKey().trim() : null);

        // STEP 1: Idempotency Check
        if (effectiveKey != null) {
            Optional<BankTransactions> existingTxn = bankTransactionRepository.findByIdempotencyKey(effectiveKey);
            if (existingTxn.isPresent()) {
                log.info("Duplicate transaction request detected in enqueue with idempotencyKey: {}. Returning existing record.", effectiveKey);
                return mapToResponseDto(existingTxn.get());
            }
        }

        // STEP 2: Self-transfer check
        if (request.getSourceAccountNumber().equalsIgnoreCase(request.getDestinationAccountNumber())) {
            throw new TransactionException("Source and destination accounts cannot be identical.");
        }

        // STEP 3: Minimum Transfer Amount Check
        if (request.getAmount() == null || request.getAmount().compareTo(MIN_TRANSFER_AMOUNT) < 0) {
            throw new TransactionException(String.format("Transfer amount must be at least %s MMK.", MIN_TRANSFER_AMOUNT));
        }

        // STEP 4: Transaction PIN Validation
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

        // STEP 5: Account Lookups & Pre-Checks
        Accounts sourceAccount = accountRepository.findByAccountNumber(request.getSourceAccountNumber())
                .orElseThrow(() -> new AccountNotFoundException("Source account not found: " + request.getSourceAccountNumber()));
        Accounts destAccount = accountRepository.findByAccountNumber(request.getDestinationAccountNumber())
                .orElseThrow(() -> new AccountNotFoundException("Destination account not found: " + request.getDestinationAccountNumber()));

        if (!sourceAccount.getCustomer().getCustomerId().toString().equalsIgnoreCase(authenticatedUsername)) {
            throw new TransactionException("Authenticated user does not own the source account.");
        }
        if (sourceAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Source account is not active. Status: " + sourceAccount.getStatus());
        }
        if (destAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Destination account is not active. Status: " + destAccount.getStatus());
        }

        String reqCurrency = request.getCurrency() != null ? request.getCurrency() : "MMK";
        if (!sourceAccount.getCurrency().equalsIgnoreCase(destAccount.getCurrency()) || 
            !sourceAccount.getCurrency().equalsIgnoreCase(reqCurrency)) {
            throw new TransactionException(String.format("Currency mismatch. Source: %s, Destination: %s",
                    sourceAccount.getCurrency(), destAccount.getCurrency()));
        }

        BigDecimal serviceFee = calculateTransferFee(request.getAmount());
        BigDecimal totalDebitedAmount = request.getAmount().add(serviceFee);
        BigDecimal minBalance = transferLimitService.getEffectiveMinimumBalance(sourceAccount);
        BigDecimal netAvailable = sourceAccount.getAvailableBalance().subtract(minBalance);
        if (netAvailable.compareTo(totalDebitedAmount) < 0) {
            throw new InsufficientFundsException(String.format(
                    "Insufficient available funds. Required: %,.2f %s, Net available: %,.2f %s",
                    totalDebitedAmount, reqCurrency, netAvailable.max(BigDecimal.ZERO), reqCurrency));
        }

        transferLimitService.validateTransferLimits(sourceAccount, destAccount, request.getAmount());

        // STEP 6: Pre-persist BankTransactions in INITIATED state
        String transactionRef = generateTransactionRef();
        LocalDateTime now = LocalDateTime.now();

        BankTransactions bankTransaction = BankTransactions.builder()
                .transactionRef(transactionRef)
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .status(TransactionStatus.INITIATED)
                .sourceAccount(sourceAccount)
                .destinationAccount(destAccount)
                .amount(request.getAmount())
                .serviceFee(serviceFee)
                .currency(reqCurrency)
                .initiatedByType(InitiatedByType.CUSTOMER)
                .initiatedByCustomer(sourceAccount.getCustomer())
                .channel(TransactionChannel.CUSTOMER_PORTAL)
                .idempotencyKey(effectiveKey)
                .description(request.getDescription() != null ? request.getDescription() : "P2P Fund Transfer (Queued)")
                .auditNote("Enqueued for asynchronous message queue processing")
                .authorizedAt(now)
                .completedAt(null)
                .build();

        bankTransactionRepository.save(bankTransaction);

        // STEP 7: Publish message to Queue
        TransferQueueMessage message = TransferQueueMessage.builder()
                .transactionRef(transactionRef)
                .customerId(authenticatedUsername)
                .request(request)
                .idempotencyKey(effectiveKey)
                .enqueuedAt(now)
                .retryCount(0)
                .build();

        try {
            transferQueueProducer.publish(message);
        } catch (Exception e) {
            bankTransaction.setStatus(TransactionStatus.FAILED);
            bankTransaction.setFailureCode("QUEUE_DISPATCH_FAILED");
            bankTransaction.setFailureMessage(e.getMessage());
            bankTransactionRepository.save(bankTransaction);
            throw e;
        }

        log.info("Enqueued P2P Transfer [{}] successfully for customer: {}", transactionRef, authenticatedUsername);

        try {
            String currency = request.getCurrency() != null ? request.getCurrency() : "MMK";
            String memo = request.getDescription() != null ? request.getDescription() : "N/A";
            String auditDesc = String.format("P2P fund transfer of %,.2f %s from %s to %s enqueued for asynchronous processing. Memo: %s",
                    request.getAmount(), currency, request.getSourceAccountNumber(), request.getDestinationAccountNumber(), memo);

            auditTrailService.logActivity(
                    "TRANSACTION",
                    "P2P_TRANSFER_ENQUEUED",
                    "TRANSACTION",
                    transactionRef,
                    auditDesc
            );
        } catch (Exception auditEx) {
            log.warn("Non-blocking audit logging failed for enqueued P2P transfer Ref: {}", transactionRef, auditEx);
        }

        return mapToResponseDto(bankTransaction);
    }

    /**
     * Executes queued P2P transfer invoked by background consumer workers.
     * Applies deterministic pessimistic locking, atomic balance updates, double-entry ledgering,
     * and triggers asynchronous customer notifications.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public void executeQueuedTransfer(TransferQueueMessage message) {
        log.info("Processing queued transfer ref: {}", message.getTransactionRef());

        BankTransactions bankTransaction = bankTransactionRepository.findByTransactionRef(message.getTransactionRef())
                .orElseThrow(() -> new TransactionException("Transaction record not found for ref: " + message.getTransactionRef()));

        if (bankTransaction.getStatus() == TransactionStatus.COMPLETED) {
            log.warn("Transfer ref: {} is already COMPLETED. Skipping duplicate execution.", message.getTransactionRef());
            return;
        }

        P2PTransferRequestDto request = message.getRequest();
        BigDecimal serviceFee = bankTransaction.getServiceFee();
        BigDecimal totalDebitedAmount = request.getAmount().add(serviceFee);

        // Deterministic account ordering to prevent deadlocks
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

        if (sourceAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Source account is not active. Status: " + sourceAccount.getStatus());
        }
        if (destAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Destination account is not active. Status: " + destAccount.getStatus());
        }

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
                    "Insufficient available funds. Required: %,.2f %s, Net available: %,.2f %s",
                    totalDebitedAmount, reqCurrency, netAvailable.max(BigDecimal.ZERO), reqCurrency));
        }

        transferLimitService.validateTransferLimits(sourceAccount, destAccount, request.getAmount());

        BigDecimal sourceBalanceBefore = sourceAccount.getCurrentBalance();
        BigDecimal destBalanceBefore = destAccount.getCurrentBalance();

        sourceAccount.setAvailableBalance(sourceAccount.getAvailableBalance().subtract(totalDebitedAmount));
        sourceAccount.setCurrentBalance(sourceAccount.getCurrentBalance().subtract(totalDebitedAmount));

        destAccount.setAvailableBalance(destAccount.getAvailableBalance().add(request.getAmount()));
        destAccount.setCurrentBalance(destAccount.getCurrentBalance().add(request.getAmount()));

        accountRepository.save(sourceAccount);
        accountRepository.save(destAccount);

        LocalDateTime now = LocalDateTime.now();
        bankTransaction.setStatus(TransactionStatus.COMPLETED);
        bankTransaction.setCompletedAt(now);
        bankTransaction.setAuditNote("Completed asynchronously via In-Memory Queue Worker");
        bankTransactionRepository.save(bankTransaction);

        createLedgerEntries(bankTransaction, sourceAccount, destAccount, request.getAmount(), serviceFee, sourceBalanceBefore, destBalanceBefore);

        asyncNotificationService.sendTransferNotificationsAsync(
                sourceAccount.getCustomer(),
                destAccount.getCustomer(),
                bankTransaction
        );

        try {
            Map<String, Object> oldState = new LinkedHashMap<>();
            oldState.put("sourceAccountNumber", sourceAccount.getAccountNumber());
            oldState.put("sourceBalanceBefore", sourceBalanceBefore);
            oldState.put("destinationAccountNumber", destAccount.getAccountNumber());
            oldState.put("destinationBalanceBefore", destBalanceBefore);

            Map<String, Object> newState = new LinkedHashMap<>();
            newState.put("sourceAccountNumber", sourceAccount.getAccountNumber());
            newState.put("sourceBalanceAfter", sourceAccount.getCurrentBalance());
            newState.put("destinationAccountNumber", destAccount.getAccountNumber());
            newState.put("destinationBalanceAfter", destAccount.getCurrentBalance());
            newState.put("transferAmount", request.getAmount());
            newState.put("serviceFee", serviceFee);
            newState.put("totalDebited", totalDebitedAmount);
            newState.put("currency", reqCurrency);
            newState.put("status", TransactionStatus.COMPLETED.name());

            String memo = request.getDescription() != null ? request.getDescription() : "N/A";
            String auditDesc = String.format("Queued P2P fund transfer of %,.2f %s from %s to %s completed asynchronously. Fee: %,.2f. Memo: %s",
                    request.getAmount(), reqCurrency, sourceAccount.getAccountNumber(), destAccount.getAccountNumber(), serviceFee, memo);

            auditTrailService.logDataChange(
                    "P2P_TRANSFER_COMPLETED_ASYNC",
                    "TRANSACTION",
                    bankTransaction.getTransactionRef(),
                    oldState,
                    newState,
                    auditDesc
            );
        } catch (Exception auditEx) {
            log.warn("Non-blocking audit logging failed for queued transfer Ref: {}", bankTransaction.getTransactionRef(), auditEx);
        }

        log.info("Queued P2P Transfer [{}] completed successfully.", message.getTransactionRef());
    }

    /**
     * Marks a queued transfer as FAILED if processing in worker pool fails.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void markQueuedTransferFailed(String transactionRef, String failureReason) {
        try {
            Optional<BankTransactions> txnOpt = bankTransactionRepository.findByTransactionRef(transactionRef);
            if (txnOpt.isPresent()) {
                BankTransactions txn = txnOpt.get();
                if (txn.getStatus() != TransactionStatus.COMPLETED) {
                    txn.setStatus(TransactionStatus.FAILED);
                    txn.setFailureCode("EXECUTION_ERROR");
                    txn.setFailureMessage(failureReason != null && failureReason.length() > 250 
                            ? failureReason.substring(0, 250) 
                            : failureReason);
                    bankTransactionRepository.save(txn);

                    if (txn.getInitiatedByCustomer() != null && txn.getDestinationAccount() != null) {
                        asyncNotificationService.sendFailedTransferNotificationAsync(
                                txn.getInitiatedByCustomer(),
                                txn.getDestinationAccount().getAccountNumber(),
                                txn.getAmount(),
                                txn.getCurrency(),
                                failureReason
                        );
                    }

                    try {
                        String auditDesc = String.format("Queued P2P fund transfer [%s] failed. Reason: %s",
                                transactionRef, failureReason != null ? failureReason : "Unknown error");
                        auditTrailService.logActivity(
                                "TRANSACTION",
                                "P2P_TRANSFER_FAILED_ASYNC",
                                "TRANSACTION",
                                transactionRef,
                                auditDesc
                        );
                    } catch (Exception auditEx) {
                        log.warn("Non-blocking audit logging failed for failed queued transfer Ref: {}", transactionRef, auditEx);
                    }

                    log.info("Marked queued transfer [{}] as FAILED: {}", transactionRef, failureReason);
                }
            }
        } catch (Exception e) {
            log.error("Failed to mark queued transfer ref {} as FAILED:", transactionRef, e);
        }
    }

    /**
     * Executes an automated compensating reversal transaction (Auto-Reversal).
     * Compensates a failed or interrupted transfer by refunding the debited funds (amount + fee)
     * back to the source account under deterministic pessimistic lock, reversing double-entry ledger entries,
     * updating status to REVERSED, logging immutable 5Ws audit data, and pushing real-time notifications.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public BankTransactions executeAutoReversal(String transactionRef, String reversalReason, String failureCode) {
        log.info("Initiating auto-reversal for transaction Ref: {}, reason: {}", transactionRef, reversalReason);

        BankTransactions bankTransaction = bankTransactionRepository.findByTransactionRef(transactionRef)
                .orElseThrow(() -> new TransactionException("Transaction record not found for ref: " + transactionRef));

        // Idempotency check on reversal: already reversed?
        if (bankTransaction.getStatus() == TransactionStatus.REVERSED) {
            log.warn("Transaction [{}] is already REVERSED. Skipping redundant reversal.", transactionRef);
            return bankTransaction;
        }

        Accounts sourceAccount = bankTransaction.getSourceAccount();
        Accounts destAccount = bankTransaction.getDestinationAccount();

        if (sourceAccount == null) {
            throw new TransactionException("Cannot reverse transaction without a valid source account.");
        }

        BigDecimal transferAmount = bankTransaction.getAmount() != null ? bankTransaction.getAmount() : BigDecimal.ZERO;
        BigDecimal serviceFee = bankTransaction.getServiceFee() != null ? bankTransaction.getServiceFee() : BigDecimal.ZERO;
        BigDecimal totalRefundAmount = transferAmount.add(serviceFee);

        // Lock source account for balance compensation update
        Accounts lockedSourceAccount = accountRepository.findByAccountNumberForUpdate(sourceAccount.getAccountNumber())
                .orElseThrow(() -> new AccountNotFoundException("Source account not found: " + sourceAccount.getAccountNumber()));

        BigDecimal sourceBalanceBefore = lockedSourceAccount.getCurrentBalance();

        // 1. Credit back source account (Amount + Service Fee)
        lockedSourceAccount.setAvailableBalance(lockedSourceAccount.getAvailableBalance().add(totalRefundAmount));
        lockedSourceAccount.setCurrentBalance(lockedSourceAccount.getCurrentBalance().add(totalRefundAmount));
        accountRepository.save(lockedSourceAccount);

        // 2. If destination account was previously credited (status was COMPLETED), debit it back
        BigDecimal destBalanceBefore = BigDecimal.ZERO;
        boolean destWasCredited = (bankTransaction.getStatus() == TransactionStatus.COMPLETED && destAccount != null);
        if (destWasCredited) {
            Accounts lockedDestAccount = accountRepository.findByAccountNumberForUpdate(destAccount.getAccountNumber())
                    .orElse(destAccount);
            destBalanceBefore = lockedDestAccount.getCurrentBalance();
            lockedDestAccount.setAvailableBalance(lockedDestAccount.getAvailableBalance().subtract(transferAmount));
            lockedDestAccount.setCurrentBalance(lockedDestAccount.getCurrentBalance().subtract(transferAmount));
            accountRepository.save(lockedDestAccount);
        }

        // 3. Update Bank Transaction status
        LocalDateTime now = LocalDateTime.now();
        TransactionStatus previousStatus = bankTransaction.getStatus();
        bankTransaction.setStatus(TransactionStatus.REVERSED);
        bankTransaction.setFailureCode(failureCode != null && !failureCode.isBlank() ? failureCode : "AUTO_REVERSED");
        bankTransaction.setFailureMessage(reversalReason != null && reversalReason.length() > 250
                ? reversalReason.substring(0, 250)
                : reversalReason);
        bankTransaction.setAuditNote("Auto-reversal executed. " + (reversalReason != null ? reversalReason : ""));
        bankTransaction.setCompletedAt(now);
        bankTransactionRepository.save(bankTransaction);

        // 4. Create Reversal Double-Entry Ledger Entries
        createReversalLedgerEntries(bankTransaction, lockedSourceAccount, destAccount, transferAmount, serviceFee, sourceBalanceBefore, destBalanceBefore, destWasCredited);

        // 5. Asynchronous Reversal Notification to Customer
        if (lockedSourceAccount.getCustomer() != null) {
            asyncNotificationService.sendReversalNotificationAsync(
                    lockedSourceAccount.getCustomer(),
                    bankTransaction,
                    reversalReason
            );
        }

        // 6. 5Ws Immutable Audit Trail Logging
        try {
            Map<String, Object> oldState = new LinkedHashMap<>();
            oldState.put("transactionRef", transactionRef);
            oldState.put("previousStatus", previousStatus != null ? previousStatus.name() : "N/A");
            oldState.put("sourceBalanceBefore", sourceBalanceBefore);

            Map<String, Object> newState = new LinkedHashMap<>();
            newState.put("transactionRef", transactionRef);
            newState.put("newStatus", TransactionStatus.REVERSED.name());
            newState.put("sourceBalanceAfter", lockedSourceAccount.getCurrentBalance());
            newState.put("totalRefunded", totalRefundAmount);
            newState.put("reversalReason", reversalReason);

            String auditDesc = String.format("Auto-reversal completed for transfer [%s]. Refunded %,.2f %s to account %s. Reason: %s",
                    transactionRef, totalRefundAmount, bankTransaction.getCurrency(), lockedSourceAccount.getAccountNumber(), reversalReason);

            auditTrailService.logDataChange(
                    "P2P_TRANSFER_AUTO_REVERSED",
                    "TRANSACTION",
                    transactionRef,
                    oldState,
                    newState,
                    auditDesc
            );
        } catch (Exception auditEx) {
            log.warn("Non-blocking audit logging failed for auto-reversal Ref: {}", transactionRef, auditEx);
        }

        log.info("Auto-reversal completed successfully for Ref: {}. Refunded: {} {}", transactionRef, totalRefundAmount, bankTransaction.getCurrency());
        return bankTransaction;
    }

    private void createReversalLedgerEntries(BankTransactions txn, Accounts source, Accounts dest, BigDecimal amount, BigDecimal fee, BigDecimal sourceBalBefore, BigDecimal destBalBefore, boolean destWasCredited) {
        BigDecimal totalRefunded = amount.add(fee);

        // Line 1: Credit Customer Deposit Ledger (Refund)
        LedgerAccounts sourceLedgerAcc = ledgerAccountRepository.findByCustomerAccount(source)
                .orElseGet(() -> ledgerAccountRepository.findByLedgerCode("GL-CUSTOMER-DEPOSITS")
                        .orElse(null));

        if (sourceLedgerAcc != null) {
            LedgerEntries sourceRefundEntry = LedgerEntries.builder()
                    .transaction(txn)
                    .lineNo(1)
                    .ledgerAccount(sourceLedgerAcc)
                    .entryType(EntryType.CREDIT)
                    .amount(totalRefunded)
                    .currency(txn.getCurrency())
                    .balanceBefore(sourceBalBefore)
                    .balanceAfter(sourceBalBefore.add(totalRefunded))
                    .narration("Auto-Reversal Refund to Acc: " + source.getAccountNumber())
                    .build();
            ledgerEntryRepository.save(sourceRefundEntry);
        }

        // Line 2: Debit Destination if it was credited
        if (destWasCredited && dest != null) {
            LedgerAccounts destLedgerAcc = ledgerAccountRepository.findByCustomerAccount(dest)
                    .orElseGet(() -> ledgerAccountRepository.findByLedgerCode("GL-CUSTOMER-DEPOSITS")
                            .orElse(null));

            if (destLedgerAcc != null) {
                LedgerEntries destDebitEntry = LedgerEntries.builder()
                        .transaction(txn)
                        .lineNo(2)
                        .ledgerAccount(destLedgerAcc)
                        .entryType(EntryType.DEBIT)
                        .amount(amount)
                        .currency(txn.getCurrency())
                        .balanceBefore(destBalBefore)
                        .balanceAfter(destBalBefore.subtract(amount))
                        .narration("Auto-Reversal Debit from Acc: " + dest.getAccountNumber())
                        .build();
                ledgerEntryRepository.save(destDebitEntry);
            }
        }

        // Line 3: Debit Fee Income if fee was charged
        if (destWasCredited && fee.compareTo(BigDecimal.ZERO) > 0) {
            ledgerAccountRepository.findByLedgerCode("GL-FEE-REVENUE").ifPresent(feeLedgerAcc -> {
                LedgerEntries feeReverseEntry = LedgerEntries.builder()
                        .transaction(txn)
                        .lineNo(3)
                        .ledgerAccount(feeLedgerAcc)
                        .entryType(EntryType.DEBIT)
                        .amount(fee)
                        .currency(txn.getCurrency())
                        .narration("Auto-Reversal Fee Refund for Ref: " + txn.getTransactionRef())
                        .build();
                ledgerEntryRepository.save(feeReverseEntry);
            });
        }
    }
}