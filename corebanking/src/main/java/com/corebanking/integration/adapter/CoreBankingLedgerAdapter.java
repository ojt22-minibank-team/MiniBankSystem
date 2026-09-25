package com.corebanking.integration.adapter;

import com.corebanking.entity.Accounts;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.TransactionException;
import com.corebanking.integration.port.LedgerFacadePort;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.BankTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class CoreBankingLedgerAdapter implements LedgerFacadePort {

    private final AccountRepository accountRepository;
    private final BankTransactionRepository bankTransactionRepository;

    @Override
    public boolean isDuplicatePayment(String paymentToken) {
        return bankTransactionRepository.findByIdempotencyKey(paymentToken).isPresent();
    }

    // READ-ONLY METHOD FOR PRE-CHECK UX
    @Override
    @Transactional(readOnly = true)
    public void validateSufficientFundsAndLimits(UUID customerId, BigDecimal amount) {
        log.info("Performing read-only pre-check for customer {} for amount {}", customerId, amount);

        List<Accounts> customerAccounts = accountRepository.findByCustomerIdForUpdate(customerId);
        if (customerAccounts.isEmpty()) {
            throw new AccountNotFoundException("Customer has no active accounts");
        }
        Accounts sourceAccount = customerAccounts.get(0); 

        BigDecimal availableBalance = sourceAccount.getAvailableBalance();
        BigDecimal dailyLimit = sourceAccount.getDailyTransferLimit();

        if (availableBalance == null || availableBalance.compareTo(amount) < 0) {
            throw new InsufficientFundsException("Insufficient available balance");
        }
        
        if (dailyLimit != null && amount.compareTo(dailyLimit) > 0) {
            throw new TransactionException("Transaction exceeds your daily transfer limit");
        }
        
        log.info("Read-only pre-check passed for customer {}", customerId);
    }
}
