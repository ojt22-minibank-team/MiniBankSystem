package com.corebanking.controller;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AuditTrailPageDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * ReportController ? Group 2 Reporting Subsystem.
 * Exposes REST endpoints under /api/v1/reports/**
 */
@RestController
@RequestMapping("/api/v1/reports")
public class ReportController {

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
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
}
