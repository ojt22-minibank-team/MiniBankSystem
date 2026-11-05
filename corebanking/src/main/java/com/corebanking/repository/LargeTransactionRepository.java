package com.corebanking.repository;

import com.corebanking.dto.LargeTransactionItemDTO;
import com.corebanking.dto.LargeTransactionReportDTO;
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

    public LargeTransactionReportDTO getLargeTransactionsPaged(
            LocalDate startDate, LocalDate endDate, BigDecimal minAmount, String txType, int page, int pageSize) {

        int validPage = (page <= 0) ? 1 : page;
        int validPageSize = (pageSize <= 0) ? 30 : pageSize;

        try {
            return jdbcTemplate.execute((Connection con) -> {
                CallableStatement cs = con.prepareCall("{CALL sp_large_transaction_aml_report_paged(?, ?, ?, ?, ?, ?)}");
                cs.setObject(1, startDate);
                cs.setObject(2, endDate);
                cs.setBigDecimal(3, minAmount);
                cs.setString(4, (txType == null || txType.isBlank()) ? null : txType);
                cs.setInt(5, validPage);
                cs.setInt(6, validPageSize);
                return cs;
            }, (CallableStatement cs) -> {
                cs.execute();

                long totalCount = 0L;
                BigDecimal totalVolume = BigDecimal.ZERO;
                long highRisk = 0L;
                long medRisk = 0L;

                // RS1: Summary totals
                try (ResultSet rs1 = cs.getResultSet()) {
                    if (rs1 != null && rs1.next()) {
                        totalCount = rs1.getLong("total_flagged_count");
                        totalVolume = rs1.getBigDecimal("total_flagged_volume");
                        highRisk = rs1.getLong("high_risk_count");
                        medRisk = rs1.getLong("med_risk_count");
                    }
                }

                // RS2: Paginated rows
                List<LargeTransactionItemDTO> items = new ArrayList<>();
                if (cs.getMoreResults()) {
                    try (ResultSet rs2 = cs.getResultSet()) {
                        while (rs2 != null && rs2.next()) {
                            items.add(LargeTransactionItemDTO.builder()
                                    .transactionRef(rs2.getString("transaction_ref"))
                                    .transactionTime(rs2.getTimestamp("transaction_time") != null 
                                            ? rs2.getTimestamp("transaction_time").toLocalDateTime() : null)
                                    .transactionType(rs2.getString("transaction_type"))
                                    .channel(rs2.getString("channel"))
                                    .amount(rs2.getBigDecimal("amount"))
                                    .currency(rs2.getString("currency"))
                                    .sourceAccountNo(rs2.getString("source_account_no"))
                                    .sourceCustomerName(rs2.getString("source_customer_name"))
                                    .destAccountNo(rs2.getString("dest_account_no"))
                                    .destCustomerName(rs2.getString("dest_customer_name"))
                                    .riskLevel(rs2.getString("risk_level"))
                                    .build());
                        }
                    }
                }

                int totalPages = (int) Math.ceil((double) totalCount / validPageSize);
                if (totalPages == 0) totalPages = 1;

                return LargeTransactionReportDTO.builder()
                        .startDate(startDate)
                        .endDate(endDate)
                        .thresholdAmount(minAmount)
                        .transactionType((txType == null || txType.isBlank()) ? "ALL" : txType)
                        .totalFlaggedCount(totalCount)
                        .totalFlaggedVolume(totalVolume)
                        .highRiskCount(highRisk)
                        .medRiskCount(medRisk)
                        .page(validPage)
                        .pageSize(validPageSize)
                        .totalPages(totalPages)
                        .items(items)
                        .build();
            });
        } catch (Exception ex) {
            log.warn("sp_large_transaction_aml_report_paged failed, falling back to full query: {}", ex.getMessage());
            List<LargeTransactionItemDTO> all = getLargeTransactions(startDate, endDate, minAmount, txType);
            long totalCount = all.size();
            BigDecimal totalVolume = all.stream().map(LargeTransactionItemDTO::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
            long highRisk = all.stream().filter(i -> "HIGH RISK".equalsIgnoreCase(i.getRiskLevel())).count();
            long medRisk = all.stream().filter(i -> "MEDIUM RISK".equalsIgnoreCase(i.getRiskLevel())).count();

            int fromIndex = Math.min((validPage - 1) * validPageSize, all.size());
            int toIndex = Math.min(fromIndex + validPageSize, all.size());
            List<LargeTransactionItemDTO> pagedItems = all.subList(fromIndex, toIndex);
            int totalPages = (int) Math.ceil((double) totalCount / validPageSize);
            if (totalPages == 0) totalPages = 1;

            return LargeTransactionReportDTO.builder()
                    .startDate(startDate)
                    .endDate(endDate)
                    .thresholdAmount(minAmount)
                    .transactionType((txType == null || txType.isBlank()) ? "ALL" : txType)
                    .totalFlaggedCount(totalCount)
                    .totalFlaggedVolume(totalVolume)
                    .highRiskCount(highRisk)
                    .medRiskCount(medRisk)
                    .page(validPage)
                    .pageSize(validPageSize)
                    .totalPages(totalPages)
                    .items(pagedItems)
                    .build();
        }
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
