package com.corebanking.service;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AccountStatusSummaryDTO;
import com.corebanking.dto.AuditTrailLogDTO;
import com.corebanking.dto.AuditTrailPageDTO;
import com.corebanking.dto.BalanceBracketDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import com.corebanking.repository.ReportRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * ReportService ? Group 2 Reporting Subsystem.
 * Handles report data fetching, streamed CSV / Excel exports, and JasperReports PDF exports.
 */
@Service
public class ReportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DT_FMT   = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ReportRepository reportRepository;
    private final JasperReportService jasperReportService;

    public ReportService(ReportRepository reportRepository, JasperReportService jasperReportService) {
        this.reportRepository = reportRepository;
        this.jasperReportService = jasperReportService;
    }

    // -------------------------------------------------------
    // Data methods
    // -------------------------------------------------------

    public List<DailyLedgerSummaryDTO> getDailyLedgerSummary(
            LocalDate startDate, LocalDate endDate, String status) {
        return reportRepository.getDailyLedgerSummary(startDate, endDate, status);
    }

    public AccountStatusReportDTO getAccountStatusSummary(
            LocalDate startDate, LocalDate endDate, String accountStatus) {
        return reportRepository.getAccountStatusSummary(startDate, endDate, accountStatus);
    }

    public AuditTrailPageDTO getAuditTrailLog(
            String staffId, String actionType,
            LocalDateTime startDate, LocalDateTime endDate,
            String accountNo, int page, int pageSize) {
        return reportRepository.getAuditTrailLog(
                staffId, actionType, startDate, endDate, accountNo, page, pageSize);
    }

    // -------------------------------------------------------
    // CSV Export helpers
    // -------------------------------------------------------

    public byte[] exportDailyLedgerCsv(
            LocalDate startDate, LocalDate endDate, String status) throws IOException {
        List<DailyLedgerSummaryDTO> rows = getDailyLedgerSummary(startDate, endDate, status);
        StringBuilder sb = new StringBuilder();
        sb.append("No,Transaction Type,Report Date,Count,Total Amount,Total Fee,Currency\n");
        int no = 1;
        for (DailyLedgerSummaryDTO r : rows) {
            sb.append(no++).append(',')
              .append(safe(r.getTransactionType())).append(',')
              .append(fmt(r.getReportDate())).append(',')
              .append(r.getTransactionCount()).append(',')
              .append(safe(r.getTotalAmount())).append(',')
              .append(safe(r.getTotalFee())).append(',')
              .append(safe(r.getCurrency())).append('\n');
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    public byte[] exportAccountStatusCsv(
            LocalDate startDate, LocalDate endDate, String accountStatus) throws IOException {
        AccountStatusReportDTO report = getAccountStatusSummary(startDate, endDate, accountStatus);
        StringBuilder sb = new StringBuilder();
        sb.append("Status,Account Count,New Accounts In Range,Avg Balance,Min Balance,Max Balance\n");
        for (AccountStatusSummaryDTO r : report.getStatusSummaries()) {
            sb.append(safe(r.getAccountStatus())).append(',')
              .append(r.getAccountCount()).append(',')
              .append(r.getNewAccountsInRange()).append(',')
              .append(safe(r.getAvgBalance())).append(',')
              .append(safe(r.getMinBalance())).append(',')
              .append(safe(r.getMaxBalance())).append('\n');
        }
        sb.append("\nBalance Bracket,Account Status,Count,Total Balance\n");
        for (BalanceBracketDTO b : report.getBracketDistribution()) {
            sb.append(safe(b.getBalanceBracket())).append(',')
              .append(safe(b.getAccountStatus())).append(',')
              .append(b.getBracketCount()).append(',')
              .append(safe(b.getBracketTotalBalance())).append('\n');
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    public byte[] exportAuditTrailCsv(
            String staffId, String actionType,
            LocalDateTime startDate, LocalDateTime endDate,
            String accountNo, int page, int pageSize) throws IOException {
        AuditTrailPageDTO page1 = getAuditTrailLog(staffId, actionType, startDate, endDate, accountNo, page, pageSize);
        StringBuilder sb = new StringBuilder();
        sb.append("Log ID,Actor Type,Category,Staff ID,Staff Username,Staff Full Name,Action Type,Entity Type,Entity ID,IP Address,Description,Created At\n");
        for (AuditTrailLogDTO r : page1.getLogs()) {
            sb.append(safe(r.getLogId())).append(',')
              .append(safe(r.getActorType())).append(',')
              .append(safe(r.getActionCategory())).append(',')
              .append(safe(r.getStaffId())).append(',')
              .append(safe(r.getStaffUsername())).append(',')
              .append(safe(r.getStaffFullName())).append(',')
              .append(safe(r.getActionType())).append(',')
              .append(safe(r.getEntityType())).append(',')
              .append(safe(r.getEntityId())).append(',')
              .append(safe(r.getIpAddress())).append(',')
              .append(csvEscape(r.getDescription())).append(',')
              .append(fmt(r.getCreatedAt())).append('\n');
        }
        return sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    // -------------------------------------------------------
    // Excel Export helpers (Apache POI)
    // -------------------------------------------------------

    public byte[] exportDailyLedgerExcel(
            LocalDate startDate, LocalDate endDate, String status) throws IOException {
        List<DailyLedgerSummaryDTO> rows = getDailyLedgerSummary(startDate, endDate, status);
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Daily Ledger Summary");
            CellStyle headerStyle = buildHeaderStyle(wb);

            String[] headers = {"No","Transaction Type","Report Date","Count","Total Amount","Total Fee","Currency"};
            createHeaderRow(sheet, headers, headerStyle);

            int rowIdx = 1;
            for (DailyLedgerSummaryDTO r : rows) {
                Row row = sheet.createRow(rowIdx);
                row.createCell(0).setCellValue(rowIdx);
                row.createCell(1).setCellValue(safe(r.getTransactionType()));
                row.createCell(2).setCellValue(fmt(r.getReportDate()));
                row.createCell(3).setCellValue(r.getTransactionCount());
                row.createCell(4).setCellValue(r.getTotalAmount() != null ? r.getTotalAmount().doubleValue() : 0);
                row.createCell(5).setCellValue(r.getTotalFee()    != null ? r.getTotalFee().doubleValue()    : 0);
                row.createCell(6).setCellValue(safe(r.getCurrency()));
                rowIdx++;
            }
            autoSizeColumns(sheet, headers.length);
            wb.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportAccountStatusExcel(
            LocalDate startDate, LocalDate endDate, String accountStatus) throws IOException {
        AccountStatusReportDTO report = getAccountStatusSummary(startDate, endDate, accountStatus);
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            CellStyle headerStyle = buildHeaderStyle(wb);

            Sheet s1 = wb.createSheet("Status Summary");
            createHeaderRow(s1, new String[]{"Status","Account Count","New In Range","Avg Balance","Min Balance","Max Balance"}, headerStyle);
            int ri = 1;
            for (AccountStatusSummaryDTO r : report.getStatusSummaries()) {
                Row row = s1.createRow(ri++);
                row.createCell(0).setCellValue(safe(r.getAccountStatus()));
                row.createCell(1).setCellValue(r.getAccountCount());
                row.createCell(2).setCellValue(r.getNewAccountsInRange());
                row.createCell(3).setCellValue(dbl(r.getAvgBalance()));
                row.createCell(4).setCellValue(dbl(r.getMinBalance()));
                row.createCell(5).setCellValue(dbl(r.getMaxBalance()));
            }
            autoSizeColumns(s1, 6);

            Sheet s2 = wb.createSheet("Balance Brackets");
            createHeaderRow(s2, new String[]{"Bracket","Status","Count","Total Balance"}, headerStyle);
            ri = 1;
            for (BalanceBracketDTO b : report.getBracketDistribution()) {
                Row row = s2.createRow(ri++);
                row.createCell(0).setCellValue(safe(b.getBalanceBracket()));
                row.createCell(1).setCellValue(safe(b.getAccountStatus()));
                row.createCell(2).setCellValue(b.getBracketCount());
                row.createCell(3).setCellValue(dbl(b.getBracketTotalBalance()));
            }
            autoSizeColumns(s2, 4);

            wb.write(out);
            return out.toByteArray();
        }
    }

    public byte[] exportAuditTrailExcel(
            String staffId, String actionType,
            LocalDateTime startDate, LocalDateTime endDate,
            String accountNo, int page, int pageSize) throws IOException {
        AuditTrailPageDTO pageData = getAuditTrailLog(staffId, actionType, startDate, endDate, accountNo, page, pageSize);
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = wb.createSheet("Audit Trail");
            CellStyle headerStyle = buildHeaderStyle(wb);
            String[] headers = {"Log ID","Actor Type","Category","Staff ID","Username","Full Name","Action","Entity Type","Entity ID","IP Address","Description","Created At"};
            createHeaderRow(sheet, headers, headerStyle);

            int ri = 1;
            for (AuditTrailLogDTO r : pageData.getLogs()) {
                Row row = sheet.createRow(ri++);
                row.createCell(0).setCellValue(safe(r.getLogId()));
                row.createCell(1).setCellValue(safe(r.getActorType()));
                row.createCell(2).setCellValue(safe(r.getActionCategory()));
                row.createCell(3).setCellValue(safe(r.getStaffId()));
                row.createCell(4).setCellValue(safe(r.getStaffUsername()));
                row.createCell(5).setCellValue(safe(r.getStaffFullName()));
                row.createCell(6).setCellValue(safe(r.getActionType()));
                row.createCell(7).setCellValue(safe(r.getEntityType()));
                row.createCell(8).setCellValue(safe(r.getEntityId()));
                row.createCell(9).setCellValue(safe(r.getIpAddress()));
                row.createCell(10).setCellValue(safe(r.getDescription()));
                row.createCell(11).setCellValue(fmt(r.getCreatedAt()));
            }
            autoSizeColumns(sheet, headers.length);
            wb.write(out);
            return out.toByteArray();
        }
    }

    // -------------------------------------------------------
    // PDF Export helpers (JasperReports)
    // -------------------------------------------------------

    public byte[] exportDailyLedgerPdf(
            LocalDate startDate, LocalDate endDate, String status) throws IOException {
        List<DailyLedgerSummaryDTO> rows = getDailyLedgerSummary(startDate, endDate, status);
        return jasperReportService.generateDailyLedgerPdf(rows, startDate, endDate, status);
    }

    public byte[] exportAccountStatusPdf(
            LocalDate startDate, LocalDate endDate, String accountStatus) throws IOException {
        AccountStatusReportDTO report = getAccountStatusSummary(startDate, endDate, accountStatus);
        return jasperReportService.generateAccountStatusPdf(report, startDate, endDate, accountStatus);
    }

    public byte[] exportAuditTrailPdf(
            String staffId, String actionType,
            LocalDateTime startDate, LocalDateTime endDate,
            String accountNo, int page, int pageSize) throws IOException {
        AuditTrailPageDTO pageData = getAuditTrailLog(staffId, actionType, startDate, endDate, accountNo, page, pageSize);
        return jasperReportService.generateAuditTrailPdf(
                pageData.getLogs(), staffId, actionType, startDate, endDate, accountNo);
    }

    // -------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------

    private CellStyle buildHeaderStyle(Workbook wb) {
        CellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(true);
        style.setFont(font);
        style.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
        style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        Font headerFont = wb.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        style.setFont(headerFont);
        return style;
    }

    private void createHeaderRow(Sheet sheet, String[] headers, CellStyle style) {
        Row headerRow = sheet.createRow(0);
        for (int i = 0; i < headers.length; i++) {
            Cell cell = headerRow.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(style);
        }
    }

    private void autoSizeColumns(Sheet sheet, int count) {
        for (int i = 0; i < count; i++) {
            sheet.autoSizeColumn(i);
        }
    }

    private String safe(Object val) {
        return val == null ? "" : val.toString();
    }

    private double dbl(BigDecimal bd) {
        return bd == null ? 0.0 : bd.doubleValue();
    }

    private String fmt(LocalDate d) {
        return d == null ? "" : d.format(DATE_FMT);
    }

    private String fmt(LocalDateTime dt) {
        return dt == null ? "" : dt.format(DT_FMT);
    }

    private String csvEscape(String val) {
        if (val == null) return "";
        if (val.contains(",") || val.contains("\"") || val.contains("\n")) {
            return "\"" + val.replace("\"", "\"\"") + "\"";
        }
        return val;
    }
}
