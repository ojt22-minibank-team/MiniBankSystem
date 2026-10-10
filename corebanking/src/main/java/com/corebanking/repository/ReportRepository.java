package com.corebanking.repository;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AccountStatusSummaryDTO;
import com.corebanking.dto.AuditTrailLogDTO;
import com.corebanking.dto.AuditTrailPageDTO;
import com.corebanking.dto.BalanceBracketDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ReportRepository ? Group 2 Reporting Subsystem.
 * All queries are executed via dedicated MySQL Stored Procedures.
 */
@Repository
public class ReportRepository {

    private final JdbcTemplate jdbcTemplate;

    public ReportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    // -------------------------------------------------------
    // SP 1: Daily Ledger Summary
    // -------------------------------------------------------
    public List<DailyLedgerSummaryDTO> getDailyLedgerSummary(
            LocalDate startDate, LocalDate endDate, String status) {

        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{CALL sp_get_daily_ledger_summary(?, ?, ?)}");
            cs.setObject(1, startDate);
            cs.setObject(2, endDate);
            cs.setString(3, (status == null || status.isBlank()) ? null : status);
            return cs;
        }, (CallableStatement cs) -> {
            List<DailyLedgerSummaryDTO> result = new ArrayList<>();
            boolean hasRs = cs.execute();
            if (hasRs) {
                try (ResultSet rs = cs.getResultSet()) {
                    while (rs.next()) {
                        result.add(DailyLedgerSummaryDTO.builder()
                                .reportDate(rs.getObject("report_date", LocalDate.class))
                                .transactionType(rs.getString("transaction_type"))
                                .transactionCount(rs.getLong("transaction_count"))
                                .totalAmount(rs.getBigDecimal("total_amount"))
                                .totalFee(rs.getBigDecimal("total_fee"))
                                .currency(rs.getString("currency"))
                                .build());
                    }
                }
            }
            return result;
        });
    }

    // -------------------------------------------------------
    // SP 2: Account Status Summary
    // -------------------------------------------------------
    public AccountStatusReportDTO getAccountStatusSummary(
            LocalDate startDate, LocalDate endDate, String accountStatus) {

        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{CALL sp_get_customer_account_status_summary(?, ?, ?)}");
            cs.setObject(1, startDate);
            cs.setObject(2, endDate);
            cs.setString(3, (accountStatus == null || accountStatus.isBlank()) ? null : accountStatus);
            return cs;
        }, (CallableStatement cs) -> {
            List<AccountStatusSummaryDTO> statuses = new ArrayList<>();
            List<BalanceBracketDTO> brackets = new ArrayList<>();

            boolean hasRs = cs.execute();

            // RS1: status breakdown
            if (hasRs) {
                try (ResultSet rs = cs.getResultSet()) {
                    while (rs.next()) {
                        statuses.add(AccountStatusSummaryDTO.builder()
                                .accountStatus(rs.getString("account_status"))
                                .accountCount(rs.getLong("account_count"))
                                .newAccountsInRange(rs.getLong("new_accounts_in_range"))
                                .avgBalance(rs.getBigDecimal("avg_balance"))
                                .minBalance(rs.getBigDecimal("min_balance"))
                                .maxBalance(rs.getBigDecimal("max_balance"))
                                .build());
                    }
                }
                hasRs = cs.getMoreResults();
            }

            // RS2: bracket distribution
            if (hasRs) {
                try (ResultSet rs = cs.getResultSet()) {
                    while (rs.next()) {
                        brackets.add(BalanceBracketDTO.builder()
                                .balanceBracket(rs.getString("balance_bracket"))
                                .bracketCount(rs.getLong("bracket_count"))
                                .bracketTotalBalance(rs.getBigDecimal("bracket_total_balance"))
                                .accountStatus(rs.getString("account_status"))
                                .build());
                    }
                }
            }

            return AccountStatusReportDTO.builder()
                    .statusSummaries(statuses)
                    .bracketDistribution(brackets)
                    .build();
        });
    }

    // -------------------------------------------------------
    // SP 3: Audit Trail Log (paginated)
    // -------------------------------------------------------
    public AuditTrailPageDTO getAuditTrailLog(
            String staffId, String actionType,
            LocalDateTime startDate, LocalDateTime endDate,
            String accountNo, int page, int pageSize) {

        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{CALL sp_get_system_audit_trail_log(?, ?, ?, ?, ?, ?, ?)}");
            cs.setString(1, (staffId    == null || staffId.isBlank())    ? null : staffId);
            cs.setString(2, (actionType == null || actionType.isBlank()) ? null : actionType);
            cs.setObject(3, startDate);
            cs.setObject(4, endDate);
            cs.setString(5, (accountNo  == null || accountNo.isBlank())  ? null : accountNo);
            cs.setInt(6, page);
            cs.setInt(7, pageSize);
            return cs;
        }, (CallableStatement cs) -> {
            long totalCount = 0;
            List<AuditTrailLogDTO> logs = new ArrayList<>();

            boolean hasRs = cs.execute();

            // RS1: total count
            if (hasRs) {
                try (ResultSet rs = cs.getResultSet()) {
                    if (rs.next()) {
                        totalCount = rs.getLong("total_count");
                    }
                }
                hasRs = cs.getMoreResults();
            }

            // RS2: log rows
            if (hasRs) {
                try (ResultSet rs = cs.getResultSet()) {
                    while (rs.next()) {
                        logs.add(AuditTrailLogDTO.builder()
                                .logId(String.valueOf(rs.getLong("log_id")))
                                .staffId(rs.getString("staff_id"))
                                .staffUsername(rs.getString("staff_username"))
                                .staffFullName(rs.getString("staff_full_name"))
                                .actionType(rs.getString("action_type"))
                                .entityType(rs.getString("entity_type"))
                                .entityId(rs.getString("entity_id"))
                                .oldValue(rs.getString("old_value"))
                                .newValue(rs.getString("new_value"))
                                .ipAddress(rs.getString("ip_address"))
                                .description(rs.getString("description"))
                                .createdAt(rs.getObject("created_at", LocalDateTime.class))
                                .build());
                    }
                }
            }

            int totalPages = (pageSize > 0) ? (int) Math.ceil((double) totalCount / pageSize) : 1;
            return AuditTrailPageDTO.builder()
                    .logs(logs)
                    .totalCount(totalCount)
                    .page(page)
                    .pageSize(pageSize)
                    .totalPages(totalPages)
                    .build();
        });
    }
}
