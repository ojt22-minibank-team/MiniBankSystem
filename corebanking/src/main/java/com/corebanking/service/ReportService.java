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

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import java.awt.Color;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * ReportService ? Group 2 Reporting Subsystem.
 * Handles report data fetching and streamed CSV / Excel exports.
 */
@Service
public class ReportService {

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DT_FMT   = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final ReportRepository reportRepository;

    public ReportService(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
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
        sb.append("Log ID,Staff ID,Staff Username,Staff Full Name,Action Type,Entity Type,Entity ID,IP Address,Description,Created At\n");
        for (AuditTrailLogDTO r : page1.getLogs()) {
            sb.append(safe(r.getLogId())).append(',')
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
            String[] headers = {"Log ID","Staff ID","Username","Full Name","Action","Entity Type","Entity ID","IP Address","Description","Created At"};
            createHeaderRow(sheet, headers, headerStyle);

            int ri = 1;
            for (AuditTrailLogDTO r : pageData.getLogs()) {
                Row row = sheet.createRow(ri++);
                row.createCell(0).setCellValue(safe(r.getLogId()));
                row.createCell(1).setCellValue(safe(r.getStaffId()));
                row.createCell(2).setCellValue(safe(r.getStaffUsername()));
                row.createCell(3).setCellValue(safe(r.getStaffFullName()));
                row.createCell(4).setCellValue(safe(r.getActionType()));
                row.createCell(5).setCellValue(safe(r.getEntityType()));
                row.createCell(6).setCellValue(safe(r.getEntityId()));
                row.createCell(7).setCellValue(safe(r.getIpAddress()));
                row.createCell(8).setCellValue(safe(r.getDescription()));
                row.createCell(9).setCellValue(fmt(r.getCreatedAt()));
            }
            autoSizeColumns(sheet, headers.length);
            wb.write(out);
            return out.toByteArray();
        }
    }

    // -------------------------------------------------------
    // PDF Export helpers (OpenPDF)
    // -------------------------------------------------------

    public byte[] exportDailyLedgerPdf(
            LocalDate startDate, LocalDate endDate, String status) throws IOException {
        List<DailyLedgerSummaryDTO> rows = getDailyLedgerSummary(startDate, endDate, status);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(doc, out);
            doc.open();

            addPdfHeader(doc, "Daily Ledger Summary Report",
                    "Period: " + fmt(startDate) + " to " + fmt(endDate)
                            + (status != null && !status.isBlank() ? " | Status: " + status : ""));

            PdfPTable table = new PdfPTable(7);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{0.8f, 2.6f, 2.0f, 1.4f, 2.2f, 2.0f, 1.4f});
            table.setHeaderRows(1);

            String[] headers = {"No", "Transaction Type", "Date", "Count", "Total Amount", "Total Fee", "Currency"};
            for (String h : headers) {
                table.addCell(createPdfHeaderCell(h));
            }

            int count = 0;
            BigDecimal totalAmount = BigDecimal.ZERO;
            BigDecimal totalFee = BigDecimal.ZERO;
            int totalCount = 0;

            for (DailyLedgerSummaryDTO r : rows) {
                Color bg = (count % 2 == 1) ? new Color(248, 250, 252) : Color.WHITE;
                table.addCell(createPdfCell(String.valueOf(count + 1), bg, Element.ALIGN_CENTER));
                table.addCell(createPdfCell(safe(r.getTransactionType()), bg, Element.ALIGN_LEFT));
                table.addCell(createPdfCell(fmt(r.getReportDate()), bg, Element.ALIGN_LEFT));
                table.addCell(createPdfCell(String.valueOf(r.getTransactionCount()), bg, Element.ALIGN_RIGHT));
                table.addCell(createPdfCell(r.getTotalAmount() != null ? String.format("%,.2f", r.getTotalAmount()) : "0.00", bg, Element.ALIGN_RIGHT));
                table.addCell(createPdfCell(r.getTotalFee() != null ? String.format("%,.2f", r.getTotalFee()) : "0.00", bg, Element.ALIGN_RIGHT));
                table.addCell(createPdfCell(safe(r.getCurrency()), bg, Element.ALIGN_CENTER));

                if (r.getTotalAmount() != null) totalAmount = totalAmount.add(r.getTotalAmount());
                if (r.getTotalFee() != null) totalFee = totalFee.add(r.getTotalFee());
                totalCount += r.getTransactionCount();
                count++;
            }

            Color summaryBg = new Color(241, 245, 249);
            table.addCell(createPdfCellBold("-", summaryBg, Element.ALIGN_CENTER));
            table.addCell(createPdfCellBold("Total Summary", summaryBg, Element.ALIGN_LEFT));
            table.addCell(createPdfCellBold("-", summaryBg, Element.ALIGN_LEFT));
            table.addCell(createPdfCellBold(String.valueOf(totalCount), summaryBg, Element.ALIGN_RIGHT));
            table.addCell(createPdfCellBold(String.format("%,.2f", totalAmount), summaryBg, Element.ALIGN_RIGHT));
            table.addCell(createPdfCellBold(String.format("%,.2f", totalFee), summaryBg, Element.ALIGN_RIGHT));
            table.addCell(createPdfCellBold("-", summaryBg, Element.ALIGN_CENTER));

            doc.add(table);
            doc.close();
            return out.toByteArray();
        }
    }

    public byte[] exportAccountStatusPdf(
            LocalDate startDate, LocalDate endDate, String accountStatus) throws IOException {
        AccountStatusReportDTO report = getAccountStatusSummary(startDate, endDate, accountStatus);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(doc, out);
            doc.open();

            addPdfHeader(doc, "Account Status Summary Report",
                    "Period: " + fmt(startDate) + " to " + fmt(endDate)
                            + (accountStatus != null && !accountStatus.isBlank() ? " | Filter: " + accountStatus : ""));

            Paragraph s1Title = new Paragraph("1. Status Summary", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(30, 64, 175)));
            s1Title.setSpacingAfter(8);
            doc.add(s1Title);

            PdfPTable t1 = new PdfPTable(6);
            t1.setWidthPercentage(100);
            t1.setWidths(new float[]{2f, 1.8f, 1.8f, 2.2f, 2.2f, 2.2f});
            t1.setHeaderRows(1);
            for (String h : new String[]{"Status", "Total Accounts", "New In Range", "Avg Balance", "Min Balance", "Max Balance"}) {
                t1.addCell(createPdfHeaderCell(h));
            }
            int idx = 0;
            for (AccountStatusSummaryDTO r : report.getStatusSummaries()) {
                Color bg = (idx++ % 2 == 1) ? new Color(248, 250, 252) : Color.WHITE;
                t1.addCell(createPdfCell(safe(r.getAccountStatus()), bg, Element.ALIGN_LEFT));
                t1.addCell(createPdfCell(String.valueOf(r.getAccountCount()), bg, Element.ALIGN_RIGHT));
                t1.addCell(createPdfCell(String.valueOf(r.getNewAccountsInRange()), bg, Element.ALIGN_RIGHT));
                t1.addCell(createPdfCell(r.getAvgBalance() != null ? String.format("%,.2f", r.getAvgBalance()) : "0.00", bg, Element.ALIGN_RIGHT));
                t1.addCell(createPdfCell(r.getMinBalance() != null ? String.format("%,.2f", r.getMinBalance()) : "0.00", bg, Element.ALIGN_RIGHT));
                t1.addCell(createPdfCell(r.getMaxBalance() != null ? String.format("%,.2f", r.getMaxBalance()) : "0.00", bg, Element.ALIGN_RIGHT));
            }
            doc.add(t1);

            Paragraph s2Title = new Paragraph("2. Balance Bracket Distribution", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(30, 64, 175)));
            s2Title.setSpacingBefore(16);
            s2Title.setSpacingAfter(8);
            doc.add(s2Title);

            PdfPTable t2 = new PdfPTable(4);
            t2.setWidthPercentage(100);
            t2.setWidths(new float[]{3f, 2f, 2f, 3f});
            t2.setHeaderRows(1);
            for (String h : new String[]{"Balance Bracket", "Account Status", "Account Count", "Total Balance"}) {
                t2.addCell(createPdfHeaderCell(h));
            }
            idx = 0;
            for (BalanceBracketDTO b : report.getBracketDistribution()) {
                Color bg = (idx++ % 2 == 1) ? new Color(248, 250, 252) : Color.WHITE;
                t2.addCell(createPdfCell(safe(b.getBalanceBracket()), bg, Element.ALIGN_LEFT));
                t2.addCell(createPdfCell(safe(b.getAccountStatus()), bg, Element.ALIGN_LEFT));
                t2.addCell(createPdfCell(String.valueOf(b.getBracketCount()), bg, Element.ALIGN_RIGHT));
                t2.addCell(createPdfCell(b.getBracketTotalBalance() != null ? String.format("%,.2f", b.getBracketTotalBalance()) : "0.00", bg, Element.ALIGN_RIGHT));
            }
            doc.add(t2);

            doc.close();
            return out.toByteArray();
        }
    }

    public byte[] exportAuditTrailPdf(
            String staffId, String actionType,
            LocalDateTime startDate, LocalDateTime endDate,
            String accountNo, int page, int pageSize) throws IOException {
        AuditTrailPageDTO pageData = getAuditTrailLog(staffId, actionType, startDate, endDate, accountNo, page, pageSize);
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document doc = new Document(PageSize.A4.rotate(), 36, 36, 36, 36);
            PdfWriter.getInstance(doc, out);
            doc.open();

            addPdfHeader(doc, "System Audit Trail Logs",
                    "Generated on: " + LocalDateTime.now().format(DT_FMT)
                            + (staffId != null && !staffId.isBlank() ? " | Staff ID: " + staffId : "")
                            + (actionType != null && !actionType.isBlank() ? " | Action: " + actionType : "")
                            + (accountNo != null && !accountNo.isBlank() ? " | Account: " + accountNo : ""));

            PdfPTable table = new PdfPTable(8);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{2.2f, 2.0f, 2.0f, 1.8f, 1.8f, 1.8f, 1.8f, 3.5f});
            table.setHeaderRows(1);

            String[] headers = {"Timestamp", "Staff Username", "Full Name", "Action", "Entity Type", "Entity ID", "IP Address", "Description"};
            for (String h : headers) {
                table.addCell(createPdfHeaderCell(h));
            }

            int idx = 0;
            for (AuditTrailLogDTO r : pageData.getLogs()) {
                Color bg = (idx++ % 2 == 1) ? new Color(248, 250, 252) : Color.WHITE;
                table.addCell(createPdfCell(fmt(r.getCreatedAt()), bg, Element.ALIGN_LEFT));
                table.addCell(createPdfCell(safe(r.getStaffUsername()), bg, Element.ALIGN_LEFT));
                table.addCell(createPdfCell(safe(r.getStaffFullName()), bg, Element.ALIGN_LEFT));
                table.addCell(createPdfCell(safe(r.getActionType()), bg, Element.ALIGN_CENTER));
                table.addCell(createPdfCell(safe(r.getEntityType()), bg, Element.ALIGN_LEFT));
                table.addCell(createPdfCell(safe(r.getEntityId()), bg, Element.ALIGN_LEFT));
                table.addCell(createPdfCell(safe(r.getIpAddress()), bg, Element.ALIGN_LEFT));
                table.addCell(createPdfCell(safe(r.getDescription()), bg, Element.ALIGN_LEFT));
            }

            doc.add(table);
            doc.close();
            return out.toByteArray();
        }
    }

    private void addPdfHeader(Document doc, String title, String subtitle) {
        Paragraph titleP = new Paragraph(title, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(30, 64, 175)));
        titleP.setSpacingAfter(4);
        doc.add(titleP);

        if (subtitle != null && !subtitle.isBlank()) {
            Paragraph subP = new Paragraph(subtitle, FontFactory.getFont(FontFactory.HELVETICA, 9, new Color(100, 116, 139)));
            subP.setSpacingAfter(14);
            doc.add(subP);
        }
    }

    private PdfPCell createPdfHeaderCell(String text) {
        com.lowagie.text.Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE);
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(30, 64, 175));
        cell.setPadding(6);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
    }

    private PdfPCell createPdfCell(String text, Color bg, int alignment) {
        com.lowagie.text.Font font = FontFactory.getFont(FontFactory.HELVETICA, 8, new Color(51, 65, 85));
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setPadding(5);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
    }

    private PdfPCell createPdfCellBold(String text, Color bg, int alignment) {
        com.lowagie.text.Font font = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, new Color(15, 23, 42));
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(bg);
        cell.setPadding(5);
        cell.setHorizontalAlignment(alignment);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        return cell;
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
