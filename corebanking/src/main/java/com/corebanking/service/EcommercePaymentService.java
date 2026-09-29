package com.corebanking.service;

import com.corebanking.dto.EcommercePaymentRequestDto;
import com.corebanking.dto.EcommercePaymentResponseDto;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.TransactionException;
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
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Optional;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class EcommercePaymentService {

    private final AccountRepository accountRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final LedgerAccountRepository ledgerAccountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final FeeScheduleRepository feeScheduleRepository;
    private final AsyncNotificationService asyncNotificationService;

    @Transactional(isolation = Isolation.READ_COMMITTED, rollbackFor = Exception.class)
    public EcommercePaymentResponseDto processEcommercePayment(EcommercePaymentRequestDto request, String idempotencyKey) {

        String effectiveIdempotencyKey = (idempotencyKey != null && !idempotencyKey.isBlank())
                ? idempotencyKey
                : request.getIdempotencyKey();

        // =========================================================================
        // STEP 1: IDEMPOTENCY GUARD & BASIC VALIDATION
        // =========================================================================
        Optional<BankTransactions> existingTxn = bankTransactionRepository.findByIdempotencyKey(effectiveIdempotencyKey);
        if (existingTxn.isPresent()) {
            log.info("Duplicate E-Commerce payment request detected for key: {}. Returning cached record.", effectiveIdempotencyKey);
            return mapToResponseDto(existingTxn.get(), "Duplicate request handled idempotently.");
        }

        if (request.getSourceAccountNumber().trim().equalsIgnoreCase(request.getMerchantAccountNumber().trim())) {
            throw new TransactionException("Source account and merchant account cannot be identical.");
        }

        if (request.getAmount() == null || request.getAmount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new TransactionException("Payment amount must be greater than zero.");
        }

        // =========================================================================
        // STEP 2: DYNAMIC FEE CALCULATION FOR EXTERNAL_PAYMENT
        // =========================================================================
        BigDecimal serviceFee = calculateServiceFee(request.getAmount());
        BigDecimal totalRequiredAmount = request.getAmount().add(serviceFee);

     // =========================================================================
        // STEP 3: DETERMINISTIC PESSIMISTIC LOCKING (DEADLOCK PREVENTION)
        // =========================================================================
        boolean swap = request.getSourceAccountNumber().compareTo(request.getMerchantAccountNumber()) > 0;
        final String firstAccNo = swap ? request.getMerchantAccountNumber() : request.getSourceAccountNumber();
        final String secondAccNo = swap ? request.getSourceAccountNumber() : request.getMerchantAccountNumber();

        Accounts firstLocked = accountRepository.findByAccountNumberForUpdate(firstAccNo)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + firstAccNo));
        Accounts secondLocked = accountRepository.findByAccountNumberForUpdate(secondAccNo)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + secondAccNo));

        Accounts customerAccount = firstLocked.getAccountNumber().equalsIgnoreCase(request.getSourceAccountNumber())
                ? firstLocked : secondLocked;
        Accounts merchantAccount = firstLocked.getAccountNumber().equalsIgnoreCase(request.getMerchantAccountNumber())
                ? firstLocked : secondLocked;

        // =========================================================================
        // STEP 4: FINANCIAL & ACCOUNT ELIGIBILITY RULES
        // =========================================================================
        if (customerAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Customer account is not ACTIVE. Current status: " + customerAccount.getStatus());
        }

        if (merchantAccount.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Merchant settlement account is not ACTIVE. Current status: " + merchantAccount.getStatus());
        }

        if (!customerAccount.getCurrency().equalsIgnoreCase(request.getCurrency()) ||
            !merchantAccount.getCurrency().equalsIgnoreCase(request.getCurrency())) {
            throw new TransactionException("Currency mismatch across customer account, merchant account, and payment currency.");
        }

        // Minimum Balance Rule Enforcement
        BigDecimal customerAvailable = customerAccount.getAvailableBalance();
        BigDecimal minBalance = customerAccount.getMinimumBalance() != null ? customerAccount.getMinimumBalance() : BigDecimal.ZERO;
        BigDecimal postDeductionBalance = customerAvailable.subtract(totalRequiredAmount);

        if (postDeductionBalance.compareTo(minBalance) < 0) {
            throw new InsufficientFundsException(String.format(
                    "Insufficient available funds. Required: %s (Amount: %s + Fee: %s). Must maintain minimum balance: %s. Current available: %s",
                    totalRequiredAmount, request.getAmount(), serviceFee, minBalance, customerAvailable
            ));
        }

        // Daily Limit Check
        if (customerAccount.getDailyTransferLimit() != null && customerAccount.getDailyTransferLimit().compareTo(BigDecimal.ZERO) > 0) {
            LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
            LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
            BigDecimal todayTotal = bankTransactionRepository.findTodayTotalTransferredAmount(
                    customerAccount.getAccountId(), startOfDay, endOfDay);

            if (todayTotal.add(request.getAmount()).compareTo(customerAccount.getDailyTransferLimit()) > 0) {
                throw new TransactionException(String.format(
                        "Payment breaches daily limit of %s %s. Transferred today: %s, Attempted: %s",
                        customerAccount.getDailyTransferLimit(), customerAccount.getCurrency(), todayTotal, request.getAmount()
                ));
            }
        }

        // =========================================================================
        // STEP 5: ATOMIC BALANCE UPDATES
        // =========================================================================
        customerAccount.setCurrentBalance(customerAccount.getCurrentBalance().subtract(totalRequiredAmount));
        customerAccount.setAvailableBalance(customerAccount.getAvailableBalance().subtract(totalRequiredAmount));
        accountRepository.save(customerAccount);

        merchantAccount.setCurrentBalance(merchantAccount.getCurrentBalance().add(request.getAmount()));
        merchantAccount.setAvailableBalance(merchantAccount.getAvailableBalance().add(request.getAmount()));
        accountRepository.save(merchantAccount);

        // =========================================================================
        // STEP 6: MASTER TRANSACTION PERSISTENCE (EXTERNAL_PAYMENT)
        // =========================================================================
        LocalDateTime now = LocalDateTime.now();
        String txnRef = generateTransactionRef();

        BankTransactions transaction = BankTransactions.builder()
                .transactionRef(txnRef)
                .transactionType(TransactionType.EXTERNAL_PAYMENT)
                .status(TransactionStatus.COMPLETED)
                .sourceAccount(customerAccount)
                .destinationAccount(merchantAccount)
                .amount(request.getAmount())
                .serviceFee(serviceFee)
                .currency(request.getCurrency())
                .initiatedByType(InitiatedByType.CUSTOMER)
                .initiatedByCustomer(customerAccount.getCustomer())
                .channel(TransactionChannel.PAYMENT_GATEWAY)
                .externalReference(request.getOrderId())
                .idempotencyKey(effectiveIdempotencyKey)
                .description(request.getDescription() != null ? request.getDescription() : "E-Commerce Checkout Payment")
                .auditNote("E-Commerce Checkout authorized via Group 3 Payment Gateway")
                .authorizedAt(now)
                .completedAt(now)
                .updatedByType(UpdatedByType.SYSTEM)
                .build();

        bankTransactionRepository.save(transaction);

        // =========================================================================
        // STEP 7: DOUBLE-ENTRY GENERAL LEDGER ACCOUNTING
        // =========================================================================
        createLedgerEntries(transaction, customerAccount, merchantAccount, request.getAmount(), serviceFee);

        // =========================================================================
        // STEP 8: ASYNCHRONOUS NOTIFICATIONS (NON-BLOCKING)
        // =========================================================================
        asyncNotificationService.sendTransferNotificationsAsync(
                customerAccount.getCustomer(),
                merchantAccount.getCustomer(),
                transaction
        );

        log.info("E-Commerce Payment completed successfully. Ref: {}, OrderId: {}, Amount: {}",
                txnRef, request.getOrderId(), request.getAmount());

        return mapToResponseDto(transaction, "E-Commerce payment completed successfully.");
    }

    private void createLedgerEntries(BankTransactions txn, Accounts customer, Accounts merchant, BigDecimal amount, BigDecimal fee) {
        BigDecimal totalDebit = amount.add(fee);

        // 1. Customer Sub-Ledger or Master Deposit Pool (LIABILITY)
        LedgerAccounts customerLedger = ledgerAccountRepository.findByCustomerAccount(customer)
                .orElseGet(() -> ledgerAccountRepository.findByLedgerCode("GL-CUSTOMER-DEPOSITS")
                        .orElseThrow(() -> new TransactionException("GL-CUSTOMER-DEPOSITS ledger account not configured.")));

        // 2. Merchant Sub-Ledger or Settlement Pool (LIABILITY)
        LedgerAccounts merchantLedger = ledgerAccountRepository.findByCustomerAccount(merchant)
                .orElseGet(() -> ledgerAccountRepository.findByLedgerCode("GL-CUSTOMER-DEPOSITS")
                        .orElseThrow(() -> new TransactionException("Merchant liability ledger account not configured.")));

        // Line 1: DEBIT Customer Liability (Reduces Bank's Liability to Customer)
        LedgerEntries debitLine = LedgerEntries.builder()
                .transaction(txn)
                .lineNo(1)
                .ledgerAccount(customerLedger)
                .entryType(EntryType.DEBIT)
                .amount(totalDebit)
                .currency(txn.getCurrency())
                .balanceBefore(customer.getCurrentBalance().add(totalDebit))
                .balanceAfter(customer.getCurrentBalance())
                .narration(String.format("Debit customer %s for Order %s", customer.getAccountNumber(), txn.getExternalReference()))
                .build();
        ledgerEntryRepository.save(debitLine);

        // Line 2: CREDIT Merchant Liability (Increases Bank's Liability to Merchant)
        LedgerEntries creditMerchantLine = LedgerEntries.builder()
                .transaction(txn)
                .lineNo(2)
                .ledgerAccount(merchantLedger)
                .entryType(EntryType.CREDIT)
                .amount(amount)
                .currency(txn.getCurrency())
                .balanceBefore(merchant.getCurrentBalance().subtract(amount))
                .balanceAfter(merchant.getCurrentBalance())
                .narration(String.format("Credit merchant %s for Order %s", merchant.getAccountNumber(), txn.getExternalReference()))
                .build();
        ledgerEntryRepository.save(creditMerchantLine);

        // Line 3: CREDIT Fee Revenue (If service fee is applied)
        if (fee.compareTo(BigDecimal.ZERO) > 0) {
            LedgerAccounts feeLedger = ledgerAccountRepository.findByLedgerCode("GL-FEE-REVENUE")
                    .orElseThrow(() -> new TransactionException("GL-FEE-REVENUE ledger account not configured."));

            LedgerEntries feeCreditLine = LedgerEntries.builder()
                    .transaction(txn)
                    .lineNo(3)
                    .ledgerAccount(feeLedger)
                    .entryType(EntryType.CREDIT)
                    .amount(fee)
                    .currency(txn.getCurrency())
                    .narration(String.format("Gateway fee collected for Txn Ref %s", txn.getTransactionRef()))
                    .build();
            ledgerEntryRepository.save(feeCreditLine);
        }
    }

    private BigDecimal calculateServiceFee(BigDecimal amount) {
        return feeScheduleRepository.findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(TransactionType.EXTERNAL_PAYMENT)
                .map(schedule -> {
                    BigDecimal calculated;
                    if (schedule.getFeeType() == FeeType.PERCENTAGE) {
                        calculated = amount.multiply(schedule.getFeeValue())
                                .divide(BigDecimal.valueOf(100), 4, RoundingMode.HALF_UP);
                    } else {
                        calculated = schedule.getFeeValue();
                    }
                    if (schedule.getMinimumFee() != null && calculated.compareTo(schedule.getMinimumFee()) < 0) {
                        calculated = schedule.getMinimumFee();
                    }
                    if (schedule.getMaximumFee() != null && calculated.compareTo(schedule.getMaximumFee()) > 0) {
                        calculated = schedule.getMaximumFee();
                    }
                    return calculated;
                })
                .orElse(BigDecimal.ZERO);
    }

    private String generateTransactionRef() {
        String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
        int randomNum = ThreadLocalRandom.current().nextInt(100000, 999999);
        return String.format("TXN-ECOM-%s-%d", dateStr, randomNum);
    }

    private EcommercePaymentResponseDto mapToResponseDto(BankTransactions txn, String message) {
        return EcommercePaymentResponseDto.builder()
                .transactionRef(txn.getTransactionRef())
                .orderId(txn.getExternalReference())
                .status(txn.getStatus())
                .sourceAccountNumber(txn.getSourceAccount() != null ? txn.getSourceAccount().getAccountNumber() : null)
                .merchantAccountNumber(txn.getDestinationAccount() != null ? txn.getDestinationAccount().getAccountNumber() : null)
                .amount(txn.getAmount())
                .serviceFee(txn.getServiceFee())
                .totalDebitedAmount(txn.getAmount().add(txn.getServiceFee()))
                .currency(txn.getCurrency())
                .completedAt(txn.getCompletedAt())
                .description(txn.getDescription())
                .message(message)
                .build();
    }
}
