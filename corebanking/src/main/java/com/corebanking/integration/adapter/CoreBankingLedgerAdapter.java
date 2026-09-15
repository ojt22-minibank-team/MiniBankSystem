package com.corebanking.integration.adapter;

import com.corebanking.integration.port.LedgerFacadePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.nio.ByteBuffer;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class CoreBankingLedgerAdapter implements LedgerFacadePort {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public boolean isDuplicatePayment(String paymentToken) {
        String sql = "SELECT COUNT(*) FROM bank_transactions WHERE external_reference = ? AND status = 'COMPLETED'";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, paymentToken);
        return count != null && count > 0;
    }

    @Override
    public String executeAtomicTransfer(UUID customerId, UUID merchantAccountId, BigDecimal amount, String paymentToken) {
        
        byte[] customerBytes = uuidToBytes(customerId);
        byte[] merchantBytes = uuidToBytes(merchantAccountId);

        // 1. Find Customer's Source Account
        String findAccountSql = "SELECT account_id FROM accounts WHERE customer_id = ? AND status = 'ACTIVE' AND account_type IN ('SAVINGS', 'CURRENT', 'SALARY') LIMIT 1";
        byte[] sourceAccountId;
        try {
            sourceAccountId = jdbcTemplate.queryForObject(findAccountSql, byte[].class, customerBytes);
        } catch (Exception e) {
            throw new IllegalStateException("No active account found for customer");
        }

        // 2. Check Balance
        String checkBalanceSql = "SELECT available_balance FROM accounts WHERE account_id = ? FOR UPDATE";
        BigDecimal availableBalance = jdbcTemplate.queryForObject(checkBalanceSql, BigDecimal.class, sourceAccountId);
        
        if (availableBalance == null || availableBalance.compareTo(amount) < 0) {
            throw new IllegalStateException("Insufficient available balance");
        }

        // 3. Deduct from Source
        String deductSql = "UPDATE accounts SET current_balance = current_balance - ?, available_balance = available_balance - ? WHERE account_id = ?";
        jdbcTemplate.update(deductSql, amount, amount, sourceAccountId);

        // 4. Add to Merchant
        String creditSql = "UPDATE accounts SET current_balance = current_balance + ?, available_balance = available_balance + ? WHERE account_id = ?";
        jdbcTemplate.update(creditSql, amount, amount, merchantBytes);

        // 5. Insert Transaction Record
        byte[] transactionId = uuidToBytes(UUID.randomUUID());
        String transactionRef = "TXN-" + System.currentTimeMillis();
        
        String insertTxnSql = "INSERT INTO bank_transactions " +
                "(transaction_id, transaction_ref, transaction_type, status, source_account_id, destination_account_id, amount, currency, initiated_by_type, channel, external_reference, initiated_at, service_fee, updated_at, version) " +
                "VALUES (?, ?, 'EXTERNAL_PAYMENT', 'COMPLETED', ?, ?, ?, 'MMK', 'CUSTOMER', 'PAYMENT_GATEWAY', ?, NOW(), 0.00, NOW(), 0)";
        
        jdbcTemplate.update(insertTxnSql, transactionId, transactionRef, sourceAccountId, merchantBytes, amount, paymentToken);

        log.info("Successfully executed atomic transfer for payment token {}. Txn Ref: {}", paymentToken, transactionRef);
        return transactionRef;
    }

    private byte[] uuidToBytes(UUID uuid) {
        ByteBuffer bb = ByteBuffer.wrap(new byte[16]);
        bb.putLong(uuid.getMostSignificantBits());
        bb.putLong(uuid.getLeastSignificantBits());
        return bb.array();
    }
}
