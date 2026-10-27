package com.corebanking.integration.adapter;

import com.corebanking.entity.Accounts;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.TransactionException;
import com.corebanking.integration.port.LedgerFacadePort;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.BankTransactionRepository;
import com.corebanking.service.TransferLimitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class CoreBankingLedgerAdapter implements LedgerFacadePort {

    private final AccountRepository accountRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final TransferLimitService transferLimitService;

    @Override
    public boolean isDuplicatePayment(String paymentToken) {
        return bankTransactionRepository.existsByExternalReference(paymentToken);
    }

    // READ-ONLY METHOD FOR PRE-CHECK UX
    @Override
    @Transactional(readOnly = true)
    public void validateSufficientFundsAndLimits(UUID customerId, String accountId, BigDecimal amount) {
        log.info("Performing read-only pre-check for customer {}, account {} for amount {}", customerId, accountId, amount);

        List<Accounts> customerAccounts = accountRepository.findByCustomerCustomerId(customerId);
        if (customerAccounts.isEmpty()) {
            throw new AccountNotFoundException("Customer has no active accounts");
        }
        
        Accounts sourceAccount = customerAccounts.stream()
                .filter(acc -> acc.getAccountNumber().equals(accountId))
                .filter(acc -> com.corebanking.entity.enums.AccountType.CURRENT.equals(acc.getAccountType()))
                .filter(acc -> com.corebanking.entity.enums.AccountStatus.ACTIVE.equals(acc.getStatus()))
                .findFirst()
                .orElseThrow(() -> new AccountNotFoundException("Selected account must be an active CURRENT account"));

        BigDecimal availableBalance = sourceAccount.getAvailableBalance() != null 
                ? sourceAccount.getAvailableBalance() 
                : BigDecimal.ZERO;
        
        // Enforce Bank-wide Minimum Balance (Synchronized with Member 3 TransferLimitService)
        BigDecimal minBalance = transferLimitService.getEffectiveMinimumBalance(sourceAccount);
        BigDecimal netAvailable = availableBalance.subtract(minBalance);

        if (netAvailable.compareTo(amount) < 0) {
            log.warn("Insufficient funds for account {}. Available: {}, Minimum required: {}, Net spendable: {}, Attempted: {}",
                    sourceAccount.getAccountNumber(), availableBalance, minBalance, netAvailable, amount);
            throw new InsufficientFundsException(String.format(
                    "Insufficient available funds. You must maintain a minimum balance of %,.2f %s. Available to spend: %,.2f %s, Attempted: %,.2f %s",
                    minBalance, sourceAccount.getCurrency(), netAvailable.max(BigDecimal.ZERO), sourceAccount.getCurrency(), amount, sourceAccount.getCurrency()
            ));
        }
        
        // Cumulative Daily Transfer Limit Check (Enforces consistency with Group 2 and Member 3)
        BigDecimal dailyLimit = sourceAccount.getDailyTransferLimit();
        if (dailyLimit != null && dailyLimit.compareTo(BigDecimal.ZERO) > 0) {
            LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
            LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

            BigDecimal todayTotal = bankTransactionRepository.findTodayTotalTransferredAmount(
                    sourceAccount.getAccountId(), startOfDay, endOfDay);
            if (todayTotal == null) {
                todayTotal = BigDecimal.ZERO;
            }

            BigDecimal totalAttempted = todayTotal.add(amount);

            if (totalAttempted.compareTo(dailyLimit) > 0) {
                BigDecimal remainingLimit = dailyLimit.subtract(todayTotal);
                if (remainingLimit.compareTo(BigDecimal.ZERO) < 0) {
                    remainingLimit = BigDecimal.ZERO;
                }

                log.warn("Daily limit exceeded for account {}. Limit: {}, Used Today: {}, Attempted: {}, Remaining: {}",
                        sourceAccount.getAccountNumber(), dailyLimit, todayTotal, amount, remainingLimit);

                throw new TransactionException(String.format(
                        "Payment breaches daily limit of %s %s. Transferred today: %s, Remaining: %s, Attempted: %s",
                        dailyLimit, sourceAccount.getCurrency(), todayTotal, remainingLimit, amount
                ));
            }
        }
        
        log.info("Read-only pre-check passed for customer {}", customerId);
    }
}
