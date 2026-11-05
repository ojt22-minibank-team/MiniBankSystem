package com.corebanking.repository;

import com.corebanking.dto.LargeTransactionItemDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Repository
public class LargeTransactionRepository {

    private final JdbcTemplate jdbcTemplate;

    public LargeTransactionRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<LargeTransactionItemDTO> getLargeTransactions(
            LocalDate startDate, LocalDate endDate, BigDecimal minAmount, String txType) {
        
        try {
            return jdbcTemplate.execute((Connection con) -> {
                CallableStatement cs = con.prepareCall("{CALL sp_large_transaction_aml_report(?, ?, ?, ?)}");
                cs.setObject(1, startDate);
                cs.setObject(2, endDate);
                cs.setBigDecimal(3, minAmount);
                cs.setString(4, (txType == null || txType.isBlank()) ? null : txType);
                return cs;
            }, (CallableStatement cs) -> {
                List<LargeTransactionItemDTO> result = new ArrayList<>();
                boolean hasRs = cs.execute();
                if (hasRs) {
                    try (ResultSet rs = cs.getResultSet()) {
                        while (rs.next()) {
                            result.add(LargeTransactionItemDTO.builder()
                                    .transactionRef(rs.getString("transaction_ref"))
                                    .transactionTime(rs.getTimestamp("transaction_time") != null 
                                            ? rs.getTimestamp("transaction_time").toLocalDateTime() : null)
                                    .transactionType(rs.getString("transaction_type"))
                                    .channel(rs.getString("channel"))
                                    .amount(rs.getBigDecimal("amount"))
                                    .currency(rs.getString("currency"))
                                    .sourceAccountNo(rs.getString("source_account_no"))
                                    .sourceCustomerName(rs.getString("source_customer_name"))
                                    .destAccountNo(rs.getString("dest_account_no"))
                                    .destCustomerName(rs.getString("dest_customer_name"))
                                    .riskLevel(rs.getString("risk_level"))
                                    .build());
                        }
                    }
                }
                return result;
            });
        } catch (Exception ex) {
            log.warn("Stored procedure sp_large_transaction_aml_report failed. Falling back to direct SQL query.", ex);
            String directSql = """
                SELECT 
                    bt.transaction_ref                             AS transaction_ref,
                    bt.completed_at                                AS transaction_time,
                    bt.transaction_type                            AS transaction_type,
                    bt.channel                                     AS channel,
                    bt.amount                                      AS amount,
                    bt.currency                                    AS currency,
                    COALESCE(src_acc.account_number, 'N/A')        AS source_account_no,
                    COALESCE(src_cust.full_name, 'N/A')            AS source_customer_name,
                    COALESCE(dest_acc.account_number, 'N/A')       AS dest_account_no,
                    COALESCE(dest_cust.full_name, 'N/A')           AS dest_customer_name,
                    CASE 
                        WHEN bt.amount >= (? * 2) THEN 'HIGH RISK'
                        WHEN bt.amount >= ?       THEN 'MEDIUM RISK'
                        ELSE 'STANDARD'
                    END                                            AS risk_level
                FROM bank_transactions bt
                LEFT JOIN accounts src_acc   ON bt.source_account_id = src_acc.account_id
                LEFT JOIN customers src_cust ON src_acc.customer_id = src_cust.customer_id
                LEFT JOIN accounts dest_acc   ON bt.destination_account_id = dest_acc.account_id
                LEFT JOIN customers dest_cust ON dest_acc.customer_id = dest_cust.customer_id
                WHERE bt.status = 'COMPLETED'
                  AND bt.completed_at >= CAST(CONCAT(?, ' 00:00:00') AS DATETIME)
                  AND bt.completed_at <= CAST(CONCAT(?, ' 23:59:59') AS DATETIME)
                  AND bt.amount >= ?
                  AND (? IS NULL OR ? = '' OR bt.transaction_type = ?)
                ORDER BY bt.amount DESC, bt.completed_at DESC
            """;
            BigDecimal threshold = (minAmount != null) ? minAmount : new BigDecimal("10000000.0000");
            return jdbcTemplate.query(directSql, (rs, rowNum) -> LargeTransactionItemDTO.builder()
                    .transactionRef(rs.getString("transaction_ref"))
                    .transactionTime(rs.getTimestamp("transaction_time") != null 
                            ? rs.getTimestamp("transaction_time").toLocalDateTime() : null)
                    .transactionType(rs.getString("transaction_type"))
                    .channel(rs.getString("channel"))
                    .amount(rs.getBigDecimal("amount"))
                    .currency(rs.getString("currency"))
                    .sourceAccountNo(rs.getString("source_account_no"))
                    .sourceCustomerName(rs.getString("source_customer_name"))
                    .destAccountNo(rs.getString("dest_account_no"))
                    .destCustomerName(rs.getString("dest_customer_name"))
                    .riskLevel(rs.getString("risk_level"))
                    .build(),
                    threshold, threshold, startDate, endDate, threshold, txType, txType, txType
            );
        }
    }
}
