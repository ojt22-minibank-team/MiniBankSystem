package com.corebanking.service;

import com.corebanking.dto.DailyCashSummaryDto;
import com.corebanking.dto.OtcAccountLimitDto;
import com.corebanking.dto.OtcParametersDto;
import com.corebanking.dto.OtcTransactionRequestDto;
import com.corebanking.dto.OtcTransactionResponseDto;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.TransactionException;
import com.corebanking.repository.*;
import com.corebanking.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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
public class OtcTransactionService {

    private final AccountRepository accountRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final LedgerAccountRepository ledgerAccountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final SystemParametersRepository systemParametersRepository;
    private final ManualTransactionsRepository manualTransactionsRepository;
    private final AuditTrailService auditTrailService;
    private final AsyncNotificationService asyncNotificationService;
    private final FeeScheduleRepository feeScheduleRepository;

    @Autowired(required = false)
    private JwtService jwtService;

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
                        return getDefaultSystemParameter(key);
                    }
                })
                .orElseGet(() -> getDefaultSystemParameter(key));
    }

    private BigDecimal getDefaultSystemParameter(String key) {
        if ("OTC_MINIMUM_DEPOSIT_AMOUNT".equalsIgnoreCase(key) || "OTC_MINIMUM_WITHDRAWAL_AMOUNT".equalsIgnoreCase(key)) {
            return new BigDecimal("10000");
        }
        if ("MINIMUM_BALANCE".equalsIgnoreCase(key)) {
            return new BigDecimal("10000");
        }
        if ("OTC_ONETIME_WITHDRAWAL_LIMIT".equalsIgnoreCase(key)) {
            return new BigDecimal("5000000");
        }
        if ("OTC_DAILY_WITHDRAWAL_LIMIT".equalsIgnoreCase(key)) {
            return new BigDecimal("20000000");
        }
        return BigDecimal.ZERO;
    }

    /**
     * Calculates fee for OTC transactions solely from active FeeSchedules in the database.
     * Returns BigDecimal.ZERO if no active schedule exists.
     */
    public BigDecimal calculateOtcFee(BigDecimal amount, TransactionType type) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);
        }
        return feeScheduleRepository.findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(type)
                .map(schedule -> {
                    BigDecimal fee = BigDecimal.ZERO;
                    if (schedule.getFeeType() == FeeType.FLAT) {
                        fee = schedule.getFeeValue();
                    } else if (schedule.getFeeType() == FeeType.PERCENTAGE) {
                        fee = amount.multiply(schedule.getFeeValue())
                                .divide(new BigDecimal("100"), 4, RoundingMode.HALF_UP);
                    }
                    if (schedule.getMinimumFee() != null && fee.compareTo(schedule.getMinimumFee()) < 0) {
                        fee = schedule.getMinimumFee();
                    }
                    if (schedule.getMaximumFee() != null && fee.compareTo(schedule.getMaximumFee()) > 0) {
                        fee = schedule.getMaximumFee();
                    }
                    return fee.setScale(4, RoundingMode.HALF_UP);
                })
                .orElse(BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP));
    }

    /**
     * Over-the-Counter Cash Deposit:
     * - Customer deposits cash at bank counter via Teller.
     * - Calculates service fee from active OTC_DEPOSIT FeeSchedule.
     * - Credited amount = depositAmount - serviceFee.
     * - Debits Vault Cash Ledger (GL-VAULT-CASH), Credits Customer Deposit Ledger,
     *   and Credits Fee Revenue Ledger (GL-FEE-REVENUE) if fee > 0.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public OtcTransactionResponseDto processDeposit(OtcTransactionRequestDto request, String idempotencyKey) {
        log.info("Processing OTC Cash Deposit for account: {}, amount: {}", request.getAccountNumber(), request.getAmount());

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<BankTransactions> existing = bankTransactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                log.info("Duplicate OTC Deposit detected with key: {}. Returning existing record.", idempotencyKey);
                return mapToResponseDto(existing.get(), null, null, null, null);
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

        BigDecimal depositAmount = request.getAmount();
        BigDecimal serviceFee = calculateOtcFee(depositAmount, TransactionType.OTC_DEPOSIT);

        if (depositAmount.compareTo(serviceFee) <= 0) {
            throw new TransactionException(String.format(
                    "Deposit amount (%s MMK) must be strictly greater than the service fee (%s MMK).",
                    depositAmount.toPlainString(), serviceFee.toPlainString()));
        }

        BigDecimal netDeposit = depositAmount.subtract(serviceFee);

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

        // Update Account Balances with net deposited funds
        account.setAvailableBalance(account.getAvailableBalance().add(netDeposit));
        account.setCurrentBalance(account.getCurrentBalance().add(netDeposit));
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
                .serviceFee(serviceFee)
                .currency(currency)
                .initiatedByType(InitiatedByType.STAFF)
                .initiatedByStaff(staff)
                .channel(TransactionChannel.STAFF_PORTAL)
                .idempotencyKey(idempotencyKey)
                .description(desc)
                .auditNote(String.format("OTC cash deposit processed by staff: %s (Amount: %s, Fee: %s, Net Credited: %s)",
                        staff.getUsername(), depositAmount.toPlainString(), serviceFee.toPlainString(), netDeposit.toPlainString()))
                .authorizedAt(now)
                .completedAt(now)
                .build();

        bankTransactionRepository.save(txn);

        // Double-entry General Ledger
        recordDepositLedgerEntries(txn, account, depositAmount, serviceFee, netDeposit, balanceBefore);
        recordManualTransaction(txn, account, staff, ManualOperationType.CASH_DEPOSIT, depositAmount, customRefId, request.getManualAuditNote().trim());

        if (auditTrailService != null) {
            java.util.Map<String, Object> oldSnapshot = new java.util.LinkedHashMap<>();
            oldSnapshot.put("accountNumber", account.getAccountNumber());
            oldSnapshot.put("balance", balanceBefore);
            oldSnapshot.put("currency", currency);

            java.util.Map<String, Object> newSnapshot = new java.util.LinkedHashMap<>();
            newSnapshot.put("accountNumber", account.getAccountNumber());
            newSnapshot.put("accountHolder", customerName);
            newSnapshot.put("amount", depositAmount);
            newSnapshot.put("serviceFee", serviceFee);
            newSnapshot.put("netDeposit", netDeposit);
            newSnapshot.put("currency", currency);
            newSnapshot.put("newBalance", account.getCurrentBalance());
            newSnapshot.put("transactionRef", txnRef);
            newSnapshot.put("voucherReferenceId", customRefId);
            newSnapshot.put("processedByStaff", staff.getUsername());
            newSnapshot.put("tellerStaffNo", staff.getStaffNo());
            newSnapshot.put("auditNote", request.getManualAuditNote().trim());
            newSnapshot.put("narration", request.getRemark().trim());

            auditTrailService.logDataChange(
                    "TRANSACTION",
                    "OTC_CASH_DEPOSIT",
                    "ACCOUNT",
                    account.getAccountNumber(),
                    oldSnapshot,
                    newSnapshot,
                    String.format("OTC Cash Deposit of %s %s (Service Fee: %s, Net: %s) to account %s (%s) processed by Teller %s [Slip Ref: %s]",
                            depositAmount.toPlainString(), currency, serviceFee.toPlainString(), netDeposit.toPlainString(),
                            account.getAccountNumber(), customerName, staff.getUsername(), customRefId)
            );
        }

        // Asynchronously dispatch real-time WebSocket notification to customer
        if (account.getCustomer() != null && asyncNotificationService != null) {
            asyncNotificationService.sendDepositNotificationAsync(account.getCustomer(), account, txn);
        }

        log.info("OTC Deposit successful. Ref: {}, Account: {}, Gross: {}, Fee: {}, New Balance: {}",
                txnRef, account.getAccountNumber(), depositAmount, serviceFee, account.getCurrentBalance());

        return mapToResponseDto(txn, customerName, customRefId, request.getManualAuditNote().trim(), balanceBefore);
    }

    /**
     * Over-the-Counter Cash Withdrawal:
     * - Customer withdraws cash at bank counter via Teller.
     * - Calculates service fee from active OTC_WITHDRAWAL FeeSchedule.
     * - Total debited from customer account = withdrawAmount + serviceFee.
     * - Validates available funds (balance - minBalance >= withdrawAmount + serviceFee).
     * - Decreases Account balance (available + current).
     * - Debits Customer Deposit Ledger, Credits Vault Cash Ledger (GL-VAULT-CASH),
     *   and Credits Fee Revenue Ledger (GL-FEE-REVENUE) if fee > 0.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public OtcTransactionResponseDto processWithdrawal(OtcTransactionRequestDto request, String idempotencyKey) {
        log.info("Processing OTC Cash Withdrawal for account: {}, amount: {}", request.getAccountNumber(), request.getAmount());

        if (idempotencyKey != null && !idempotencyKey.trim().isEmpty()) {
            Optional<BankTransactions> existing = bankTransactionRepository.findByIdempotencyKey(idempotencyKey);
            if (existing.isPresent()) {
                log.info("Duplicate OTC Withdrawal detected with key: {}. Returning existing record.", idempotencyKey);
                return mapToResponseDto(existing.get(), null, null, null, null);
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

        BigDecimal maxOnetimeWithdrawal = getRequiredSystemParameter("OTC_ONETIME_WITHDRAWAL_LIMIT");
        if (maxOnetimeWithdrawal != null && maxOnetimeWithdrawal.compareTo(BigDecimal.ZERO) > 0 && request.getAmount().compareTo(maxOnetimeWithdrawal) > 0) {
            throw new TransactionException(String.format(
                    "Withdrawal amount (%s MMK) exceeds the one-time counter limit of %s MMK.",
                    request.getAmount().toPlainString(), maxOnetimeWithdrawal.toPlainString()));
        }

        // Lock account row for update
        Accounts account = accountRepository.findByAccountNumberForUpdate(request.getAccountNumber().trim())
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + request.getAccountNumber()));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Account is not active. Current status: " + account.getStatus());
        }

        BigDecimal withdrawAmount = request.getAmount();
        BigDecimal serviceFee = calculateOtcFee(withdrawAmount, TransactionType.OTC_WITHDRAWAL);
        BigDecimal totalDeduction = withdrawAmount.add(serviceFee);

        // Check Cumulative Daily OTC Withdrawal Limit (based on physical cash disbursed)
        BigDecimal maxDailyWithdrawal = getRequiredSystemParameter("OTC_DAILY_WITHDRAWAL_LIMIT");
        if (maxDailyWithdrawal != null && maxDailyWithdrawal.compareTo(BigDecimal.ZERO) > 0) {
            LocalDate today = LocalDate.now();
            LocalDateTime startOfDay = today.atStartOfDay();
            LocalDateTime endOfDay = today.atTime(23, 59, 59, 999999999);
            BigDecimal todayWithdrawn = bankTransactionRepository.findTodayTotalOtcWithdrawnAmount(
                    account.getAccountId(), startOfDay, endOfDay);
            if (todayWithdrawn == null) {
                todayWithdrawn = BigDecimal.ZERO;
            }
            BigDecimal projectedTotal = todayWithdrawn.add(withdrawAmount);
            if (projectedTotal.compareTo(maxDailyWithdrawal) > 0) {
                BigDecimal remainingLimit = maxDailyWithdrawal.subtract(todayWithdrawn);
                if (remainingLimit.compareTo(BigDecimal.ZERO) < 0) {
                    remainingLimit = BigDecimal.ZERO;
                }
                throw new TransactionException(String.format(
                        "Daily withdrawal limit exceeded. Total withdrawn today: %s MMK. Maximum remaining available to withdraw today is %s MMK.",
                        todayWithdrawn.toPlainString(), remainingLimit.toPlainString()));
            }
        }

        // Check Minimum Balance Enforcement with service fee accounted for
        BigDecimal systemMinBalance = getRequiredSystemParameter("MINIMUM_BALANCE");
        BigDecimal minBalance = (account.getMinimumBalance() != null && account.getMinimumBalance().compareTo(BigDecimal.ZERO) > 0)
                ? account.getMinimumBalance()
                : systemMinBalance;

        BigDecimal netAvailable = account.getAvailableBalance().subtract(minBalance);
        if (netAvailable.compareTo(totalDeduction) < 0) {
            throw new InsufficientFundsException(String.format(
                    "Insufficient available funds. Required: %s MMK (Withdrawal: %s + Service Fee: %s) while maintaining a minimum balance of %s MMK. Net available: %s MMK.",
                    totalDeduction.toPlainString(), withdrawAmount.toPlainString(), serviceFee.toPlainString(),
                    minBalance.toPlainString(), netAvailable.toPlainString()));
        }

        String currency = request.getCurrency() != null && !request.getCurrency().isBlank()
                ? request.getCurrency() : account.getCurrency();

        StaffUsers staff = getCurrentAuthenticatedStaff();

        BigDecimal balanceBefore = account.getCurrentBalance();

        // Update Account Balances (deducting cash withdrawal and service fee)
        account.setAvailableBalance(account.getAvailableBalance().subtract(totalDeduction));
        account.setCurrentBalance(account.getCurrentBalance().subtract(totalDeduction));
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
                .serviceFee(serviceFee)
                .currency(currency)
                .initiatedByType(InitiatedByType.STAFF)
                .initiatedByStaff(staff)
                .channel(TransactionChannel.STAFF_PORTAL)
                .idempotencyKey(idempotencyKey)
                .description(desc)
                .auditNote(String.format("OTC cash withdrawal processed by staff: %s (Cash: %s, Fee: %s, Total Debited: %s)",
                        staff.getUsername(), withdrawAmount.toPlainString(), serviceFee.toPlainString(), totalDeduction.toPlainString()))
                .authorizedAt(now)
                .completedAt(now)
                .build();

        bankTransactionRepository.save(txn);

        // Double-entry General Ledger
        recordWithdrawalLedgerEntries(txn, account, withdrawAmount, serviceFee, totalDeduction, balanceBefore);
        recordManualTransaction(txn, account, staff, ManualOperationType.CASH_WITHDRAWAL, withdrawAmount, customRefId, request.getManualAuditNote().trim());

        if (auditTrailService != null) {
            java.util.Map<String, Object> oldSnapshot = new java.util.LinkedHashMap<>();
            oldSnapshot.put("accountNumber", account.getAccountNumber());
            oldSnapshot.put("balance", balanceBefore);
            oldSnapshot.put("currency", currency);

            java.util.Map<String, Object> newSnapshot = new java.util.LinkedHashMap<>();
            newSnapshot.put("accountNumber", account.getAccountNumber());
            newSnapshot.put("accountHolder", customerName);
            newSnapshot.put("amount", withdrawAmount);
            newSnapshot.put("serviceFee", serviceFee);
            newSnapshot.put("totalDebited", totalDeduction);
            newSnapshot.put("currency", currency);
            newSnapshot.put("newBalance", account.getCurrentBalance());
            newSnapshot.put("transactionRef", txnRef);
            newSnapshot.put("voucherReferenceId", customRefId);
            newSnapshot.put("processedByStaff", staff.getUsername());
            newSnapshot.put("tellerStaffNo", staff.getStaffNo());
            newSnapshot.put("auditNote", request.getManualAuditNote().trim());
            newSnapshot.put("narration", request.getRemark().trim());

            auditTrailService.logDataChange(
                    "TRANSACTION",
                    "OTC_CASH_WITHDRAWAL",
                    "ACCOUNT",
                    account.getAccountNumber(),
                    oldSnapshot,
                    newSnapshot,
                    String.format("OTC Cash Withdrawal of %s %s (Service Fee: %s, Total Debited: %s) from account %s (%s) processed by Teller %s [Slip Ref: %s]",
                            withdrawAmount.toPlainString(), currency, serviceFee.toPlainString(), totalDeduction.toPlainString(),
                            account.getAccountNumber(), customerName, staff.getUsername(), customRefId)
            );
        }

        // Asynchronously dispatch real-time WebSocket notification to customer
        if (account.getCustomer() != null && asyncNotificationService != null) {
            asyncNotificationService.sendWithdrawalNotificationAsync(account.getCustomer(), account, txn);
        }

        log.info("OTC Withdrawal successful. Ref: {}, Account: {}, Cash: {}, Fee: {}, New Balance: {}",
                txnRef, account.getAccountNumber(), withdrawAmount, serviceFee, account.getCurrentBalance());

        return mapToResponseDto(txn, customerName, customRefId, request.getManualAuditNote().trim(), balanceBefore);
    }

    private void recordDepositLedgerEntries(BankTransactions txn, Accounts account, BigDecimal totalDeposit,
                                            BigDecimal serviceFee, BigDecimal netDeposit, BigDecimal balBefore) {
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
                .amount(totalDeposit)
                .currency(txn.getCurrency())
                .balanceBefore(BigDecimal.ZERO)
                .balanceAfter(totalDeposit)
                .narration("Cash received over the counter for deposit into Acc: " + account.getAccountNumber())
                .build();
        ledgerEntryRepository.save(vaultEntry);

        // Line 2: Credit Customer Deposit Ledger (Bank liability to customer increases by net deposit)
        LedgerAccounts customerLedger = ledgerAccountRepository.findByCustomerAccount(account)
                .orElseGet(() -> ledgerAccountRepository.findByLedgerCode("GL-CUSTOMER-DEPOSITS")
                        .orElse(vaultCashLedger));

        LedgerEntries customerEntry = LedgerEntries.builder()
                .transaction(txn)
                .lineNo(2)
                .ledgerAccount(customerLedger)
                .entryType(EntryType.CREDIT)
                .amount(netDeposit)
                .currency(txn.getCurrency())
                .balanceBefore(balBefore)
                .balanceAfter(balBefore.add(netDeposit))
                .narration("Deposit credited to Acc: " + account.getAccountNumber())
                .build();
        ledgerEntryRepository.save(customerEntry);

        // Line 3: Credit Fee Revenue Ledger (If service fee > 0)
        if (serviceFee != null && serviceFee.compareTo(BigDecimal.ZERO) > 0) {
            LedgerAccounts feeLedger = ledgerAccountRepository.findByLedgerCode("GL-FEE-REVENUE")
                    .or(() -> ledgerAccountRepository.findByLedgerCode("GL-FEE-INCOME"))
                    .orElse(vaultCashLedger);

            LedgerEntries feeEntry = LedgerEntries.builder()
                    .transaction(txn)
                    .lineNo(3)
                    .ledgerAccount(feeLedger)
                    .entryType(EntryType.CREDIT)
                    .amount(serviceFee)
                    .currency(txn.getCurrency())
                    .balanceBefore(BigDecimal.ZERO)
                    .balanceAfter(serviceFee)
                    .narration("OTC Deposit service fee collected for Ref: " + txn.getTransactionRef())
                    .build();
            ledgerEntryRepository.save(feeEntry);
        }
    }

    private void recordWithdrawalLedgerEntries(BankTransactions txn, Accounts account, BigDecimal withdrawAmount,
                                               BigDecimal serviceFee, BigDecimal totalDeduction, BigDecimal balBefore) {
        // Line 1: Debit Customer Deposit Ledger (Bank liability decreases by total debited)
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
                .amount(totalDeduction)
                .currency(txn.getCurrency())
                .balanceBefore(balBefore)
                .balanceAfter(balBefore.subtract(totalDeduction))
                .narration("Withdrawal & service fee debited from Acc: " + account.getAccountNumber())
                .build();
        ledgerEntryRepository.save(customerEntry);

        // Line 2: Credit Vault Cash Ledger (Cash leaves bank vault to customer)
        LedgerAccounts vaultCashLedger = ledgerAccountRepository.findByLedgerCode("GL-VAULT-CASH")
                .or(() -> ledgerAccountRepository.findByLedgerCode("GL-CASH-ON-HAND"))
                .orElse(customerLedger);

        LedgerEntries vaultEntry = LedgerEntries.builder()
                .transaction(txn)
                .lineNo(2)
                .ledgerAccount(vaultCashLedger)
                .entryType(EntryType.CREDIT)
                .amount(withdrawAmount)
                .currency(txn.getCurrency())
                .balanceBefore(withdrawAmount)
                .balanceAfter(BigDecimal.ZERO)
                .narration("Cash disbursed over the counter from Acc: " + account.getAccountNumber())
                .build();
        ledgerEntryRepository.save(vaultEntry);

        // Line 3: Credit Fee Revenue Ledger (If service fee > 0)
        if (serviceFee != null && serviceFee.compareTo(BigDecimal.ZERO) > 0) {
            LedgerAccounts feeLedger = ledgerAccountRepository.findByLedgerCode("GL-FEE-REVENUE")
                    .or(() -> ledgerAccountRepository.findByLedgerCode("GL-FEE-INCOME"))
                    .orElse(vaultCashLedger);

            LedgerEntries feeEntry = LedgerEntries.builder()
                    .transaction(txn)
                    .lineNo(3)
                    .ledgerAccount(feeLedger)
                    .entryType(EntryType.CREDIT)
                    .amount(serviceFee)
                    .currency(txn.getCurrency())
                    .balanceBefore(BigDecimal.ZERO)
                    .balanceAfter(serviceFee)
                    .narration("OTC Withdrawal service fee collected for Ref: " + txn.getTransactionRef())
                    .build();
            ledgerEntryRepository.save(feeEntry);
        }
    }

    private void recordManualTransaction(BankTransactions txn, Accounts account, StaffUsers staff,
                                         ManualOperationType opType, BigDecimal amount,
                                         String customRefId, String customAuditNote) {
        String refId = (customRefId != null && !customRefId.isBlank())
                ? customRefId.trim()
                : ("MAN-" + txn.getTransactionRef());

        String audit = (customAuditNote != null && !customAuditNote.isBlank())
                ? customAuditNote.trim()
                : String.format("OTC %s | Acc: %s | Amount: %s %s (Fee: %s) | Teller: %s",
                        opType == ManualOperationType.CASH_DEPOSIT ? "DEPOSIT" : "WITHDRAWAL",
                        account.getAccountNumber(),
                        amount.toPlainString(),
                        txn.getCurrency(),
                        txn.getServiceFee() != null ? txn.getServiceFee().toPlainString() : "0",
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
        String username = (auth != null && auth.getName() != null && !auth.getName().isBlank() && !auth.getName().equalsIgnoreCase("anonymousUser"))
                ? auth.getName() : null;

        if (username != null) {
            var staffOpt = staffUsersRepository.findByUsername(username);
            if (staffOpt.isPresent()) {
                return staffOpt.get();
            }
            try {
                UUID uuid = UUID.fromString(username);
                var staffById = staffUsersRepository.findById(uuid);
                if (staffById.isPresent()) {
                    return staffById.get();
                }
            } catch (Exception ignored) {}
        }

        // Fallback: Check HTTP request Authorization header if SecurityContextHolder is empty
        if (jwtService != null) {
            var requestOpt = com.corebanking.util.AuditContextUtil.getCurrentHttpRequest();
            if (requestOpt.isPresent()) {
                String authHeader = requestOpt.get().getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7).trim();
                    if (!token.isBlank() && jwtService.isTokenValid(token)) {
                        var claims = jwtService.extractAllClaims(token);
                        String staffIdStr = claims.get("staff_id", String.class);
                        if (staffIdStr != null && !staffIdStr.isBlank()) {
                            try {
                                UUID staffId = UUID.fromString(staffIdStr);
                                var staffById = staffUsersRepository.findById(staffId);
                                if (staffById.isPresent()) {
                                    return staffById.get();
                                }
                            } catch (Exception ignored) {}
                        }
                        String sub = claims.getSubject();
                        if (sub != null && !sub.isBlank()) {
                            var staffBySub = staffUsersRepository.findByUsername(sub);
                            if (staffBySub.isPresent()) {
                                return staffBySub.get();
                            }
                        }
                    }
                }
            }
        }

        throw new TransactionException("Authentication required: Valid authenticated staff account is required to perform OTC operations.");
    }

    private String generateTransactionRef(String prefix) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        int randomNum = ThreadLocalRandom.current().nextInt(10000, 99999);
        return String.format("TXN-OTC-%s-%s-%d", prefix, dateStr, randomNum);
    }

    private OtcTransactionResponseDto mapToResponseDto(BankTransactions txn, String personName,
                                                      String manualRefId, String manualAuditNote,
                                                      BigDecimal explicitBalBefore) {
        Accounts targetAccount = txn.getTransactionType() == TransactionType.OTC_DEPOSIT
                ? txn.getDestinationAccount() : txn.getSourceAccount();

        BigDecimal balAfter = targetAccount != null ? targetAccount.getCurrentBalance() : BigDecimal.ZERO;
        BigDecimal fee = txn.getServiceFee() != null ? txn.getServiceFee() : BigDecimal.ZERO;
        BigDecimal balBefore;

        if (explicitBalBefore != null) {
            balBefore = explicitBalBefore;
        } else if (targetAccount != null) {
            if (txn.getTransactionType() == TransactionType.OTC_DEPOSIT) {
                // balAfter = balBefore + (amount - fee) => balBefore = balAfter - (amount - fee)
                balBefore = balAfter.subtract(txn.getAmount().subtract(fee));
            } else {
                // balAfter = balBefore - (amount + fee) => balBefore = balAfter + (amount + fee)
                balBefore = balAfter.add(txn.getAmount().add(fee));
            }
        } else {
            balBefore = BigDecimal.ZERO;
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
                .serviceFee(fee)
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
     * Calculates cash summary for the currently authenticated Teller (defaults to today's shift).
     */
    @Transactional(readOnly = true)
    public DailyCashSummaryDto getDailyCashSummary() {
        return getDailyCashSummary("today");
    }

    /**
     * Calculates cash summary for the currently authenticated Teller for a given scope.
     * @param scope "today" (default) for today's shift or "all" for all-time teller history
     */
    @Transactional(readOnly = true)
    public DailyCashSummaryDto getDailyCashSummary(String scope) {
        StaffUsers teller = getCurrentAuthenticatedStaff();
        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(23, 59, 59, 999999999);

        boolean isAllTime = "all".equalsIgnoreCase(scope) || "all-time".equalsIgnoreCase(scope);

        java.util.List<BankTransactions> txns = isAllTime
                ? bankTransactionRepository.findAllTimeOtcTransactionsByStaff(teller.getStaffId())
                : bankTransactionRepository.findTodayOtcTransactionsByStaff(teller.getStaffId(), startOfDay, endOfDay);

        BigDecimal cashIn = BigDecimal.ZERO;
        BigDecimal cashOut = BigDecimal.ZERO;
        long depositCount = 0;
        long withdrawalCount = 0;

        for (BankTransactions t : txns) {
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
                .totalTransactions(txns.size())
                .depositCount(depositCount)
                .withdrawalCount(withdrawalCount)
                .currency("MMK")
                .scope(isAllTime ? "ALL_TIME" : "TODAY")
                .build();
    }

    /**
     * Reads configured OTC system parameters (limits, minimum balances & fee schedules) directly from database.
     */
    @Transactional(readOnly = true)
    public OtcParametersDto getOtcParameters() {
        Optional<FeeSchedules> depFee = feeScheduleRepository
                .findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(TransactionType.OTC_DEPOSIT);
        Optional<FeeSchedules> wdFee = feeScheduleRepository
                .findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(TransactionType.OTC_WITHDRAWAL);

        return OtcParametersDto.builder()
                .minDepositAmount(getRequiredSystemParameter("OTC_MINIMUM_DEPOSIT_AMOUNT"))
                .minWithdrawalAmount(getRequiredSystemParameter("OTC_MINIMUM_WITHDRAWAL_AMOUNT"))
                .minimumBalance(getRequiredSystemParameter("MINIMUM_BALANCE"))
                .maxOnetimeWithdrawal(getRequiredSystemParameter("OTC_ONETIME_WITHDRAWAL_LIMIT"))
                .maxDailyWithdrawal(getRequiredSystemParameter("OTC_DAILY_WITHDRAWAL_LIMIT"))
                .depositFeeType(depFee.map(f -> f.getFeeType().name()).orElse("FLAT"))
                .depositFeeValue(depFee.map(FeeSchedules::getFeeValue).orElse(BigDecimal.ZERO))
                .depositMinFee(depFee.map(FeeSchedules::getMinimumFee).orElse(null))
                .depositMaxFee(depFee.map(FeeSchedules::getMaximumFee).orElse(null))
                .withdrawalFeeType(wdFee.map(f -> f.getFeeType().name()).orElse("PERCENTAGE"))
                .withdrawalFeeValue(wdFee.map(FeeSchedules::getFeeValue).orElse(BigDecimal.ZERO))
                .withdrawalMinFee(wdFee.map(FeeSchedules::getMinimumFee).orElse(null))
                .withdrawalMaxFee(wdFee.map(FeeSchedules::getMaximumFee).orElse(null))
                .build();
    }

    /**
     * Retrieves withdrawal limit status for a specific account.
     */
    @Transactional(readOnly = true)
    public OtcAccountLimitDto getAccountLimitStatus(String accountNumber) {
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            throw new TransactionException("Account number is required.");
        }
        Accounts account = accountRepository.findByAccountNumber(accountNumber.trim())
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + accountNumber));

        BigDecimal maxOnetime = getRequiredSystemParameter("OTC_ONETIME_WITHDRAWAL_LIMIT");
        BigDecimal maxDaily = getRequiredSystemParameter("OTC_DAILY_WITHDRAWAL_LIMIT");

        LocalDate today = LocalDate.now();
        LocalDateTime startOfDay = today.atStartOfDay();
        LocalDateTime endOfDay = today.atTime(23, 59, 59, 999999999);

        BigDecimal todayWithdrawn = bankTransactionRepository.findTodayTotalOtcWithdrawnAmount(
                account.getAccountId(), startOfDay, endOfDay);
        if (todayWithdrawn == null) {
            todayWithdrawn = BigDecimal.ZERO;
        }

        BigDecimal remainingLimit = maxDaily.subtract(todayWithdrawn);
        if (remainingLimit.compareTo(BigDecimal.ZERO) < 0) {
            remainingLimit = BigDecimal.ZERO;
        }

        return OtcAccountLimitDto.builder()
                .accountNumber(account.getAccountNumber())
                .maxOnetimeWithdrawal(maxOnetime)
                .maxDailyWithdrawal(maxDaily)
                .todayWithdrawnAmount(todayWithdrawn)
                .remainingDailyLimit(remainingLimit)
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
