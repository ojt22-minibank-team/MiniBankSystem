package com.corebanking.controller;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AccountStatusSummaryDTO;
import com.corebanking.dto.AuditTrailLogDTO;
import com.corebanking.dto.AuditTrailPageDTO;
import com.corebanking.dto.BalanceBracketDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import com.corebanking.service.ReportService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ReportControllerTest {

    @Mock
    private ReportService reportService;

    @InjectMocks
    private ReportController reportController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(reportController).build();
    }

    // -------------------------------------------------------------------------
    // 1. Daily Ledger Summary Endpoints
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/v1/reports/daily-ledger-summary should return 200 and JSON list")
    void getDailyLedgerSummary_shouldReturnOkAndList() throws Exception {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 30);

        DailyLedgerSummaryDTO dto = DailyLedgerSummaryDTO.builder()
                .reportDate(LocalDate.of(2026, 9, 15))
                .transactionType("OTC_DEPOSIT")
                .transactionCount(50L)
                .totalAmount(new BigDecimal("100000.00"))
                .totalFee(new BigDecimal("0.00"))
                .currency("MMK")
                .build();

        when(reportService.getDailyLedgerSummary(start, end, "COMPLETED"))
                .thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/reports/daily-ledger-summary")
                        .param("startDate", "2026-09-01")
                        .param("endDate", "2026-09-30")
                        .param("status", "COMPLETED"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].transactionType", is("OTC_DEPOSIT")))
                .andExpect(jsonPath("$[0].transactionCount", is(50)))
                .andExpect(jsonPath("$[0].currency", is("MMK")));

        verify(reportService).getDailyLedgerSummary(start, end, "COMPLETED");
    }

    @Test
    @DisplayName("GET /api/v1/reports/daily-ledger-summary/export with csv format should return CSV attachment")
    void exportDailyLedger_csv_shouldReturnCsvAttachment() throws Exception {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 30);
        byte[] csvBytes = "No,Transaction Type,Count\n1,OTC_DEPOSIT,50\n".getBytes(StandardCharsets.UTF_8);

        when(reportService.exportDailyLedgerCsv(start, end, null)).thenReturn(csvBytes);

        mockMvc.perform(get("/api/v1/reports/daily-ledger-summary/export")
                        .param("startDate", "2026-09-01")
                        .param("endDate", "2026-09-30")
                        .param("format", "csv"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"Daily_Ledger_Summary.csv\""))
                .andExpect(content().contentType("text/csv"))
                .andExpect(content().bytes(csvBytes));
    }

    @Test
    @DisplayName("GET /api/v1/reports/daily-ledger-summary/export with excel format should return Excel attachment")
    void exportDailyLedger_excel_shouldReturnExcelAttachment() throws Exception {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 30);
        byte[] excelBytes = new byte[]{0x50, 0x4B, 0x03, 0x04}; // zip header for xlsx

        when(reportService.exportDailyLedgerExcel(start, end, null)).thenReturn(excelBytes);

        mockMvc.perform(get("/api/v1/reports/daily-ledger-summary/export")
                        .param("startDate", "2026-09-01")
                        .param("endDate", "2026-09-30")
                        .param("format", "excel"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"Daily_Ledger_Summary.xlsx\""))
                .andExpect(content().contentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .andExpect(content().bytes(excelBytes));
    }

    @Test
    @DisplayName("GET /api/v1/reports/daily-ledger-summary/export with pdf format should return PDF attachment")
    void exportDailyLedger_pdf_shouldReturnPdfAttachment() throws Exception {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 30);
        byte[] pdfBytes = "%PDF-1.4\n".getBytes(StandardCharsets.US_ASCII);

        when(reportService.exportDailyLedgerPdf(start, end, null)).thenReturn(pdfBytes);

        mockMvc.perform(get("/api/v1/reports/daily-ledger-summary/export")
                        .param("startDate", "2026-09-01")
                        .param("endDate", "2026-09-30")
                        .param("format", "pdf"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"Daily_Ledger_Summary.pdf\""))
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(pdfBytes));
    }

    // -------------------------------------------------------------------------
    // 2. Account Status Summary Endpoints
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/v1/reports/account-status-summary should return 200 and report JSON")
    void getAccountStatusSummary_shouldReturnOkAndObject() throws Exception {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 30);

        AccountStatusReportDTO reportDto = AccountStatusReportDTO.builder()
                .statusSummaries(List.of(
                        AccountStatusSummaryDTO.builder()
                                .accountStatus("ACTIVE")
                                .accountCount(300L)
                                .newAccountsInRange(10L)
                                .avgBalance(new BigDecimal("25000.00"))
                                .minBalance(new BigDecimal("500.00"))
                                .maxBalance(new BigDecimal("1000000.00"))
                                .build()
                ))
                .bracketDistribution(List.of(
                        BalanceBracketDTO.builder()
                                .balanceBracket("0 - 10,000")
                                .bracketCount(50L)
                                .bracketTotalBalance(new BigDecimal("200000.00"))
                                .accountStatus("ACTIVE")
                                .build()
                ))
                .build();

        when(reportService.getAccountStatusSummary(start, end, "ACTIVE")).thenReturn(reportDto);

        mockMvc.perform(get("/api/v1/reports/account-status-summary")
                        .param("startDate", "2026-09-01")
                        .param("endDate", "2026-09-30")
                        .param("accountStatus", "ACTIVE"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.statusSummaries", hasSize(1)))
                .andExpect(jsonPath("$.statusSummaries[0].accountStatus", is("ACTIVE")))
                .andExpect(jsonPath("$.bracketDistribution", hasSize(1)))
                .andExpect(jsonPath("$.bracketDistribution[0].balanceBracket", is("0 - 10,000")));
    }

    @Test
    @DisplayName("GET /api/v1/reports/account-status-summary/export should return requested format")
    void exportAccountStatus_shouldReturnAttachment() throws Exception {
        LocalDate start = LocalDate.of(2026, 9, 1);
        LocalDate end = LocalDate.of(2026, 9, 30);
        byte[] csvBytes = "Status,Count\nACTIVE,300\n".getBytes(StandardCharsets.UTF_8);

        when(reportService.exportAccountStatusCsv(start, end, null)).thenReturn(csvBytes);

        mockMvc.perform(get("/api/v1/reports/account-status-summary/export")
                        .param("startDate", "2026-09-01")
                        .param("endDate", "2026-09-30")
                        .param("format", "csv"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"Account_Status_Summary.csv\""))
                .andExpect(content().contentType("text/csv"));
    }

    // -------------------------------------------------------------------------
    // 3. Audit Trail Logs Endpoints
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/v1/reports/audit-trail-logs should return 200 and page JSON")
    void getAuditTrailLogs_shouldReturnOkAndPageJson() throws Exception {
        AuditTrailPageDTO pageDto = AuditTrailPageDTO.builder()
                .logs(List.of(
                        AuditTrailLogDTO.builder()
                                .logId("1")
                                .actorType("STAFF")
                                .staffId("STF-001")
                                .staffUsername("admin")
                                .actionType("CREATE_ACCOUNT")
                                .description("Created account")
                                .createdAt(LocalDateTime.of(2026, 9, 15, 12, 0))
                                .build()
                ))
                .totalCount(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();

        when(reportService.getAuditTrailLog(eq("STF-001"), eq("CREATE_ACCOUNT"), any(), any(), eq("ACC-01"), eq(1), eq(20)))
                .thenReturn(pageDto);

        mockMvc.perform(get("/api/v1/reports/audit-trail-logs")
                        .param("staffId", "STF-001")
                        .param("actionType", "CREATE_ACCOUNT")
                        .param("startDate", "2026-09-01T00:00:00")
                        .param("endDate", "2026-09-30T23:59:59")
                        .param("accountNo", "ACC-01")
                        .param("page", "1")
                        .param("pageSize", "20"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.totalCount", is(1)))
                .andExpect(jsonPath("$.logs", hasSize(1)))
                .andExpect(jsonPath("$.logs[0].actionType", is("CREATE_ACCOUNT")))
                .andExpect(jsonPath("$.logs[0].staffUsername", is("admin")));
    }

    @Test
    @DisplayName("GET /api/v1/reports/audit-trail-logs/export should return attachment")
    void exportAuditTrailLogs_shouldReturnAttachment() throws Exception {
        byte[] csvBytes = "Log ID,Action\n1,CREATE_ACCOUNT\n".getBytes(StandardCharsets.UTF_8);

        when(reportService.exportAuditTrailCsv(any(), any(), any(), any(), any(), eq(1), eq(1000)))
                .thenReturn(csvBytes);

        mockMvc.perform(get("/api/v1/reports/audit-trail-logs/export")
                        .param("format", "csv"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"Audit_Trail_Log.csv\""))
                .andExpect(content().contentType("text/csv"));
    }
}
