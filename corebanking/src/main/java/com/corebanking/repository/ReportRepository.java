package com.corebanking.repository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.corebanking.dto.ReportRequestDto;
import com.corebanking.dto.ReportResultDto;
import com.corebanking.dto.TransactionDetailDto;
import com.corebanking.dto.TransactionSummaryDto;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.util.ArrayList;

@Repository
public class ReportRepository {

    private final JdbcTemplate jdbcTemplate;

    public ReportRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public ReportResultDto getTransactionReport(ReportRequestDto req) {
        return jdbcTemplate.execute((Connection con) -> {
            String call = "{CALL sp_rpt_transactions_by_date_and_type_v2(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)}";
            CallableStatement cs = con.prepareCall(call);
            cs.setObject(1, req.getFromDate());
            cs.setObject(2, req.getToDate());
            cs.setString(3, req.getTransactionType());
            cs.setString(4, req.getStatus());
            cs.setString(5, req.getChannel());
            cs.setString(6, req.getAccountNumber());
            cs.setBytes(7, req.getStaffId());
            cs.setObject(8, req.getLimit() != null ? req.getLimit() : 50);
            cs.setObject(9, req.getLastSeenDate());
            cs.setBytes(10, req.getLastSeenId());
            return cs;
        }, (CallableStatement cs) -> {
            ReportResultDto result = new ReportResultDto();
            boolean hasResults = cs.execute();

            // 1st Result Set: Summary
            if (hasResults) {
                try (ResultSet rs = cs.getResultSet()) {
                    while (rs.next()) {
                        TransactionSummaryDto summary = new TransactionSummaryDto();
                        summary.setFilteredTransactionCount(rs.getLong("filtered_transaction_count"));
                        summary.setFilteredTotalAmount(rs.getBigDecimal("filtered_total_amount"));
                        summary.setFilteredTotalFee(rs.getBigDecimal("filtered_total_fee"));
                        summary.setCurrency(rs.getString("currency"));
                        result.getSummaries().add(summary);
                    }
                }
                hasResults = cs.getMoreResults();
            }

            // 2nd Result Set: Detail
            if (hasResults) {
                try (ResultSet rs = cs.getResultSet()) {
                    while (rs.next()) {
                        TransactionDetailDto detail = new TransactionDetailDto();
                        detail.setTransactionId(rs.getString("transaction_id"));
                        detail.setTransactionRef(rs.getString("transaction_ref"));
                        detail.setAmount(rs.getBigDecimal("amount"));
                        // လိုအပ်သော field များကို ဆက်လက် Map လုပ်ရန်...
                        result.getDetails().add(detail);
                    }
                }
            }
            return result;
        });
    }
}