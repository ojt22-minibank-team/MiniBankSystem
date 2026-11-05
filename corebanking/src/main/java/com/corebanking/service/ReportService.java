package com.corebanking.service;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AccountStatusSummaryDTO;
import com.corebanking.dto.AuditTrailLogDTO;
import com.corebanking.dto.AuditTrailPageDTO;
import com.corebanking.dto.BalanceBracketDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import com.corebanking.dto.FeeRevenueItemDTO;
import com.corebanking.dto.FeeRevenueReportDTO;
import com.corebanking.dto.LargeTransactionItemDTO;
import com.corebanking.dto.LargeTransactionReportDTO;
import com.corebanking.repository.FeeRevenueRepository;
import com.corebanking.repository.LargeTransactionRepository;
import com.corebanking.repository.ReportRepository;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
//import com.corebanking.service.JasperReportService;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Iterator;
import java.util.List;
import java.util.Map;

/**
 * ReportService — Group 2 Reporting Subsystem.
 * Handles report data fetching, streamed CSV / Excel exports, and JasperReports PDF exports.
 */
@Service
public class ReportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DT_FMT   = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ReportRepository reportRepository;
    private final JasperReportService jasperReportService;
    private final LargeTransactionRepository largeTransactionRepository;
    private final FeeRevenueRepository feeRevenueRepository;

    public ReportService(ReportRepository reportRepository,
                         JasperReportService jasperReportService,
                         LargeTransactionRepository largeTransactionRepository,
                         FeeRevenueRepository feeRevenueRepository) {
        this.reportRepository = reportRepository;
        this.jasperReportService = jasperReportService;
        this.largeTransactionRepository = largeTransactionRepository;
        this.feeRevenueRepository = feeRevenueRepository;
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
    // PDF Export helpers (JasperReports Engine)
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
    // Inject LargeTransactionRepository in constructor:
    // private final LargeTransactionRepository largeTransactionRepository;

    public LargeTransactionReportDTO getLargeTransactionSummary(
            LocalDate startDate, LocalDate endDate, BigDecimal threshold, String txType) {

        BigDecimal minAmount = (threshold != null && threshold.compareTo(BigDecimal.ZERO) > 0)
                ? threshold : new BigDecimal("10000000.00"); // Default 10M MMK

        List<LargeTransactionItemDTO> items = largeTransactionRepository.getLargeTransactions(
                startDate, endDate, minAmount, txType);

        BigDecimal totalVolume = BigDecimal.ZERO;
        for (LargeTransactionItemDTO item : items) {
            if (item.getAmount() != null) totalVolume = totalVolume.add(item.getAmount());
        }

        return LargeTransactionReportDTO.builder()
                .startDate(startDate)
                .endDate(endDate)
                .thresholdAmount(minAmount)
                .transactionType(txType != null && !txType.isBlank() ? txType : "ALL")
                .totalFlaggedCount((long) items.size())
                .totalFlaggedVolume(totalVolume)
                .items(items)
                .build();
    }

    public byte[] exportLargeTransactionPdf(
            LocalDate startDate, LocalDate endDate, BigDecimal threshold, String txType) {
        
        LargeTransactionReportDTO report = getLargeTransactionSummary(startDate, endDate, threshold, txType);
        Map<String, Object> params = new HashMap<>();
        params.put("StartDate", startDate.toString());
        params.put("EndDate", endDate.toString());
        params.put("Threshold", report.getThresholdAmount().toPlainString());
        params.put("TxType", report.getTransactionType());
        return jasperReportService.exportToPdf("reports/large_transaction_report.jrxml", report.getItems(), params);
    }

    public byte[] exportLargeTransactionCsv(
            LocalDate startDate, LocalDate endDate, BigDecimal threshold, String txType) {
        
        LargeTransactionReportDTO report = getLargeTransactionSummary(startDate, endDate, threshold, txType);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
            writer.println("Reference,Timestamp,Type,Channel,Amount,Source Acc,Source Name,Dest Acc,Dest Name,Risk");
            for (LargeTransactionItemDTO item : report.getItems()) {
                writer.printf("%s,%s,%s,%s,%.2f,%s,%s,%s,%s,%s%n",
                        item.getTransactionRef(),
                        item.getTransactionTime(),
                        item.getTransactionType(),
                        item.getChannel(),
                        item.getAmount(),
                        item.getSourceAccountNo(),
                        item.getSourceCustomerName(),
                        item.getDestAccountNo(),
                        item.getDestCustomerName(),
                        item.getRiskLevel());
            }
        }
        return out.toByteArray();
    }

    public byte[] exportLargeTransactionExcel(
            LocalDate startDate, LocalDate endDate, BigDecimal threshold, String txType) throws IOException {
        
        LargeTransactionReportDTO report = getLargeTransactionSummary(startDate, endDate, threshold, txType);
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Large Transactions AML");
            org.apache.poi.ss.usermodel.Row header = sheet.createRow(0);
            String[] cols = {"Tx Ref", "Timestamp", "Type", "Channel", "Amount", "Source Acc", "Source Customer", "Dest Acc", "Dest Customer", "Risk Level"};
            for (int i = 0; i < cols.length; i++) header.createCell(i).setCellValue(cols[i]);

            int rowIdx = 1;
            for (LargeTransactionItemDTO item : report.getItems()) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(item.getTransactionRef());
                row.createCell(1).setCellValue(item.getTransactionTime() != null ? item.getTransactionTime().toString() : "");
                row.createCell(2).setCellValue(item.getTransactionType());
                row.createCell(3).setCellValue(item.getChannel());
                row.createCell(4).setCellValue(item.getAmount().doubleValue());
                row.createCell(5).setCellValue(item.getSourceAccountNo());
                row.createCell(6).setCellValue(item.getSourceCustomerName());
                row.createCell(7).setCellValue(item.getDestAccountNo());
                row.createCell(8).setCellValue(item.getDestCustomerName());
                row.createCell(9).setCellValue(item.getRiskLevel());
            }
            for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        }
    }

    // -------------------------------------------------------
    // Fee & Revenue Breakdown
    // -------------------------------------------------------

    public FeeRevenueReportDTO getFeeRevenueSummary(LocalDate startDate, LocalDate endDate, String channel) {
        List<FeeRevenueItemDTO> items = feeRevenueRepository.getFeeRevenueData(startDate, endDate, channel);

        long grandTx = 0;
        BigDecimal grandVol = BigDecimal.ZERO;
        BigDecimal grandFee = BigDecimal.ZERO;

        for (FeeRevenueItemDTO item : items) {
            grandTx += item.getTransactionCount() != null ? item.getTransactionCount() : 0;
            if (item.getTotalVolume() != null) grandVol = grandVol.add(item.getTotalVolume());
            if (item.getTotalFeeRevenue() != null) grandFee = grandFee.add(item.getTotalFeeRevenue());
        }

        return FeeRevenueReportDTO.builder()
                .startDate(startDate)
                .endDate(endDate)
                .channel(channel != null && !channel.isBlank() ? channel : "ALL")
                .grandTotalTransactions(grandTx)
                .grandTotalVolume(grandVol)
                .grandTotalFeeRevenue(grandFee)
                .items(items)
                .build();
    }

    public byte[] exportFeeRevenuePdf(LocalDate startDate, LocalDate endDate, String channel) {
        FeeRevenueReportDTO report = getFeeRevenueSummary(startDate, endDate, channel);
        Map<String, Object> params = new HashMap<>();
        params.put("StartDate", startDate.toString());
        params.put("EndDate", endDate.toString());
        params.put("FilterChannel", report.getChannel());
        return jasperReportService.exportToPdf("reports/fee_revenue_report.jrxml", report.getItems(), params);
    }

    public byte[] exportFeeRevenueCsv(LocalDate startDate, LocalDate endDate, String channel) {
        FeeRevenueReportDTO report = getFeeRevenueSummary(startDate, endDate, channel);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PrintWriter writer = new PrintWriter(new OutputStreamWriter(out, StandardCharsets.UTF_8))) {
            writer.println("Transaction Type,Channel,Tx Count,Total Volume,Total Fee Revenue,Avg Fee Per Tx");
            for (FeeRevenueItemDTO item : report.getItems()) {
                writer.printf("%s,%s,%d,%.2f,%.2f,%.2f%n",
                        item.getTransactionType(),
                        item.getChannel(),
                        item.getTransactionCount(),
                        item.getTotalVolume(),
                        item.getTotalFeeRevenue(),
                        item.getAvgFeePerTx());
            }
        }
        return out.toByteArray();
    }

    public byte[] exportFeeRevenueExcel(LocalDate startDate, LocalDate endDate, String channel) throws IOException {
        FeeRevenueReportDTO report = getFeeRevenueSummary(startDate, endDate, channel);
        try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Fee Revenue");
            org.apache.poi.ss.usermodel.Row header = sheet.createRow(0);
            String[] cols = {"Transaction Type", "Channel", "Tx Count", "Total Volume", "Total Fee Revenue", "Avg Fee Per Tx"};
            for (int i = 0; i < cols.length; i++) header.createCell(i).setCellValue(cols[i]);

            int rowIdx = 1;
            for (FeeRevenueItemDTO item : report.getItems()) {
                org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
                row.createCell(0).setCellValue(item.getTransactionType());
                row.createCell(1).setCellValue(item.getChannel());
                row.createCell(2).setCellValue(item.getTransactionCount());
                row.createCell(3).setCellValue(item.getTotalVolume() != null ? item.getTotalVolume().doubleValue() : 0.0);
                row.createCell(4).setCellValue(item.getTotalFeeRevenue() != null ? item.getTotalFeeRevenue().doubleValue() : 0.0);
                row.createCell(5).setCellValue(item.getAvgFeePerTx() != null ? item.getAvgFeePerTx().doubleValue() : 0.0);
            }
            for (int i = 0; i < cols.length; i++) sheet.autoSizeColumn(i);
            workbook.write(out);
            return out.toByteArray();
        }
    }
}