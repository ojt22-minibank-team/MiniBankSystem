package com.corebanking.service;

import com.corebanking.dto.AccountStatusReportDTO;
import com.corebanking.dto.AuditTrailLogDTO;
import com.corebanking.dto.DailyLedgerSummaryDTO;
import net.sf.jasperreports.engine.JREmptyDataSource;
import net.sf.jasperreports.engine.JasperCompileManager;
import net.sf.jasperreports.engine.JasperExportManager;
import net.sf.jasperreports.engine.JasperFillManager;
import net.sf.jasperreports.engine.JasperPrint;
import net.sf.jasperreports.engine.JasperReport;
import net.sf.jasperreports.engine.data.JRBeanCollectionDataSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * JasperReportService handles compilation, caching, data-source binding,
 * and PDF generation using JasperReports.
 */
@Service
public class JasperReportService {

    private static final Logger log = LoggerFactory.getLogger(JasperReportService.class);

    private static final DateTimeFormatter DATE_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DT_FMT = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    private final Map<String, JasperReport> reportCache = new ConcurrentHashMap<>();

    /**
     * Compiles and caches a JRXML template by name.
     *
     * @param reportName name of the template without extension (located under /reports/)
     * @return compiled JasperReport
     */
    public JasperReport getCompiledReport(String reportName) {
        return reportCache.computeIfAbsent(reportName, name -> {
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

    /**
     * Generates PDF for Daily Ledger Summary report using JasperReports.
     */
    public byte[] generateDailyLedgerPdf(
            List<DailyLedgerSummaryDTO> data,
            LocalDate startDate,
            LocalDate endDate,
            String status) {

        try {
            JasperReport jasperReport = getCompiledReport("daily_ledger_summary");

            Map<String, Object> params = new HashMap<>();
            params.put("reportTitle", "Daily Ledger Summary Report");
            params.put("period", (startDate != null ? startDate.format(DATE_FMT) : "")
                    + " to " + (endDate != null ? endDate.format(DATE_FMT) : ""));
            params.put("statusFilter", status != null ? status : "");
            params.put("generatedAt", LocalDateTime.now().format(DT_FMT));

            List<DailyLedgerSummaryDTO> list = (data != null) ? data : Collections.emptyList();
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(list);

            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, dataSource);
            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (Exception e) {
            log.error("Error generating Daily Ledger Jasper report", e);
            throw new RuntimeException("Failed to generate Daily Ledger PDF report", e);
        }
    }

    /**
     * Generates PDF for Account Status Summary report using JasperReports (with subreports).
     */
    public byte[] generateAccountStatusPdf(
            AccountStatusReportDTO data,
            LocalDate startDate,
            LocalDate endDate,
            String accountStatus) {

        try {
            JasperReport masterReport = getCompiledReport("account_status_summary");
            JasperReport statusSubreport = getCompiledReport("account_status_subreport");
            JasperReport bracketSubreport = getCompiledReport("balance_bracket_subreport");

            Map<String, Object> params = new HashMap<>();
            params.put("reportTitle", "Account Status Summary Report");
            params.put("period", (startDate != null ? startDate.format(DATE_FMT) : "")
                    + " to " + (endDate != null ? endDate.format(DATE_FMT) : ""));
            params.put("filterStatus", accountStatus != null ? accountStatus : "");
            params.put("generatedAt", LocalDateTime.now().format(DT_FMT));

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

            JasperPrint jasperPrint = JasperFillManager.fillReport(
                    masterReport, params, new JREmptyDataSource(1));
            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (Exception e) {
            log.error("Error generating Account Status Jasper report", e);
            throw new RuntimeException("Failed to generate Account Status PDF report", e);
        }
    }

    /**
     * Generates PDF for Audit Trail Logs report using JasperReports.
     */
    public byte[] generateAuditTrailPdf(
            List<AuditTrailLogDTO> data,
            String staffId,
            String actionType,
            LocalDateTime startDate,
            LocalDateTime endDate,
            String accountNo) {

        try {
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

            List<AuditTrailLogDTO> list = (data != null) ? data : Collections.emptyList();
            JRBeanCollectionDataSource dataSource = new JRBeanCollectionDataSource(list);

            JasperPrint jasperPrint = JasperFillManager.fillReport(jasperReport, params, dataSource);
            return JasperExportManager.exportReportToPdf(jasperPrint);
        } catch (Exception e) {
            log.error("Error generating Audit Trail Jasper report", e);
            throw new RuntimeException("Failed to generate Audit Trail PDF report", e);
        }
    }
}
