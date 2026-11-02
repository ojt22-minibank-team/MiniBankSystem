package com.corebanking.service;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AuditTrailLogDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import net.sf.jasperreports.engine.*;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import net.sf.jasperreports.engine.export.JRCsvExporter;
import net.sf.jasperreports.engine.export.ooxml.JRXlsxExporter;
import net.sf.jasperreports.export.SimpleCsvExporterConfiguration;
import net.sf.jasperreports.export.SimpleExporterInput;
import net.sf.jasperreports.export.SimpleOutputStreamExporterOutput;
import net.sf.jasperreports.export.SimpleWriterExporterOutput;
import net.sf.jasperreports.export.SimpleXlsxReportConfiguration;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * JasperReportService handles compilation, caching, data-source binding,
 * and multi-format (PDF, Excel, CSV) generation using JasperReports 6.x.
 */
@Slf4j
@Service
public class JasperReportService {

    public static final String LOGO_PATH = "reports/assets/logo.png";
    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final Map<String, JasperReport> reportCache = new ConcurrentHashMap<>();
    private volatile byte[] cachedLogoBytes;

    @PostConstruct
    public void init() {
        loadAndCacheLogo();
    }

    /**
     * Loads the bank brand logo from classpath.
     */
    public synchronized void loadAndCacheLogo() {
        if (cachedLogoBytes != null) {
            return;
        }
        try {
            ClassPathResource resource = new ClassPathResource(LOGO_PATH);
            if (resource.exists()) {
                try (InputStream is = resource.getInputStream()) {
                    this.cachedLogoBytes = is.readAllBytes();
                    log.info("Loaded brand logo for reports: {} ({} bytes)", LOGO_PATH, cachedLogoBytes.length);
                }
            } else {
                log.warn("Brand logo not found on classpath: {}", LOGO_PATH);
            }
        } catch (Exception e) {
            log.warn("Could not load brand logo from classpath: {}. Proceeding without logo.", LOGO_PATH, e);
        }
    }

    /**
     * Compiles and caches a JRXML template by name.
     */
    public JasperReport getCompiledReport(String reportName) {
        String cleanName = reportName.replace("reports/", "").replace(".jrxml", "");
        return reportCache.computeIfAbsent(cleanName, name -> {
            String path = "reports/" + name + ".jrxml";
            log.info("Compiling JasperReports template: {}", path);
            try (InputStream in = new ClassPathResource(path).getInputStream()) {
                return JasperCompileManager.compileReport(in);
            } catch (Exception e) {
                log.error("Failed to compile JasperReport template: {}", path, e);
                throw new IllegalStateException("Could not load report template: " + name, e);
            }
        });
    }

    private void attachLogo(Map<String, Object> params) {
        if (cachedLogoBytes != null && cachedLogoBytes.length > 0) {
            params.put("LOGO", new ByteArrayInputStream(cachedLogoBytes));
            params.put("LogoPath", new ByteArrayInputStream(cachedLogoBytes));
        }
    }

    public byte[] exportToPdf(String reportPath, Collection<?> beanData, Map<String, Object> parameters) {
        try {
            JasperReport jasperReport = getCompiledReport(reportPath);
            Map<String, Object> params = (parameters != null) ? new HashMap<>(parameters) : new HashMap<>();
            attachLogo(params);
            Collection<?> data = (beanData != null) ? beanData : Collections.emptyList();
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(data);
            JasperPrint print = JasperFillManager.fillReport(jasperReport, params, dataSource);
            return exportToPdf(print);
        } catch (Exception e) {
            log.error("Error generating Jasper PDF report for {}", reportPath, e);
            throw new RuntimeException("Failed to generate PDF report for " + reportPath, e);
        }
    }

    // =========================================================================
    // 1. Daily Ledger Summary Report
    // =========================================================================

    public JasperPrint fillDailyLedgerReport(
            List<DailyLedgerSummaryDTO> data,
            LocalDate startDate,
            LocalDate endDate,
            String status) throws JRException {

        JasperReport jasperReport = getCompiledReport("daily_ledger_summary");

        Map<String, Object> params = new HashMap<>();
        params.put("reportTitle", "Daily Ledger Summary Report");
        params.put("period", (startDate != null ? startDate.format(DATE_FMT) : "")
                + " to " + (endDate != null ? endDate.format(DATE_FMT) : ""));
        params.put("statusFilter", status != null ? status : "");
        params.put("generatedAt", LocalDateTime.now().format(DT_FMT));
        attachLogo(params);

        List<DailyLedgerSummaryDTO> list = (data != null) ? data : Collections.emptyList();
        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(list);

        return JasperFillManager.fillReport(jasperReport, params, dataSource);
    }

    public byte[] generateDailyLedgerPdf(
            List<DailyLedgerSummaryDTO> data,
            LocalDate startDate,
            LocalDate endDate,
            String status) {
        try {
            JasperPrint print = fillDailyLedgerReport(data, startDate, endDate, status);
            return exportToPdf(print);
        } catch (Exception e) {
            log.error("Error generating Daily Ledger Jasper PDF report", e);
            throw new RuntimeException("Failed to generate Daily Ledger PDF report", e);
        }
    }

    // =========================================================================
    // 2. Account Status Summary Report
    // =========================================================================

    public JasperPrint fillAccountStatusReport(
            AccountStatusReportDTO data,
            LocalDate startDate,
            LocalDate endDate,
            String accountStatus) throws JRException {

        JasperReport masterReport = getCompiledReport("account_status_summary");
        JasperReport statusSubreport = getCompiledReport("account_status_subreport");
        JasperReport bracketSubreport = getCompiledReport("balance_bracket_subreport");

        Map<String, Object> params = new HashMap<>();
        params.put("reportTitle", "Account Status Summary Report");
        params.put("period", (startDate != null ? startDate.format(DATE_FMT) : "")
                + " to " + (endDate != null ? endDate.format(DATE_FMT) : ""));
        params.put("filterStatus", accountStatus != null ? accountStatus : "");
        params.put("generatedAt", LocalDateTime.now().format(DT_FMT));
        attachLogo(params);

        params.put("statusSubreport", statusSubreport);
        params.put("statusDataSource", new JRBeanCollectionDataSource(
                (data != null && data.getStatusSummaries() != null)
                        ? data.getStatusSummaries()
                        : Collections.emptyList()));

        params.put("bracketSubreport", bracketSubreport);
        params.put("bracketDataSource", new JRBeanCollectionDataSource(
                (data != null && data.getBracketDistribution() != null)
                        ? data.getBracketDistribution()
                        : Collections.emptyList()));

        return JasperFillManager.fillReport(masterReport, params, new JREmptyDataSource(1));
    }

    public byte[] generateAccountStatusPdf(
            AccountStatusReportDTO data,
            LocalDate startDate,
            LocalDate endDate,
            String accountStatus) {
        try {
            JasperPrint print = fillAccountStatusReport(data, startDate, endDate, accountStatus);
            return exportToPdf(print);
        } catch (Exception e) {
            log.error("Error generating Account Status Jasper PDF report", e);
            throw new RuntimeException("Failed to generate Account Status PDF report", e);
        }
    }

    // =========================================================================
    // 3. Audit Trail Logs Report
    // =========================================================================

    public JasperPrint fillAuditTrailReport(
            List<AuditTrailLogDTO> data,
            String staffId,
            String actionType,
            LocalDateTime startDate,
            LocalDateTime endDate,
            String accountNo) throws JRException {

        JasperReport jasperReport = getCompiledReport("audit_trail_log");

        StringBuilder filterBuilder = new StringBuilder();
        if (staffId != null && !staffId.isBlank()) {
            filterBuilder.append("Staff ID: ").append(staffId).append(" | ");
        }
        if (actionType != null && !actionType.isBlank()) {
            filterBuilder.append("Action: ").append(actionType).append(" | ");
        }
        if (accountNo != null && !accountNo.isBlank()) {
            filterBuilder.append("Account: ").append(accountNo).append(" | ");
        }
        if (startDate != null && endDate != null) {
            filterBuilder.append("Period: ").append(startDate.format(DT_FMT))
                    .append(" to ").append(endDate.format(DT_FMT));
        }

        Map<String, Object> params = new HashMap<>();
        params.put("reportTitle", "System Audit Trail Logs");
        params.put("filterInfo", filterBuilder.toString());
        params.put("generatedAt", LocalDateTime.now().format(DT_FMT));
        attachLogo(params);

        List<AuditTrailLogDTO> list = (data != null) ? data : Collections.emptyList();
        JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(list);

        return JasperFillManager.fillReport(jasperReport, params, dataSource);
    }

    public byte[] generateAuditTrailPdf(
            List<AuditTrailLogDTO> data,
            String staffId,
            String actionType,
            LocalDateTime startDate,
            LocalDateTime endDate,
            String accountNo) {
        try {
            JasperPrint print = fillAuditTrailReport(data, staffId, actionType, startDate, endDate, accountNo);
            return exportToPdf(print);
        } catch (Exception e) {
            log.error("Error generating Audit Trail Jasper PDF report", e);
            throw new RuntimeException("Failed to generate Audit Trail PDF report", e);
        }
    }

    // =========================================================================
    // Multi-Format Exporters
    // =========================================================================

    public byte[] exportToPdf(JasperPrint jasperPrint) throws JRException {
        return JasperExportManager.exportReportToPdf(jasperPrint);
    }

    public byte[] exportToXlsx(JasperPrint jasperPrint) throws JRException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            JRXlsxExporter exporter = new JRXlsxExporter();
            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            exporter.setExporterOutput(new SimpleOutputStreamExporterOutput(out));
            SimpleXlsxReportConfiguration config = new SimpleXlsxReportConfiguration();
            config.setOnePagePerSheet(false);
            config.setDetectCellType(true);
            config.setRemoveEmptySpaceBetweenRows(true);
            exporter.setConfiguration(config);
            exporter.exportReport();
            return out.toByteArray();
        } catch (Exception e) {
            throw new JRException("Failed to export Jasper report to Excel: " + e.getMessage(), e);
        }
    }

    public byte[] exportToCsv(JasperPrint jasperPrint) throws JRException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            JRCsvExporter exporter = new JRCsvExporter();
            exporter.setExporterInput(new SimpleExporterInput(jasperPrint));
            exporter.setExporterOutput(new SimpleWriterExporterOutput(out));
            SimpleCsvExporterConfiguration config = new SimpleCsvExporterConfiguration();
            config.setFieldDelimiter(",");
            exporter.setConfiguration(config);
            exporter.exportReport();
            return out.toByteArray();
        } catch (Exception e) {
            throw new JRException("Failed to export Jasper report to CSV: " + e.getMessage(), e);
        }
    }
}
