package com.corebanking.repository;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AuditTrailLogDTO;
import com.corebanking.dto.AuditTrailPageDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.ActorType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.jdbc.core.CallableStatementCallback;
import org.springframework.jdbc.core.CallableStatementCreator;
import org.springframework.jdbc.core.JdbcTemplate;

import java.math.BigDecimal;
import java.sql.CallableStatement;
import java.sql.Connection;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportRepositoryTest {

    @Mock
    private JdbcTemplate jdbcTemplate;

    @Mock
    private AuditLogsRepository auditLogsRepository;

    private ReportRepository reportRepository;

    @BeforeEach
    void setUp() {
        reportRepository = new ReportRepository(jdbcTemplate, auditLogsRepository);
    }

    @Test
    @DisplayName("getDailyLedgerSummary should execute stored procedure and map result set")
    @SuppressWarnings("unchecked")
    void getDailyLedgerSummary_shouldMapResultSet() throws SQLException {
        LocalDate startDate = LocalDate.of(2026, 9, 1);
        LocalDate endDate = LocalDate.of(2026, 9, 30);

        Connection connection = mock(Connection.class);
        CallableStatement cs = mock(CallableStatement.class);
        ResultSet rs = mock(ResultSet.class);

        when(connection.prepareCall(anyString())).thenReturn(cs);
        when(cs.execute()).thenReturn(true);
        when(cs.getResultSet()).thenReturn(rs);
        when(rs.next()).thenReturn(true, false);
        when(rs.getObject("report_date", LocalDate.class)).thenReturn(LocalDate.of(2026, 9, 15));
        when(rs.getString("transaction_type")).thenReturn("INTERNAL_TRANSFER");
        when(rs.getLong("transaction_count")).thenReturn(10L);
        when(rs.getBigDecimal("total_amount")).thenReturn(new BigDecimal("10000.00"));
        when(rs.getBigDecimal("total_fee")).thenReturn(new BigDecimal("50.00"));
        when(rs.getString("currency")).thenReturn("MMK");

        when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
                .thenAnswer(invocation -> {
                    CallableStatementCreator csc = invocation.getArgument(0);
                    CallableStatementCallback<List<DailyLedgerSummaryDTO>> callback = invocation.getArgument(1);
                    CallableStatement createdCs = csc.createCallableStatement(connection);
                    return callback.doInCallableStatement(createdCs);
                });

        List<DailyLedgerSummaryDTO> result = reportRepository.getDailyLedgerSummary(startDate, endDate, "COMPLETED");

        assertThat(result).hasSize(1);
        DailyLedgerSummaryDTO row = result.get(0);
        assertThat(row.getReportDate()).isEqualTo(LocalDate.of(2026, 9, 15));
        assertThat(row.getTransactionType()).isEqualTo("INTERNAL_TRANSFER");
        assertThat(row.getTransactionCount()).isEqualTo(10L);
        assertThat(row.getTotalAmount()).isEqualTo(new BigDecimal("10000.00"));
        assertThat(row.getTotalFee()).isEqualTo(new BigDecimal("50.00"));
        assertThat(row.getCurrency()).isEqualTo("MMK");

        verify(connection).prepareCall("{CALL sp_get_daily_ledger_summary(?, ?, ?)}");
        verify(cs).setObject(1, startDate);
        verify(cs).setObject(2, endDate);
        verify(cs).setString(3, "COMPLETED");
    }

    @Test
    @DisplayName("getAccountStatusSummary should execute SP and map status summaries and balance brackets")
    @SuppressWarnings("unchecked")
    void getAccountStatusSummary_shouldMapResultSets() throws SQLException {
        LocalDate startDate = LocalDate.of(2026, 9, 1);
        LocalDate endDate = LocalDate.of(2026, 9, 30);

        Connection connection = mock(Connection.class);
        CallableStatement cs = mock(CallableStatement.class);
        ResultSet rs1 = mock(ResultSet.class);
        ResultSet rs2 = mock(ResultSet.class);

        when(connection.prepareCall(anyString())).thenReturn(cs);
        when(cs.execute()).thenReturn(true);
        when(cs.getResultSet()).thenReturn(rs1, rs2);
        when(cs.getMoreResults()).thenReturn(true, false);

        // RS1: status summary
        when(rs1.next()).thenReturn(true, false);
        when(rs1.getString("account_status")).thenReturn("ACTIVE");
        when(rs1.getLong("account_count")).thenReturn(100L);
        when(rs1.getLong("new_accounts_in_range")).thenReturn(5L);
        when(rs1.getBigDecimal("avg_balance")).thenReturn(new BigDecimal("25000.00"));
        when(rs1.getBigDecimal("min_balance")).thenReturn(new BigDecimal("500.00"));
        when(rs1.getBigDecimal("max_balance")).thenReturn(new BigDecimal("100000.00"));

        // RS2: bracket distribution
        when(rs2.next()).thenReturn(true, false);
        when(rs2.getString("balance_bracket")).thenReturn("0 - 10,000");
        when(rs2.getLong("bracket_count")).thenReturn(40L);
        when(rs2.getBigDecimal("bracket_total_balance")).thenReturn(new BigDecimal("200000.00"));
        when(rs2.getString("account_status")).thenReturn("ACTIVE");

        when(jdbcTemplate.execute(any(CallableStatementCreator.class), any(CallableStatementCallback.class)))
                .thenAnswer(invocation -> {
                    CallableStatementCreator csc = invocation.getArgument(0);
                    CallableStatementCallback<AccountStatusReportDTO> callback = invocation.getArgument(1);
                    CallableStatement createdCs = csc.createCallableStatement(connection);
                    return callback.doInCallableStatement(createdCs);
                });

        AccountStatusReportDTO result = reportRepository.getAccountStatusSummary(startDate, endDate, "ACTIVE");

        assertThat(result).isNotNull();
        assertThat(result.getStatusSummaries()).hasSize(1);
        assertThat(result.getStatusSummaries().get(0).getAccountStatus()).isEqualTo("ACTIVE");
        assertThat(result.getStatusSummaries().get(0).getAccountCount()).isEqualTo(100L);

        assertThat(result.getBracketDistribution()).hasSize(1);
        assertThat(result.getBracketDistribution().get(0).getBalanceBracket()).isEqualTo("0 - 10,000");
        assertThat(result.getBracketDistribution().get(0).getBracketCount()).isEqualTo(40L);

        verify(connection).prepareCall("{CALL sp_get_customer_account_status_summary(?, ?, ?)}");
    }

    @Test
    @DisplayName("getAuditTrailLog should query AuditLogs entity repository and return paginated DTO")
    @SuppressWarnings("unchecked")
    void getAuditTrailLog_shouldQueryAuditLogsEntityAndReturnPage() {
        LocalDateTime startDt = LocalDateTime.of(2026, 9, 1, 0, 0);
        LocalDateTime endDt = LocalDateTime.of(2026, 9, 30, 23, 59);

        StaffUsers staff = StaffUsers.builder()
                .staffNo("STF-01")
                .username("teller1")
                .fullName("Teller One")
                .build();

        AuditLogs auditLog = AuditLogs.builder()
                .auditId(999L)
                .actorType(ActorType.STAFF)
                .actorStaff(staff)
                .actionCategory("ACCOUNT")
                .actionType("CREATE_ACCOUNT")
                .entityType("ACCOUNT")
                .entityId("ACC-123")
                .oldValues(null)
                .newValues("ACTIVE")
                .ipAddress("10.0.0.1")
                .description("Account created")
                .createdAt(LocalDateTime.of(2026, 9, 15, 14, 0))
                .build();

        Page<AuditLogs> page = new PageImpl<>(List.of(auditLog), PageRequest.of(0, 20), 45);

        when(auditLogsRepository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(page);

        AuditTrailPageDTO result = reportRepository.getAuditTrailLog(
                "STF-01", "CREATE_ACCOUNT", startDt, endDt, "ACC-123", 1, 20);

        assertThat(result).isNotNull();
        assertThat(result.getTotalCount()).isEqualTo(45L);
        assertThat(result.getTotalPages()).isEqualTo(3); // ceil(45 / 20) = 3
        assertThat(result.getPage()).isEqualTo(1);
        assertThat(result.getPageSize()).isEqualTo(20);
        assertThat(result.getLogs()).hasSize(1);
        assertThat(result.getLogs().get(0).getLogId()).isEqualTo("999");
        assertThat(result.getLogs().get(0).getActionType()).isEqualTo("CREATE_ACCOUNT");
        assertThat(result.getLogs().get(0).getStaffId()).isEqualTo("STF-01");
        assertThat(result.getLogs().get(0).getStaffUsername()).isEqualTo("teller1");
        assertThat(result.getLogs().get(0).getStaffFullName()).isEqualTo("Teller One");

        verify(auditLogsRepository).findAll(any(Specification.class), any(Pageable.class));
    }
}
