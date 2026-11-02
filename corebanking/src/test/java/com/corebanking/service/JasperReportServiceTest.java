package com.corebanking.service;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AccountStatusSummaryDTO;
import com.corebanking.dto.AuditTrailLogDTO;
import com.corebanking.dto.BalanceBracketDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import com.corebanking.dto.FeeRevenueItemDTO;
import com.corebanking.dto.LargeTransactionItemDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class JasperReportServiceTest {

    private JasperReportService jasperReportService;

    @BeforeEach
    void setUp() {
        jasperReportService = new JasperReportService();
    }

    @Test
    @DisplayName("Should compile and generate Daily Ledger Summary PDF using JasperReports")
    void testDailyLedgerPdfGeneration() {
        DailyLedgerSummaryDTO dto = DailyLedgerSummaryDTO.builder()
                .reportDate(LocalDate.of(2026, 9, 15))
                .transactionType("INTERNAL_TRANSFER")
                .transactionCount(120L)
                .totalAmount(new BigDecimal("1500000.00"))
                .totalFee(new BigDecimal("250.00"))
                .currency("MMK")
                .build();

        byte[] pdfBytes = jasperReportService.generateDailyLedgerPdf(
                List.of(dto),
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 9, 30),
                "COMPLETED");

        assertThat(pdfBytes).isNotEmpty();
        String header = new String(pdfBytes, 0, 5, StandardCharsets.US_ASCII);
        assertThat(header).isEqualTo("%PDF-");
    }

    @Test
    @DisplayName("Should compile and generate Account Status Summary PDF using JasperReports")
    void testAccountStatusPdfGeneration() {
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

        AccountStatusReportDTO reportDto = AccountStatusReportDTO.builder()
                .statusSummaries(List.of(statusSummary))
                .bracketDistribution(List.of(bracketDto))
                .build();

        byte[] pdfBytes = jasperReportService.generateAccountStatusPdf(
                reportDto,
                LocalDate.of(2026, 9, 1),
                LocalDate.of(2026, 9, 30),
                "ACTIVE");

        assertThat(pdfBytes).isNotEmpty();
        String header = new String(pdfBytes, 0, 5, StandardCharsets.US_ASCII);
        assertThat(header).isEqualTo("%PDF-");
    }

    @Test
    @DisplayName("Should compile and generate Audit Trail Log PDF using JasperReports")
    void testAuditTrailPdfGeneration() {
        AuditTrailLogDTO auditDto = AuditTrailLogDTO.builder()
                .logId("LOG-001")
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

        byte[] pdfBytes = jasperReportService.generateAuditTrailPdf(
                List.of(auditDto),
                "STF-001",
                "LOGIN",
                LocalDateTime.of(2026, 9, 1, 0, 0),
                LocalDateTime.of(2026, 9, 30, 23, 59),
                "ACC-001");

        assertThat(pdfBytes).isNotEmpty();
        String header = new String(pdfBytes, 0, 5, StandardCharsets.US_ASCII);
        assertThat(header).isEqualTo("%PDF-");
    }

    @Test
    @DisplayName("Should compile and generate Fee Revenue Report PDF using JasperReports")
    void testFeeRevenuePdfGeneration() {
        FeeRevenueItemDTO feeDto = FeeRevenueItemDTO.builder()
                .transactionType("INTERNAL_TRANSFER")
                .channel("MOBILE")
                .transactionCount(150L)
                .totalVolume(new BigDecimal("25000000.00"))
                .totalFeeRevenue(new BigDecimal("150000.00"))
                .avgFeePerTx(new BigDecimal("1000.00"))
                .build();

        byte[] pdfBytes = jasperReportService.exportToPdf(
                "reports/fee_revenue_report.jrxml",
                List.of(feeDto),
                java.util.Map.of(
                        "StartDate", "2026-09-01",
                        "EndDate", "2026-09-30",
                        "FilterChannel", "MOBILE"
                ));

        assertThat(pdfBytes).isNotEmpty();
        String header = new String(pdfBytes, 0, 5, StandardCharsets.US_ASCII);
        assertThat(header).isEqualTo("%PDF-");
    }

    @Test
    @DisplayName("Should compile and generate Large Transaction AML Report PDF using JasperReports")
    void testLargeTransactionPdfGeneration() {
        LargeTransactionItemDTO item = LargeTransactionItemDTO.builder()
                .transactionRef("TX-AML-999")
                .transactionTime(LocalDateTime.of(2026, 9, 20, 14, 0))
                .transactionType("OTC_DEPOSIT")
                .channel("BRANCH")
                .amount(new BigDecimal("50000000.00"))
                .currency("MMK")
                .sourceAccountNo("ACC-111")
                .sourceCustomerName("U Ba")
                .destAccountNo("ACC-222")
                .destCustomerName("Daw Mya")
                .riskLevel("HIGH RISK")
                .build();

        byte[] pdfBytes = jasperReportService.exportToPdf(
                "reports/large_transaction_report.jrxml",
                List.of(item),
                java.util.Map.of(
                        "StartDate", "2026-09-01",
                        "EndDate", "2026-09-30",
                        "Threshold", "10000000",
                        "TxType", "OTC_DEPOSIT"
                ));

        assertThat(pdfBytes).isNotEmpty();
        String header = new String(pdfBytes, 0, 5, StandardCharsets.US_ASCII);
        assertThat(header).isEqualTo("%PDF-");
    }
}
