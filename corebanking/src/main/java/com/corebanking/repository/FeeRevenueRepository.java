package com.corebanking.repository;

import com.corebanking.dto.FeeRevenueItemDTO;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Repository
public class FeeRevenueRepository {

    private final JdbcTemplate jdbcTemplate;

    public FeeRevenueRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<FeeRevenueItemDTO> getFeeRevenueData(LocalDate startDate, LocalDate endDate, String channel) {
        try {
            return jdbcTemplate.execute((Connection con) -> {
                CallableStatement cs = con.prepareCall("{CALL sp_fee_revenue_report(?, ?, ?)}");
                cs.setObject(1, startDate);
                cs.setObject(2, endDate);
                cs.setString(3, (channel == null || channel.isBlank()) ? null : channel);
                return cs;
            }, (CallableStatement cs) -> {
                List<FeeRevenueItemDTO> result = new ArrayList<>();
                boolean hasRs = cs.execute();
                if (hasRs) {
                    try (ResultSet rs = cs.getResultSet()) {
                        while (rs.next()) {
                            result.add(FeeRevenueItemDTO.builder()
                                    .transactionType(rs.getString("transaction_type"))
                                    .channel(rs.getString("channel"))
                                    .transactionCount(rs.getLong("transaction_count"))
                                    .totalVolume(rs.getBigDecimal("total_volume"))
                                    .totalFeeRevenue(rs.getBigDecimal("total_fee_revenue"))
                                    .avgFeePerTx(rs.getBigDecimal("avg_fee_per_tx"))
                                    .build());
                        }
                    }
                }
                return result;
            });
        } catch (Exception ex) {
            log.warn("Stored procedure sp_fee_revenue_report execution failed. Falling back to direct SQL query.", ex);
            String directSql = """
                SELECT 
                    bt.transaction_type                            AS transaction_type,
                    bt.channel                                     AS channel,
                    COUNT(bt.transaction_id)                       AS transaction_count,
                    COALESCE(SUM(bt.amount), 0.0000)               AS total_volume,
                    COALESCE(SUM(bt.service_fee), 0.0000)          AS total_fee_revenue,
                    COALESCE(AVG(bt.service_fee), 0.0000)          AS avg_fee_per_tx
                FROM bank_transactions bt
                WHERE bt.status = 'COMPLETED'
                  AND bt.completed_at >= CAST(CONCAT(?, ' 00:00:00') AS DATETIME)
                  AND bt.completed_at <= CAST(CONCAT(?, ' 23:59:59') AS DATETIME)
                  AND (? IS NULL OR ? = '' OR bt.channel = ?)
                GROUP BY bt.transaction_type, bt.channel
                ORDER BY total_fee_revenue DESC
            """;
            return jdbcTemplate.query(directSql, (rs, rowNum) -> FeeRevenueItemDTO.builder()
                    .transactionType(rs.getString("transaction_type"))
                    .channel(rs.getString("channel"))
                    .transactionCount(rs.getLong("transaction_count"))
                    .totalVolume(rs.getBigDecimal("total_volume"))
                    .totalFeeRevenue(rs.getBigDecimal("total_fee_revenue"))
                    .avgFeePerTx(rs.getBigDecimal("avg_fee_per_tx"))
                    .build(),
                    startDate, endDate, channel, channel, channel
            );
        }
    }
}
