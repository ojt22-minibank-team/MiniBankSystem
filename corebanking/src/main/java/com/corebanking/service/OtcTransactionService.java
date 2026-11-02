package com.corebanking.service;

import com.corebanking.dto.DailyCashSummaryDto;
import com.corebanking.dto.OtcParametersDto;
import com.corebanking.dto.OtcTransactionRequestDto;
import com.corebanking.dto.OtcTransactionResponseDto;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.TransactionException;
import com.corebanking.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtcTransactionService {

    private final AccountRepository accountRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final LedgerAccountRepository ledgerAccountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final SystemParametersRepository systemParametersRepository;
    private final ManualTransactionsRepository manualTransactionsRepository;

    /**
     * Reads a mandatory system parameter from database.
     * Throws TransactionException if the parameter is missing or has invalid format.
     */
    private BigDecimal getRequiredSystemParameter(String key) {
        return systemParametersRepository.findByParameterKeyIgnoreCase(key)
                .map(param -> {
                    try {
                        String cleanVal = param.getParameterValue().trim().replace(",", "");
                        return new BigDecimal(cleanVal);
                    } catch (Exception e) {
                        throw new TransactionException("Invalid numeric format for system parameter: " + key);
                    }
                })
                .orElseThrow(() -> new TransactionException("System parameter '" + key + "' is not configured in database."));
    }

    /**
     * Over-the-Counter Cash Deposit:
     * - Customer deposits cash at bank counter via Teller.
     * - Increases Account balance (available + current).
     * - Debits Vault Cash Ledger (GL-VAULT-CASH) and Credits Customer Deposit Ledger.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public OtcTransactionResponseDto processDeposit(OtcTransactionRequestDto request, String idempotencyKey) {
        log.info("Processing OTC Cash Deposit for account: {}, amount: {}", request.getAccountNumber(), request.getAmount());

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<BankTransactions> existing = bankTransactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                log.info("Duplicate OTC Deposit detected with key: {}. Returning existing record.", idempotencyKey);
                return mapToResponseDto(existing.get(), null, null, null);
            }
        }

        if (request.getRemark() == null || request.getRemark().isBlank()) {
            throw new TransactionException("Customer statement narration is required.");
        }
        if (request.getManualReferenceId() == null || request.getManualReferenceId().isBlank()) {
            throw new TransactionException("Counter voucher / slip reference ID is required.");
        }
        if (request.getManualAuditNote() == null || request.getManualAuditNote().isBlank()) {
            throw new TransactionException("Internal audit note is required.");
        }
        String customRefId = request.getManualReferenceId().trim();
        if (manualTransactionsRepository.existsByReferenceId(customRefId)) {
            throw new TransactionException("Counter Voucher / Reference ID '" + customRefId + "' already exists. Please enter a unique reference.");
        }

        BigDecimal minDeposit = getRequiredSystemParameter("OTC_MINIMUM_DEPOSIT_AMOUNT");
        if (request.getAmount() == null || request.getAmount().compareTo(minDeposit) < 0) {
            throw new TransactionException("Deposit amount must be at least " + minDeposit.toPlainString() + " MMK.");
        }

        // Lock account row for update
        Accounts account = accountRepository.findByAccountNumberForUpdate(request.getAccountNumber().trim())
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + request.getAccountNumber()));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Account is not active. Current status: " + account.getStatus());
        }

        String currency = request.getCurrency() != null && !request.getCurrency().isBlank()
                ? request.getCurrency() : account.getCurrency();

        StaffUsers staff = getCurrentAuthenticatedStaff();

        BigDecimal balanceBefore = account.getCurrentBalance();
        BigDecimal depositAmount = request.getAmount();

        // Update Account Balances
        account.setAvailableBalance(account.getAvailableBalance().add(depositAmount));
        account.setCurrentBalance(account.getCurrentBalance().add(depositAmount));
        account.setUpdatedAt(LocalDateTime.now());
        accountRepository.save(account);

        // Create Master Transaction
        String txnRef = generateTransactionRef("DEP");
        LocalDateTime now = LocalDateTime.now();

        String customerName = (account.getCustomer() != null && account.getCustomer().getFullName() != null)
                ? account.getCustomer().getFullName() : "Customer";

        String desc = request.getRemark().trim();

        BankTransactions txn = BankTransactions.builder()
                .transactionRef(txnRef)
                .transactionType(TransactionType.OTC_DEPOSIT)
                .status(TransactionStatus.COMPLETED)
                .sourceAccount(null) // Counter deposit has no source bank account (cash)
                .destinationAccount(account)
                .amount(depositAmount)
                .serviceFee(BigDecimal.ZERO)
                .currency(currency)
                .initiatedByType(InitiatedByType.STAFF)
                .initiatedByStaff(staff)
                .channel(TransactionChannel.STAFF_PORTAL)
                .idempotencyKey(idempotencyKey)
                .description(desc)
                .auditNote("OTC cash deposit processed by staff: " + staff.getUsername())
                .authorizedAt(now)
                .completedAt(now)
                .build();

        bankTransactionRepository.save(txn);

        // Double-entry General Ledger
        recordDepositLedgerEntries(txn, account, depositAmount, balanceBefore);
        recordManualTransaction(txn, account, staff, ManualOperationType.CASH_DEPOSIT, depositAmount, customRefId, request.getManualAuditNote().trim());

        log.info("OTC Deposit successful. Ref: {}, Account: {}, New Balance: {}", txnRef, account.getAccountNumber(), account.getCurrentBalance());

        return mapToResponseDto(txn, customerName, customRefId, request.getManualAuditNote().trim());
    }

    /**
     * Over-the-Counter Cash Withdrawal:
     * - Customer withdraws cash at bank counter via Teller.
     * - Validates available funds and minimum balance requirement.
     * - Decreases Account balance (available + current).
     * - Debits Customer Deposit Ledger and Credits Vault Cash Ledger (GL-VAULT-CASH).
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public OtcTransactionResponseDto processWithdrawal(OtcTransactionRequestDto request, String idempotencyKey) {
        log.info("Processing OTC Cash Withdrawal for account: {}, amount: {}", request.getAccountNumber(), request.getAmount());

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<BankTransactions> existing = bankTransactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                log.info("Duplicate OTC Withdrawal detected with key: {}. Returning existing record.", idempotencyKey);
                return mapToResponseDto(existing.get(), null, null, null);
            }
        }

        if (request.getRemark() == null || request.getRemark().isBlank()) {
            throw new TransactionException("Customer statement narration is required.");
        }
        if (request.getManualReferenceId() == null || request.getManualReferenceId().isBlank()) {
            throw new TransactionException("Counter voucher / slip reference ID is required.");
        }
        if (request.getManualAuditNote() == null || request.getManualAuditNote().isBlank()) {
            throw new TransactionException("Internal audit note is required.");
        }
        String customRefId = request.getManualReferenceId().trim();
        if (manualTransactionsRepository.existsByReferenceId(customRefId)) {
            throw new TransactionException("Counter Voucher / Reference ID '" + customRefId + "' already exists. Please enter a unique reference.");
        }

        BigDecimal minWithdrawal = getRequiredSystemParameter("OTC_MINIMUM_WITHDRAWAL_AMOUNT");
        if (request.getAmount() == null || request.getAmount().compareTo(minWithdrawal) < 0) {
            throw new TransactionException("Withdrawal amount must be at least " + minWithdrawal.toPlainString() + " MMK.");
        }

        // Lock account row for update
        Accounts account = accountRepository.findByAccountNumberForUpdate(request.getAccountNumber().trim())
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + request.getAccountNumber()));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Account is not active. Current status: " + account.getStatus());
        }

        BigDecimal withdrawAmount = request.getAmount();

        // Check Minimum Balance Enforcement
        BigDecimal systemMinBalance = getRequiredSystemParameter("MINIMUM_BALANCE");
        BigDecimal minBalance = (account.getMinimumBalance() != null && account.getMinimumBalance().compareTo(BigDecimal.ZERO) > 0)
                ? account.getMinimumBalance()
                : systemMinBalance;

        BigDecimal netAvailable = account.getAvailableBalance().subtract(minBalance);
        if (netAvailable.compareTo(withdrawAmount) < 0) {
            throw new InsufficientFundsException(String.format(
                    "Insufficient available funds. You must maintain a minimum balance of %s MMK. Net available for withdrawal: %s MMK, Requested: %s MMK.",
                    minBalance.toPlainString(), netAvailable.toPlainString(), withdrawAmount.toPlainString()));
        }

        String currency = request.getCurrency() != null && !request.getCurrency().isBlank()
                ? request.getCurrency() : account.getCurrency();

        StaffUsers staff = getCurrentAuthenticatedStaff();

        BigDecimal balanceBefore = account.getCurrentBalance();

        // Update Account Balances
        account.setAvailableBalance(account.getAvailableBalance().subtract(withdrawAmount));
        account.setCurrentBalance(account.getCurrentBalance().subtract(withdrawAmount));
        account.setUpdatedAt(LocalDateTime.now());
        accountRepository.save(account);

        // Create Master Transaction
        String txnRef = generateTransactionRef("WDL");
        LocalDateTime now = LocalDateTime.now();

        String customerName = (account.getCustomer() != null && account.getCustomer().getFullName() != null)
                ? account.getCustomer().getFullName() : "Customer";

        String desc = request.getRemark().trim();

        BankTransactions txn = BankTransactions.builder()
                .transactionRef(txnRef)
                .transactionType(TransactionType.OTC_WITHDRAWAL)
                .status(TransactionStatus.COMPLETED)
                .sourceAccount(account)
                .destinationAccount(null) // Counter withdrawal has no destination bank account (cash given to customer)
                .amount(withdrawAmount)
                .serviceFee(BigDecimal.ZERO)
                .currency(currency)
                .initiatedByType(InitiatedByType.STAFF)
                .initiatedByStaff(staff)
                .channel(TransactionChannel.STAFF_PORTAL)
                .idempotencyKey(idempotencyKey)
                .description(desc)
                .auditNote("OTC cash withdrawal processed by staff: " + staff.getUsername())
                .authorizedAt(now)
                .completedAt(now)
                .build();

        bankTransactionRepository.save(txn);

        // Double-entry General Ledger
        recordWithdrawalLedgerEntries(txn, account, withdrawAmount, balanceBefore);
        recordManualTransaction(txn, account, staff, ManualOperationType.CASH_WITHDRAWAL, withdrawAmount, customRefId, request.getManualAuditNote().trim());

        log.info("OTC Withdrawal successful. Ref: {}, Account: {}, New Balance: {}", txnRef, account.getAccountNumber(), account.getCurrentBalance());

        return mapToResponseDto(txn, customerName, customRefId, request.getManualAuditNote().trim());
    }

    private void recordDepositLedgerEntries(BankTransactions txn, Accounts account, BigDecimal amount, BigDecimal balBefore) {
        // Line 1: Debit Vault Cash GL Account (Cash physically received into bank vault)
        LedgerAccounts vaultCashLedger = ledgerAccountRepository.findByLedgerCode("GL-VAULT-CASH")
                .or(() -> ledgerAccountRepository.findByLedgerCode("GL-CASH-ON-HAND"))
                .orElseGet(() -> ledgerAccountRepository.findAll().stream().findFirst()
                        .orElseThrow(() -> new IllegalStateException("General ledger accounts not configured.")));

        LedgerEntries vaultEntry = LedgerEntries.builder()
                .transaction(txn)
                .lineNo(1)
                .ledgerAccount(vaultCashLedger)
                .entryType(EntryType.DEBIT)
                .amount(amount)
                .currency(txn.getCurrency())
                .balanceBefore(BigDecimal.ZERO)
                .balanceAfter(amount)
                .narration("Cash received over the counter for deposit into Acc: " + account.getAccountNumber())
                .build();
        ledgerEntryRepository.save(vaultEntry);

        // Line 2: Credit Customer Deposit Ledger (Bank liability to customer increases)
        LedgerAccounts customerLedger = ledgerAccountRepository.findByCustomerAccount(account)
                .orElseGet(() -> ledgerAccountRepository.findByLedgerCode("GL-CUSTOMER-DEPOSITS")
                        .orElse(vaultCashLedger));

        LedgerEntries customerEntry = LedgerEntries.builder()
                .transaction(txn)
                .lineNo(2)
                .ledgerAccount(customerLedger)
                .entryType(EntryType.CREDIT)
                .amount(amount)
                .currency(txn.getCurrency())
                .balanceBefore(balBefore)
                .balanceAfter(balBefore.add(amount))
                .narration("Deposit credited to Acc: " + account.getAccountNumber())
                .build();
        ledgerEntryRepository.save(customerEntry);
    }

    private void recordWithdrawalLedgerEntries(BankTransactions txn, Accounts account, BigDecimal amount, BigDecimal balBefore) {
        // Line 1: Debit Customer Deposit Ledger (Bank liability decreases)
        LedgerAccounts customerLedger = ledgerAccountRepository.findByCustomerAccount(account)
                .orElseGet(() -> ledgerAccountRepository.findByLedgerCode("GL-CUSTOMER-DEPOSITS")
                        .or(() -> ledgerAccountRepository.findByLedgerCode("GL-VAULT-CASH"))
                        .orElseGet(() -> ledgerAccountRepository.findAll().stream().findFirst()
                                .orElseThrow(() -> new IllegalStateException("General ledger accounts not configured."))));

        LedgerEntries customerEntry = LedgerEntries.builder()
                .transaction(txn)
                .lineNo(1)
                .ledgerAccount(customerLedger)
                .entryType(EntryType.DEBIT)
                .amount(amount)
                .currency(txn.getCurrency())
                .balanceBefore(balBefore)
                .balanceAfter(balBefore.subtract(amount))
                .narration("Withdrawal debited from Acc: " + account.getAccountNumber())
                .build();
        ledgerEntryRepository.save(customerEntry);

        // Line 2: Credit Vault Cash Ledger (Cash leaves bank vault)
        LedgerAccounts vaultCashLedger = ledgerAccountRepository.findByLedgerCode("GL-VAULT-CASH")
                .or(() -> ledgerAccountRepository.findByLedgerCode("GL-CASH-ON-HAND"))
                .orElse(customerLedger);

        LedgerEntries vaultEntry = LedgerEntries.builder()
                .transaction(txn)
                .lineNo(2)
                .ledgerAccount(vaultCashLedger)
                .entryType(EntryType.CREDIT)
                .amount(amount)
                .currency(txn.getCurrency())
                .balanceBefore(amount)
                .balanceAfter(BigDecimal.ZERO)
                .narration("Cash disbursed over the counter from Acc: " + account.getAccountNumber())
                .build();
        ledgerEntryRepository.save(vaultEntry);
    }

    private void recordManualTransaction(BankTransactions txn, Accounts account, StaffUsers staff,
                                         ManualOperationType opType, BigDecimal amount,
                                         String customRefId, String customAuditNote) {
        String refId = (customRefId != null && !customRefId.isBlank())
                ? customRefId.trim()
                : ("MAN-" + txn.getTransactionRef());

        String audit = (customAuditNote != null && !customAuditNote.isBlank())
                ? customAuditNote.trim()
                : String.format("OTC %s | Acc: %s | Amount: %s %s | Teller: %s",
                        opType == ManualOperationType.CASH_DEPOSIT ? "DEPOSIT" : "WITHDRAWAL",
                        account.getAccountNumber(),
                        amount.toPlainString(),
                        txn.getCurrency(),
                        staff.getUsername());

        ManualTransactions manualTxn = ManualTransactions.builder()
                .transaction(txn)
                .account(account)
                .staff(staff)
                .operationType(opType)
                .amount(amount)
                .referenceId(refId)
                .auditNote(audit)
                .build();

        manualTransactionsRepository.save(manualTxn);
    }

    private StaffUsers getCurrentAuthenticatedStaff() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String username = (auth != null && auth.getName() != null && !auth.getName().isBlank() && !auth.getName().equals("anonymousUser"))
                ? auth.getName() : "teller.zin";

        return staffUsersRepository.findByUsername(username)
                .or(() -> staffUsersRepository.findByUsername("teller.zin"))
                .or(() -> staffUsersRepository.findByUsername("admin.nay"))
                .or(() -> staffUsersRepository.findAll().stream().findFirst())
                .orElseThrow(() -> new RuntimeException("No active staff record found in the system"));
    }

    private String generateTransactionRef(String prefix) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        int randomNum = ThreadLocalRandom.current().nextInt(10000, 99999);
        return String.format("TXN-OTC-%s-%s-%d", prefix, dateStr, randomNum);
    }

    private OtcTransactionResponseDto mapToResponseDto(BankTransactions txn, String personName,
                                                      String manualRefId, String manualAuditNote) {
        Accounts targetAccount = txn.getTransactionType() == TransactionType.OTC_DEPOSIT
                ? txn.getDestinationAccount() : txn.getSourceAccount();

        BigDecimal balBefore = BigDecimal.ZERO;
        BigDecimal balAfter = BigDecimal.ZERO;

        if (targetAccount != null) {
            balAfter = targetAccount.getCurrentBalance();
            if (txn.getTransactionType() == TransactionType.OTC_DEPOSIT) {
                balBefore = balAfter.subtract(txn.getAmount());
            } else {
                balBefore = balAfter.add(txn.getAmount());
            }
        }

        Customers customer = targetAccount != null ? targetAccount.getCustomer() : null;
        String resolvedPerson = (personName != null && !personName.isBlank())
                ? personName
                : (customer != null ? customer.getFullName() : null);

        return OtcTransactionResponseDto.builder()
                .transactionRef(txn.getTransactionRef())
                .transactionType(txn.getTransactionType())
                .status(txn.getStatus())
                .accountNumber(targetAccount != null ? targetAccount.getAccountNumber() : "—")
                .customerCode(customer != null ? customer.getCustomerCode() : "—")
                .customerName(customer != null ? customer.getFullName() : "—")
                .amount(txn.getAmount())
                .serviceFee(txn.getServiceFee() != null ? txn.getServiceFee() : BigDecimal.ZERO)
                .balanceBefore(balBefore)
                .balanceAfter(balAfter)
                .currency(txn.getCurrency())
                .tellerUsername(txn.getInitiatedByStaff() != null ? txn.getInitiatedByStaff().getUsername() : "teller")
                .depositorOrWithdrawerName(resolvedPerson)
                .description(txn.getDescription())
                .manualReferenceId(manualRefId)
                .manualAuditNote(manualAuditNote)
                .transactedAt(txn.getCompletedAt() != null ? txn.getCompletedAt() : txn.getInitiatedAt())
                .build();
    }

    /**
     * Calculates today's cash summary for the currently authenticated Teller.
     */
    @Transactional(readOnly = true)
    public DailyCashSummaryDto getDailyCashSummary() {
        StaffUsers teller = getCurrentAuthenticatedStaff();
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(23, 59, 59, 999999999);

        java.util.List<BankTransactions> todayTxns = bankTransactionRepository
                .findTodayOtcTransactionsByStaff(teller.getStaffId(), startOfDay, endOfDay);

        BigDecimal cashIn = BigDecimal.ZERO;
        BigDecimal cashOut = BigDecimal.ZERO;
        long depositCount = 0;
        long withdrawalCount = 0;

        for (BankTransactions t : todayTxns) {
            if (t.getTransactionType() == TransactionType.OTC_DEPOSIT) {
                cashIn = cashIn.add(t.getAmount());
                depositCount++;
            } else if (t.getTransactionType() == TransactionType.OTC_WITHDRAWAL) {
                cashOut = cashOut.add(t.getAmount());
                withdrawalCount++;
            }
        }

        BigDecimal netCash = cashIn.subtract(cashOut);

        return DailyCashSummaryDto.builder()
                .tellerUsername(teller.getUsername())
                .tellerFullName(teller.getFullName())
                .reportDate(today)
                .openingCash(BigDecimal.ZERO)
                .totalCashIn(cashIn)
                .totalCashOut(cashOut)
                .netCashInDrawer(netCash)
                .totalTransactions(todayTxns.size())
                .depositCount(depositCount)
                .withdrawalCount(withdrawalCount)
                .currency("MMK")
                .build();
    }

    /**
     * Reads configured OTC system parameters (limits & minimum balances) directly from database.
     */
    public OtcParametersDto getOtcParameters() {
        return OtcParametersDto.builder()
                .minDepositAmount(getRequiredSystemParameter("OTC_MINIMUM_DEPOSIT_AMOUNT"))
                .minWithdrawalAmount(getRequiredSystemParameter("OTC_MINIMUM_WITHDRAWAL_AMOUNT"))
                .minimumBalance(getRequiredSystemParameter("MINIMUM_BALANCE"))
                .build();
    }

    /**
     * Checks if a counter voucher / slip reference ID is already used in the database.
     */
    public boolean isReferenceIdDuplicate(String refId) {
        if (refId == null || refId.trim().isEmpty()) {
            return false;
        }
        return manualTransactionsRepository.existsByReferenceId(refId.trim());
    }
}
