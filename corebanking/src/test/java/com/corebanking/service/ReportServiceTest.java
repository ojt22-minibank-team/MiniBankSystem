package com.corebanking.service;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AccountStatusSummaryDTO;
import com.corebanking.dto.AuditTrailLogDTO;
import com.corebanking.dto.AuditTrailPageDTO;
import com.corebanking.dto.BalanceBracketDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import com.corebanking.repository.ReportRepository;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReportServiceTest {

    @Mock
    private ReportRepository reportRepository;

    @Mock
    private com.corebanking.repository.LargeTransactionRepository largeTransactionRepository;

    @Mock
    private com.corebanking.repository.FeeRevenueRepository feeRevenueRepository;

    @org.mockito.Spy
    private JasperReportService jasperReportService = new JasperReportService();

    @InjectMocks
    private ReportService reportService;

    private LocalDate startDate;
    private LocalDate endDate;
    private DailyLedgerSummaryDTO sampleLedgerDto;
    private AccountStatusReportDTO sampleAccountReportDto;
    private AuditTrailPageDTO sampleAuditPageDto;

    @BeforeEach
    void setUp() {
        startDate = LocalDate.of(2026, 9, 1);
        endDate = LocalDate.of(2026, 9, 30);

        sampleLedgerDto = DailyLedgerSummaryDTO.builder()
                .reportDate(LocalDate.of(2026, 9, 15))
                .transactionType("INTERNAL_TRANSFER")
                .transactionCount(120L)
                .totalAmount(new BigDecimal("1500000.00"))
                .totalFee(new BigDecimal("250.00"))
                .currency("MMK")
                .build();

        AccountStatusSummaryDTO statusSummary = AccountStatusSummaryDTO.builder()
                .accountStatus("ACTIVE")
                .accountCount(450L)
                .newAccountsInRange(25L)
                .avgBalance(new BigDecimal("50000.00"))
                .minBalance(new BigDecimal("1000.00"))
                .maxBalance(new BigDecimal("2000000.00"))
                .build();

        BalanceBracketDTO bracketDto = BalanceBracketDTO.builder()
                .balanceBracket("0 - 10,000")
                .accountStatus("ACTIVE")
                .bracketCount(100L)
                .bracketTotalBalance(new BigDecimal("500000.00"))
                .build();

        sampleAccountReportDto = AccountStatusReportDTO.builder()
                .statusSummaries(List.of(statusSummary))
                .bracketDistribution(List.of(bracketDto))
                .build();

        AuditTrailLogDTO auditLogDto = AuditTrailLogDTO.builder()
                .logId("1")
                .actorType("STAFF")
                .actionCategory("SECURITY")
                .staffId("STF-001")
                .staffUsername("admin_user")
                .staffFullName("Admin User")
                .actionType("LOGIN")
                .entityType("AUTH")
                .entityId("AUTH-001")
                .ipAddress("127.0.0.1")
                .description("Staff logged in successfully")
                .createdAt(LocalDateTime.of(2026, 9, 15, 10, 30, 0))
                .build();

        sampleAuditPageDto = AuditTrailPageDTO.builder()
                .logs(List.of(auditLogDto))
                .totalCount(1)
                .page(1)
                .pageSize(20)
                .totalPages(1)
                .build();
    }

    // -------------------------------------------------------------------------
    // 1. Daily Ledger Summary Tests
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("getDailyLedgerSummary should delegate to repository and return list")
    void getDailyLedgerSummary_shouldReturnRepositoryData() {
        when(reportRepository.getDailyLedgerSummary(startDate, endDate, "COMPLETED"))
                .thenReturn(List.of(sampleLedgerDto));

        List<DailyLedgerSummaryDTO> result = reportService.getDailyLedgerSummary(startDate, endDate, "COMPLETED");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTransactionType()).isEqualTo("INTERNAL_TRANSFER");
        assertThat(result.get(0).getTotalAmount()).isEqualTo(new BigDecimal("1500000.00"));
        verify(reportRepository).getDailyLedgerSummary(startDate, endDate, "COMPLETED");
    }

    @Test
    @DisplayName("exportDailyLedgerCsv should produce valid CSV with header and data rows")
    void exportDailyLedgerCsv_shouldGenerateValidCsv() throws IOException {
        when(reportRepository.getDailyLedgerSummary(startDate, endDate, null))
                .thenReturn(List.of(sampleLedgerDto));

        byte[] csvBytes = reportService.exportDailyLedgerCsv(startDate, endDate, null);

        assertThat(csvBytes).isNotEmpty();
        String csv = new String(csvBytes, StandardCharsets.UTF_8);
        assertThat(csv).contains("No,Transaction Type,Report Date,Count,Total Amount,Total Fee,Currency");
        assertThat(csv).contains("1,INTERNAL_TRANSFER,2026-09-15,120,1500000.00,250.00,MMK");
    }

    @Test
    @DisplayName("exportDailyLedgerExcel should produce valid Excel workbook with data")
    void exportDailyLedgerExcel_shouldGenerateValidWorkbook() throws IOException {
        when(reportRepository.getDailyLedgerSummary(startDate, endDate, null))
                .thenReturn(List.of(sampleLedgerDto));

        byte[] excelBytes = reportService.exportDailyLedgerExcel(startDate, endDate, null);

        assertThat(excelBytes).isNotEmpty();
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(excelBytes))) {
            Sheet sheet = wb.getSheet("Daily Ledger Summary");
            assertThat(sheet).isNotNull();
            assertThat(sheet.getRow(0).getCell(1).getStringCellValue()).isEqualTo("Transaction Type");
            assertThat(sheet.getRow(1).getCell(1).getStringCellValue()).isEqualTo("INTERNAL_TRANSFER");
        }
    }

    @Test
    @DisplayName("exportDailyLedgerPdf should produce valid PDF byte stream starting with %PDF-")
    void exportDailyLedgerPdf_shouldGenerateValidPdf() throws IOException {
        when(reportRepository.getDailyLedgerSummary(startDate, endDate, null))
                .thenReturn(List.of(sampleLedgerDto));

        byte[] pdfBytes = reportService.exportDailyLedgerPdf(startDate, endDate, null);

        assertThat(pdfBytes).isNotEmpty();
        String header = new String(pdfBytes, 0, 5, StandardCharsets.US_ASCII);
        assertThat(header).isEqualTo("%PDF-");
    }

    // -------------------------------------------------------------------------
    // 2. Account Status Summary Tests
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("getAccountStatusSummary should delegate to repository and return report")
    void getAccountStatusSummary_shouldReturnRepositoryData() {
        when(reportRepository.getAccountStatusSummary(startDate, endDate, "ACTIVE"))
                .thenReturn(sampleAccountReportDto);

        AccountStatusReportDTO result = reportService.getAccountStatusSummary(startDate, endDate, "ACTIVE");

        assertThat(result).isNotNull();
        assertThat(result.getStatusSummaries()).hasSize(1);
        assertThat(result.getStatusSummaries().get(0).getAccountStatus()).isEqualTo("ACTIVE");
        assertThat(result.getBracketDistribution()).hasSize(1);
        assertThat(result.getBracketDistribution().get(0).getBalanceBracket()).isEqualTo("0 - 10,000");
        verify(reportRepository).getAccountStatusSummary(startDate, endDate, "ACTIVE");
    }

    @Test
    @DisplayName("exportAccountStatusCsv should contain status breakdown and bracket distribution")
    void exportAccountStatusCsv_shouldGenerateValidCsv() throws IOException {
        when(reportRepository.getAccountStatusSummary(startDate, endDate, null))
                .thenReturn(sampleAccountReportDto);

        byte[] csvBytes = reportService.exportAccountStatusCsv(startDate, endDate, null);

        assertThat(csvBytes).isNotEmpty();
        String csv = new String(csvBytes, StandardCharsets.UTF_8);
        assertThat(csv).contains("Status,Account Count,New Accounts In Range,Avg Balance,Min Balance,Max Balance");
        assertThat(csv).contains("ACTIVE,450,25,50000.00,1000.00,2000000.00");
        assertThat(csv).contains("Balance Bracket,Account Status,Count,Total Balance");
        assertThat(csv).contains("0 - 10,000,ACTIVE,100,500000.00");
    }

    @Test
    @DisplayName("exportAccountStatusExcel should generate two sheets in workbook")
    void exportAccountStatusExcel_shouldGenerateTwoSheets() throws IOException {
        when(reportRepository.getAccountStatusSummary(startDate, endDate, null))
                .thenReturn(sampleAccountReportDto);

        byte[] excelBytes = reportService.exportAccountStatusExcel(startDate, endDate, null);

        assertThat(excelBytes).isNotEmpty();
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(excelBytes))) {
            assertThat(wb.getSheet("Status Summary")).isNotNull();
            assertThat(wb.getSheet("Balance Brackets")).isNotNull();
        }
    }

    @Test
    @DisplayName("exportAccountStatusPdf should produce valid PDF byte stream")
    void exportAccountStatusPdf_shouldGenerateValidPdf() throws IOException {
        when(reportRepository.getAccountStatusSummary(startDate, endDate, null))
                .thenReturn(sampleAccountReportDto);

        byte[] pdfBytes = reportService.exportAccountStatusPdf(startDate, endDate, null);

        assertThat(pdfBytes).isNotEmpty();
        String header = new String(pdfBytes, 0, 5, StandardCharsets.US_ASCII);
        assertThat(header).isEqualTo("%PDF-");
    }

    // -------------------------------------------------------------------------
    // 3. Audit Trail Logs Tests
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("getAuditTrailLog should delegate to repository with correct pagination")
    void getAuditTrailLog_shouldReturnRepositoryData() {
        LocalDateTime startDt = LocalDateTime.of(2026, 9, 1, 0, 0);
        LocalDateTime endDt = LocalDateTime.of(2026, 9, 30, 23, 59);

        when(reportRepository.getAuditTrailLog("STF-001", "LOGIN", startDt, endDt, "ACC-01", 1, 20))
                .thenReturn(sampleAuditPageDto);

        AuditTrailPageDTO result = reportService.getAuditTrailLog(
                "STF-001", "LOGIN", startDt, endDt, "ACC-01", 1, 20);

        assertThat(result).isNotNull();
        assertThat(result.getLogs()).hasSize(1);
        assertThat(result.getTotalCount()).isEqualTo(1);
        assertThat(result.getLogs().get(0).getActionType()).isEqualTo("LOGIN");
        verify(reportRepository).getAuditTrailLog("STF-001", "LOGIN", startDt, endDt, "ACC-01", 1, 20);
    }

    @Test
    @DisplayName("exportAuditTrailCsv should generate CSV with headers and audit row")
    void exportAuditTrailCsv_shouldGenerateValidCsv() throws IOException {
        when(reportRepository.getAuditTrailLog(any(), any(), any(), any(), any(), eq(1), eq(100)))
                .thenReturn(sampleAuditPageDto);

        byte[] csvBytes = reportService.exportAuditTrailCsv(null, null, null, null, null, 1, 100);

        assertThat(csvBytes).isNotEmpty();
        String csv = new String(csvBytes, StandardCharsets.UTF_8);
        assertThat(csv).contains("Log ID,Actor Type,Category,Staff ID,Staff Username,Staff Full Name,Action Type,Entity Type,Entity ID,IP Address,Description,Created At");
        assertThat(csv).contains("1,STAFF,SECURITY,STF-001,admin_user,Admin User,LOGIN,AUTH,AUTH-001,127.0.0.1,Staff logged in successfully,2026-09-15 10:30:00");
    }

    @Test
    @DisplayName("exportAuditTrailExcel should produce workbook with sheet 'Audit Trail'")
    void exportAuditTrailExcel_shouldGenerateValidExcel() throws IOException {
        when(reportRepository.getAuditTrailLog(any(), any(), any(), any(), any(), eq(1), eq(100)))
                .thenReturn(sampleAuditPageDto);

        byte[] excelBytes = reportService.exportAuditTrailExcel(null, null, null, null, null, 1, 100);

        assertThat(excelBytes).isNotEmpty();
        try (Workbook wb = new XSSFWorkbook(new ByteArrayInputStream(excelBytes))) {
            Sheet sheet = wb.getSheet("Audit Trail");
            assertThat(sheet).isNotNull();
            assertThat(sheet.getRow(0).getCell(0).getStringCellValue()).isEqualTo("Log ID");
            assertThat(sheet.getRow(1).getCell(4).getStringCellValue()).isEqualTo("admin_user");
        }
    }

    @Test
    @DisplayName("exportAuditTrailPdf should produce valid PDF byte stream")
    void exportAuditTrailPdf_shouldGenerateValidPdf() throws IOException {
        when(reportRepository.getAuditTrailLog(any(), any(), any(), any(), any(), eq(1), eq(100)))
                .thenReturn(sampleAuditPageDto);

        byte[] pdfBytes = reportService.exportAuditTrailPdf(null, null, null, null, null, 1, 100);

        assertThat(pdfBytes).isNotEmpty();
        String header = new String(pdfBytes, 0, 5, StandardCharsets.US_ASCII);
        assertThat(header).isEqualTo("%PDF-");
    }
}
