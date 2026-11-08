package com.corebanking.service;

import com.corebanking.dto.ExportJobResponseDTO;
import com.corebanking.dto.ExportJobStatus;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Stream;

@Slf4j
@Service
@RequiredArgsConstructor
public class ReportExportJobService {

    private final ReportService reportService;

    private final Map<String, JobRecord> jobStore = new ConcurrentHashMap<>();

    private final Path exportStorageDir = Paths.get(System.getProperty("java.io.tmpdir"), "cb-report-exports");

    @Data
    @Builder
    private static class JobRecord {
        private String jobId;
        private String reportType;
        private String format;
        private ExportJobStatus status;
        private int progress;
        private String fileName;
        private Path filePath;
        private String contentType;
        private String errorMessage;
        private LocalDateTime createdAt;
        private LocalDateTime completedAt;
        private Map<String, String> params;
    }

    /**
     * Submit a new background export job for ANY of the 6 reports.
     * Returns immediately with PENDING status.
     */
    public ExportJobResponseDTO submitExportJob(
            String reportType,
            String format,
            Map<String, String> allParams) {

        String safeReportType = (reportType == null || reportType.isBlank()) ? "TRANSACTION_DETAIL" : reportType.toUpperCase();
        String safeFormat = (format == null || format.isBlank()) ? "csv" : format.toLowerCase();

        String jobId = "exp_" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        String ext = safeFormat.equalsIgnoreCase("excel") || safeFormat.equalsIgnoreCase("xlsx") ? "xlsx"
                : safeFormat.equalsIgnoreCase("pdf") ? "pdf" : "csv";

        String rawDatePrefix = allParams.getOrDefault("startDate", LocalDate.now().toString());
        String datePrefix = rawDatePrefix.replaceAll("[:\\\\/*?\"<>|]", "_");
        String fileName = safeReportType.toLowerCase() + "_" + datePrefix + "." + ext;

        String contentType = switch (ext) {
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            case "pdf" -> "application/pdf";
            default -> "text/csv";
        };

        JobRecord record = JobRecord.builder()
                .jobId(jobId)
                .reportType(safeReportType)
                .format(safeFormat)
                .status(ExportJobStatus.PENDING)
                .progress(0)
                .fileName(fileName)
                .contentType(contentType)
                .createdAt(LocalDateTime.now())
                .params(allParams)
                .build();

        jobStore.put(jobId, record);
        log.info("Submitted export job {} for report {} in format {}", jobId, safeReportType, safeFormat);

        // Process in background worker thread
        ClassLoader appClassLoader = getClass().getClassLoader();
        CompletableFuture.runAsync(() -> {
            ClassLoader originalCl = Thread.currentThread().getContextClassLoader();
            try {
                Thread.currentThread().setContextClassLoader(appClassLoader);
                processExportAsync(jobId);
            } finally {
                Thread.currentThread().setContextClassLoader(originalCl);
            }
        });

        return toDto(record);
    }

    /**
     * Background async execution of the export job across all 6 report types.
     */
    @Async
    public void processExportAsync(String jobId) {
        JobRecord record = jobStore.get(jobId);
        if (record == null) return;

        record.setStatus(ExportJobStatus.PROCESSING);
        record.setProgress(15);

        try {
            Files.createDirectories(exportStorageDir);
            record.setProgress(30);

            byte[] fileBytes;
            String fmt = record.getFormat();
            String reportType = record.getReportType();
            Map<String, String> p = record.getParams();

            switch (reportType) {
                case "DAILY_LEDGER" -> {
                    LocalDate start = parseDate(p.get("startDate"));
                    LocalDate end = parseDate(p.get("endDate"));
                    String st = p.get("status");
                    if ("excel".equalsIgnoreCase(fmt) || "xlsx".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportDailyLedgerExcel(start, end, st);
                    } else if ("pdf".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportDailyLedgerPdf(start, end, st);
                    } else {
                        fileBytes = reportService.exportDailyLedgerCsv(start, end, st);
                    }
                }
                case "ACCOUNT_STATUS" -> {
                    LocalDate start = parseDate(p.get("startDate"));
                    LocalDate end = parseDate(p.get("endDate"));
                    String st = p.get("accountStatus");
                    if (st == null) st = p.get("status");
                    if ("excel".equalsIgnoreCase(fmt) || "xlsx".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportAccountStatusExcel(start, end, st);
                    } else if ("pdf".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportAccountStatusPdf(start, end, st);
                    } else {
                        fileBytes = reportService.exportAccountStatusCsv(start, end, st);
                    }
                }
                case "AUDIT_TRAIL" -> {
                    String staffId = p.get("staffId");
                    String actionType = p.get("actionType");
                    LocalDateTime start = parseDateTime(p.get("startDate"), false);
                    LocalDateTime end = parseDateTime(p.get("endDate"), true);
                    String accountNo = p.get("accountNo");
                    int page = parseInt(p.get("page"), 1);
                    int pageSize = parseInt(p.get("pageSize"), 1000);
                    if ("excel".equalsIgnoreCase(fmt) || "xlsx".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportAuditTrailExcel(staffId, actionType, start, end, accountNo, page, pageSize);
                    } else if ("pdf".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportAuditTrailPdf(staffId, actionType, start, end, accountNo, page, pageSize);
                    } else {
                        fileBytes = reportService.exportAuditTrailCsv(staffId, actionType, start, end, accountNo, page, pageSize);
                    }
                }
                case "FEE_REVENUE" -> {
                    LocalDate start = parseDate(p.get("startDate"));
                    LocalDate end = parseDate(p.get("endDate"));
                    String channel = p.get("channel");
                    if ("excel".equalsIgnoreCase(fmt) || "xlsx".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportFeeRevenueExcel(start, end, channel);
                    } else if ("pdf".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportFeeRevenuePdf(start, end, channel);
                    } else {
                        fileBytes = reportService.exportFeeRevenueCsv(start, end, channel);
                    }
                }
                case "LARGE_TRANSACTIONS", "LARGE_TRANSACTION" -> {
                    LocalDate start = parseDate(p.get("startDate"));
                    LocalDate end = parseDate(p.get("endDate"));
                    BigDecimal threshold = parseBigDecimal(p.get("threshold"));
                    String txType = p.get("transactionType");
                    if ("excel".equalsIgnoreCase(fmt) || "xlsx".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportLargeTransactionExcel(start, end, threshold, txType);
                    } else if ("pdf".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportLargeTransactionPdf(start, end, threshold, txType);
                    } else {
                        fileBytes = reportService.exportLargeTransactionCsv(start, end, threshold, txType);
                    }
                }
                default -> { // TRANSACTION_DETAIL
                    LocalDate start = parseDate(p.get("startDate"));
                    LocalDate end = parseDate(p.get("endDate"));
                    String st = p.get("status");
                    String txType = p.get("transactionType");
                    String channel = p.get("channel");
                    BigDecimal min = parseBigDecimal(p.get("minAmount"));
                    BigDecimal max = parseBigDecimal(p.get("maxAmount"));
                    if ("excel".equalsIgnoreCase(fmt) || "xlsx".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportTransactionDetailsExcel(start, end, st, txType, channel, min, max);
                    } else if ("pdf".equalsIgnoreCase(fmt)) {
                        fileBytes = reportService.exportTransactionDetailsPdf(start, end, st, txType, channel, min, max);
                    } else {
                        fileBytes = reportService.exportTransactionDetailsCsv(start, end, st, txType, channel, min, max);
                    }
                }
            }

            record.setProgress(85);

            String safeDiskFileName = (jobId + "_" + record.getFileName()).replaceAll("[:\\\\/*?\"<>|]", "_");
            Path targetPath = exportStorageDir.resolve(safeDiskFileName);
            Files.write(targetPath, fileBytes);

            record.setFilePath(targetPath);
            record.setStatus(ExportJobStatus.COMPLETED);
            record.setProgress(100);
            record.setCompletedAt(LocalDateTime.now());
            log.info("Export job {} ({}) completed successfully. Saved to {}", jobId, reportType, targetPath);

        } catch (Throwable ex) {
            log.error("Failed to process export job {}: {}", jobId, ex.getMessage(), ex);
            record.setStatus(ExportJobStatus.FAILED);
            record.setErrorMessage(ex.getMessage() != null ? ex.getMessage() : "Export processing failed");
            record.setCompletedAt(LocalDateTime.now());
        }
    }

    public ExportJobResponseDTO getJobStatus(String jobId) {
        JobRecord record = jobStore.get(jobId);
        return record != null ? toDto(record) : null;
    }

    public byte[] getJobFile(String jobId) throws IOException {
        JobRecord record = jobStore.get(jobId);
        if (record == null || record.getStatus() != ExportJobStatus.COMPLETED || record.getFilePath() == null) {
            throw new IllegalArgumentException("Export job is not completed or not found: " + jobId);
        }
        return Files.readAllBytes(record.getFilePath());
    }

    public String getJobFileName(String jobId) {
        JobRecord record = jobStore.get(jobId);
        return record != null ? record.getFileName() : "export_file";
    }

    public String getJobContentType(String jobId) {
        JobRecord record = jobStore.get(jobId);
        return record != null ? record.getContentType() : "application/octet-stream";
    }

    /**
     * Periodic background auto-cleanup task running every hour.
     * Purges temporary export files on disk and evicts jobs from memory older than 2 hours.
     * Also scans physical storage to clean up any orphaned files across server restarts.
     */
    @Scheduled(fixedRate = 3600000)
    public void cleanupOldExports() {
        log.info("Starting scheduled auto-cleanup for expired export jobs and files...");
        LocalDateTime cutoff = LocalDateTime.now().minusHours(2);
        long cutoffEpochMillis = System.currentTimeMillis() - (2L * 3600 * 1000);
        AtomicInteger memoryCleaned = new AtomicInteger(0);
        AtomicInteger diskCleaned = new AtomicInteger(0);

        // 1. Evict from in-memory jobStore and delete tracked files
        jobStore.entrySet().removeIf(entry -> {
            JobRecord job = entry.getValue();
            if (job.getCreatedAt() != null && job.getCreatedAt().isBefore(cutoff)) {
                if (job.getFilePath() != null) {
                    try {
                        if (Files.deleteIfExists(job.getFilePath())) {
                            diskCleaned.incrementAndGet();
                        }
                    } catch (IOException e) {
                        log.warn("Failed to delete expired export file: {}", job.getFilePath(), e);
                    }
                }
                memoryCleaned.incrementAndGet();
                return true;
            }
            return false;
        });

        // 2. Scan physical disk directory to purge orphaned files (e.g. across server restarts)
        if (Files.exists(exportStorageDir)) {
            try (Stream<Path> stream = Files.list(exportStorageDir)) {
                stream.forEach(file -> {
                    try {
                        if (Files.isRegularFile(file) && Files.getLastModifiedTime(file).toMillis() < cutoffEpochMillis) {
                            if (Files.deleteIfExists(file)) {
                                diskCleaned.incrementAndGet();
                            }
                        }
                    } catch (IOException e) {
                        log.warn("Failed to check/delete orphan export file: {}", file, e);
                    }
                });
            } catch (IOException e) {
                log.warn("Failed to scan export storage directory for cleanup: {}", exportStorageDir, e);
            }
        }

        log.info("Auto-cleanup completed: evicted {} memory records, removed {} expired files on disk.",
                memoryCleaned.get(), diskCleaned.get());
    }

    private LocalDate parseDate(String val) {
        if (val == null || val.isBlank()) return null;
        try {
            return LocalDate.parse(val.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private LocalDateTime parseDateTime(String val, boolean isEndOfDay) {
        if (val == null || val.isBlank()) return null;
        try {
            if (val.trim().length() == 10) {
                LocalDate d = LocalDate.parse(val.trim());
                return isEndOfDay ? d.atTime(23, 59, 59) : d.atStartOfDay();
            }
            return LocalDateTime.parse(val.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private int parseInt(String val, int defaultVal) {
        if (val == null || val.isBlank()) return defaultVal;
        try {
            return Integer.parseInt(val.trim());
        } catch (Exception e) {
            return defaultVal;
        }
    }

    private BigDecimal parseBigDecimal(String val) {
        if (val == null || val.isBlank()) return null;
        try {
            return new BigDecimal(val.trim());
        } catch (Exception e) {
            return null;
        }
    }

    private ExportJobResponseDTO toDto(JobRecord record) {
        String downloadUrl = record.getStatus() == ExportJobStatus.COMPLETED
                ? "/api/v1/reports/export-jobs/" + record.getJobId() + "/download"
                : null;

        return ExportJobResponseDTO.builder()
                .jobId(record.getJobId())
                .reportType(record.getReportType())
                .format(record.getFormat())
                .status(record.getStatus())
                .progress(record.getProgress())
                .fileName(record.getFileName())
                .downloadUrl(downloadUrl)
                .errorMessage(record.getErrorMessage())
                .createdAt(record.getCreatedAt())
                .completedAt(record.getCompletedAt())
                .build();
    }
}
