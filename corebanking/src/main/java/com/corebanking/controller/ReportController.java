package com.corebanking.controller;

import java.util.concurrent.CompletableFuture;
import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AuditTrailPageDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import com.corebanking.dto.FeeRevenueReportDTO;
import com.corebanking.dto.LargeTransactionReportDTO;
import com.corebanking.dto.TransactionDetailPageDTO;
import com.corebanking.dto.TransactionDetailReportDTO;
import com.corebanking.dto.ExportJobResponseDTO;
import com.corebanking.dto.ExportJobStatus;
import com.corebanking.service.ReportExportJobService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import com.corebanking.service.ReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/**
 * ReportController — Group 2 Reporting Subsystem.
 * Exposes REST endpoints under /api/v1/reports/**
 */
@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportService reportService;
    private final ReportExportJobService reportExportJobService;

    public ReportController(ReportService reportService, ReportExportJobService reportExportJobService) {
        this.reportService = reportService;
        this.reportExportJobService = reportExportJobService;
    }

    // -------------------------------------------------------
    // 1. Daily Ledger Summary
    // -------------------------------------------------------

    @GetMapping("/daily-ledger-summary")
    public ResponseEntity<List<DailyLedgerSummaryDTO>> getDailyLedgerSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status) {

        List<DailyLedgerSummaryDTO> data = reportService.getDailyLedgerSummary(startDate, endDate, status);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/daily-ledger-summary/export")
    public ResponseEntity<byte[]> exportDailyLedgerSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "csv") String format) throws IOException {

        return switch (format.toLowerCase()) {
            case "excel", "xlsx" -> {
                byte[] bytes = reportService.exportDailyLedgerExcel(startDate, endDate, status);
                yield buildResponse(bytes, "Daily_Ledger_Summary.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            }
            case "pdf" -> {
                byte[] bytes = reportService.exportDailyLedgerPdf(startDate, endDate, status);
                yield buildResponse(bytes, "Daily_Ledger_Summary.pdf", "application/pdf");
            }
            default -> {
                byte[] bytes = reportService.exportDailyLedgerCsv(startDate, endDate, status);
                yield buildResponse(bytes, "Daily_Ledger_Summary.csv", "text/csv");
            }
        };
    }

    // -------------------------------------------------------
    // 2. Account Status Summary
    // -------------------------------------------------------

    @GetMapping("/account-status-summary")
    public ResponseEntity<AccountStatusReportDTO> getAccountStatusSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String accountStatus) {

        AccountStatusReportDTO data = reportService.getAccountStatusSummary(startDate, endDate, accountStatus);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/account-status-summary/export")
    public ResponseEntity<byte[]> exportAccountStatusSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String accountStatus,
            @RequestParam(defaultValue = "csv") String format) throws IOException {

        return switch (format.toLowerCase()) {
            case "excel", "xlsx" -> {
                byte[] bytes = reportService.exportAccountStatusExcel(startDate, endDate, accountStatus);
                yield buildResponse(bytes, "Account_Status_Summary.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            }
            case "pdf" -> {
                byte[] bytes = reportService.exportAccountStatusPdf(startDate, endDate, accountStatus);
                yield buildResponse(bytes, "Account_Status_Summary.pdf", "application/pdf");
            }
            default -> {
                byte[] bytes = reportService.exportAccountStatusCsv(startDate, endDate, accountStatus);
                yield buildResponse(bytes, "Account_Status_Summary.csv", "text/csv");
            }
        };
    }

    // -------------------------------------------------------
    // 3. Audit Trail Logs
    // -------------------------------------------------------

    @GetMapping("/audit-trail-logs")
    public ResponseEntity<AuditTrailPageDTO> getAuditTrailLogs(
            @RequestParam(required = false) String staffId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String accountNo,
            @RequestParam(defaultValue = "1")  int page,
            @RequestParam(defaultValue = "20") int pageSize) {

        AuditTrailPageDTO data = reportService.getAuditTrailLog(
                staffId, actionType, startDate, endDate, accountNo, page, pageSize);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/audit-trail-logs/export")
    public ResponseEntity<byte[]> exportAuditTrailLogs(
            @RequestParam(required = false) String staffId,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime startDate,
            @RequestParam(required = false)
                @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime endDate,
            @RequestParam(required = false) String accountNo,
            @RequestParam(defaultValue = "1")    int page,
            @RequestParam(defaultValue = "1000") int pageSize,
            @RequestParam(defaultValue = "csv")  String format) throws IOException {

        return switch (format.toLowerCase()) {
            case "excel", "xlsx" -> {
                byte[] bytes = reportService.exportAuditTrailExcel(
                        staffId, actionType, startDate, endDate, accountNo, page, pageSize);
                yield buildResponse(bytes, "Audit_Trail_Log.xlsx",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            }
            case "pdf" -> {
                byte[] bytes = reportService.exportAuditTrailPdf(
                        staffId, actionType, startDate, endDate, accountNo, page, pageSize);
                yield buildResponse(bytes, "Audit_Trail_Log.pdf", "application/pdf");
            }
            default -> {
                byte[] bytes = reportService.exportAuditTrailCsv(
                        staffId, actionType, startDate, endDate, accountNo, page, pageSize);
                yield buildResponse(bytes, "Audit_Trail_Log.csv", "text/csv");
            }
        };
    }

    // -------------------------------------------------------
    // 4. Large Transaction & AML Report
    // -------------------------------------------------------

    @GetMapping("/large-transactions")
    public ResponseEntity<LargeTransactionReportDTO> getLargeTransactions(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) BigDecimal threshold,
            @RequestParam(required = false) String transactionType,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int pageSize) {

        return ResponseEntity.ok(reportService.getLargeTransactionSummaryPaged(
                startDate, endDate, threshold, transactionType, page, pageSize));
    }

    @GetMapping("/large-transactions/export")
    public ResponseEntity<byte[]> exportLargeTransactions(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) BigDecimal threshold,
            @RequestParam(required = false) String transactionType,
            @RequestParam(defaultValue = "csv") String format) throws IOException {

        return switch (format.toLowerCase()) {
            case "excel", "xlsx" -> buildResponse(
                    reportService.exportLargeTransactionExcel(startDate, endDate, threshold, transactionType),
                    "Large_Transactions_AML.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            case "pdf" -> buildResponse(
                    reportService.exportLargeTransactionPdf(startDate, endDate, threshold, transactionType),
                    "Large_Transactions_AML.pdf",
                    "application/pdf");
            default -> buildResponse(
                    reportService.exportLargeTransactionCsv(startDate, endDate, threshold, transactionType),
                    "Large_Transactions_AML.csv",
                    "text/csv");
        };
    }

    // -------------------------------------------------------
    // 5. Fee & Revenue Breakdown
    // -------------------------------------------------------

    @GetMapping("/fee-revenue")
    public ResponseEntity<FeeRevenueReportDTO> getFeeRevenueSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String channel) {

        return ResponseEntity.ok(reportService.getFeeRevenueSummary(startDate, endDate, channel));
    }

    @GetMapping("/fee-revenue/export")
    public ResponseEntity<byte[]> exportFeeRevenueSummary(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String channel,
            @RequestParam(defaultValue = "csv") String format) throws IOException {

        return switch (format.toLowerCase()) {
            case "excel", "xlsx" -> buildResponse(
                    reportService.exportFeeRevenueExcel(startDate, endDate, channel),
                    "Fee_Revenue_Report.xlsx",
                    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            case "pdf" -> buildResponse(
                    reportService.exportFeeRevenuePdf(startDate, endDate, channel),
                    "Fee_Revenue_Report.pdf",
                    "application/pdf");
            default -> buildResponse(
                    reportService.exportFeeRevenueCsv(startDate, endDate, channel),
                    "Fee_Revenue_Report.csv",
                    "text/csv");
        };
    }

    // -------------------------------------------------------
    // Private helper
    // -------------------------------------------------------

    // -------------------------------------------------------
    // 6. Transaction Detail Report
    // -------------------------------------------------------

    @GetMapping("/transaction-detail")
    public ResponseEntity<TransactionDetailPageDTO> getTransactionDetails(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String transactionType,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "30") int pageSize) {

        TransactionDetailPageDTO data = reportService.getTransactionDetailsPaged(
                startDate, endDate, status, transactionType, channel, minAmount, maxAmount, page, pageSize);
        return ResponseEntity.ok(data);
    }

    @GetMapping("/transaction-detail/export")
    public CompletableFuture<ResponseEntity<byte[]>> exportTransactionDetails(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String transactionType,
            @RequestParam(required = false) String channel,
            @RequestParam(required = false) BigDecimal minAmount,
            @RequestParam(required = false) BigDecimal maxAmount,
            @RequestParam(defaultValue = "csv") String format) {

        return CompletableFuture.supplyAsync(() -> {
            try {
                return switch (format.toLowerCase()) {
                    case "excel", "xlsx" -> buildResponse(
                            reportService.exportTransactionDetailsExcel(startDate, endDate, status, transactionType, channel, minAmount, maxAmount),
                            "Transaction_Detail_Report.xlsx",
                            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                    case "pdf" -> buildResponse(
                            reportService.exportTransactionDetailsPdf(startDate, endDate, status, transactionType, channel, minAmount, maxAmount),
                            "Transaction_Detail_Report.pdf",
                            "application/pdf");
                    default -> buildResponse(
                            reportService.exportTransactionDetailsCsv(startDate, endDate, status, transactionType, channel, minAmount, maxAmount),
                            "Transaction_Detail_Report.csv",
                            "text/csv");
                };
            } catch (IOException e) {
                throw new RuntimeException("Export failed", e);
            }
        });
    }

    // -------------------------------------------------------
    // Private helper
    // -------------------------------------------------------

    private ResponseEntity<byte[]> buildResponse(byte[] body, String filename, String mediaType) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType(mediaType));
        headers.setContentDisposition(
                ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(body.length);
        return ResponseEntity.ok().headers(headers).body(body);
    }

    // -------------------------------------------------------
    // Enterprise Async Background Export Endpoints
    // -------------------------------------------------------

    @PostMapping("/export-async")
    public ResponseEntity<ExportJobResponseDTO> submitExportJob(
            @RequestParam(defaultValue = "TRANSACTION_DETAIL") String reportType,
            @RequestParam(defaultValue = "csv") String format,
            @RequestParam Map<String, String> allParams) {

        ExportJobResponseDTO job = reportExportJobService.submitExportJob(reportType, format, allParams);
        return ResponseEntity.accepted().body(job);
    }

    @GetMapping("/export-jobs/{jobId}")
    public ResponseEntity<ExportJobResponseDTO> getExportJobStatus(@PathVariable String jobId) {
        ExportJobResponseDTO job = reportExportJobService.getJobStatus(jobId);
        if (job == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(job);
    }

    @GetMapping("/export-jobs/{jobId}/download")
    public ResponseEntity<byte[]> downloadExportJob(@PathVariable String jobId) throws IOException {
        ExportJobResponseDTO job = reportExportJobService.getJobStatus(jobId);
        if (job == null || job.getStatus() != ExportJobStatus.COMPLETED) {
            return ResponseEntity.notFound().build();
        }
        byte[] bytes = reportExportJobService.getJobFile(jobId);
        String fileName = reportExportJobService.getJobFileName(jobId);
        String contentType = reportExportJobService.getJobContentType(jobId);
        return buildResponse(bytes, fileName, contentType);
    }
}
