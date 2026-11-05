package com.corebanking.controller;

import com.corebanking.dto.CusAccountStatementDTO;
import com.corebanking.service.AuditTrailService;
import com.corebanking.service.CusAccountStatementCsvService;
import com.corebanking.service.CusAccountStatementPdfService;
import com.corebanking.service.CusAccountStatementService;
import com.corebanking.util.DataMaskingUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.Map;

/**
 * Controller for G1 Customer Portal Account Statements.
 * Exposes authenticated endpoints to download PDF and CSV statements
 * under the /api/customer security boundary.
 */
@Slf4j
@RestController
@RequestMapping("/api/customer/account-statements")
@RequiredArgsConstructor
public class CusAccountStatementController {

    private final CusAccountStatementService statementService;
    private final CusAccountStatementPdfService pdfService;
    private final CusAccountStatementCsvService csvService;
    private final AuditTrailService auditTrailService;

    /**
     * Download customer account statement as PDF.
     *
     * @param accountNumber The customer's account number
     * @param fromDate      Statement start date (YYYY-MM-DD)
     * @param toDate        Statement end date (YYYY-MM-DD)
     * @return PDF binary stream with attachment headers
     */
    @GetMapping("/pdf")
    public ResponseEntity<byte[]> downloadPdfStatement(
            @RequestParam("accountNumber") String accountNumber,
            @RequestParam("fromDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam("toDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        log.info("Requesting PDF account statement for account: {}, from: {}, to: {}",
                accountNumber, fromDate, toDate);

        CusAccountStatementDTO statement = statementService.getAccountStatement(accountNumber, fromDate, toDate);
        byte[] pdfBytes = pdfService.generateAccountStatementPdf(statement);

        try {
            String maskedAccount = DataMaskingUtil.maskAccountNumber(accountNumber);
            Map<String, Object> metadata = Map.of(
                    "fromDate", fromDate.toString(),
                    "toDate", toDate.toString(),
                    "result", "SUCCESS"
            );
            auditTrailService.logDataChange(
                    "REPORTING",
                    "ACCOUNT_STATEMENT_PDF_DOWNLOAD",
                    "ACCOUNT",
                    maskedAccount,
                    null,
                    metadata,
                    "Account statement PDF downloaded successfully for account " + maskedAccount
            );
        } catch (Exception ex) {
            log.error("Failed to log audit event ACCOUNT_STATEMENT_PDF_DOWNLOAD for account: {}",
                    DataMaskingUtil.maskAccountNumber(accountNumber), ex);
        }

        String filename = buildFilename(accountNumber, fromDate, toDate, "pdf");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PDF);
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(pdfBytes.length);
        headers.set(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate");
        headers.set(HttpHeaders.PRAGMA, "no-cache");
        headers.set(HttpHeaders.EXPIRES, "0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(pdfBytes);
    }

    /**
     * Download customer account statement as CSV.
     *
     * @param accountNumber The customer's account number
     * @param fromDate      Statement start date (YYYY-MM-DD)
     * @param toDate        Statement end date (YYYY-MM-DD)
     * @return CSV binary stream encoded in UTF-8 with attachment headers
     */
    @GetMapping("/csv")
    public ResponseEntity<byte[]> downloadCsvStatement(
            @RequestParam("accountNumber") String accountNumber,
            @RequestParam("fromDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam("toDate") @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate) {

        log.info("Requesting CSV account statement for account: {}, from: {}, to: {}",
                accountNumber, fromDate, toDate);

        CusAccountStatementDTO statement = statementService.getAccountStatement(accountNumber, fromDate, toDate);
        byte[] csvBytes = csvService.generateAccountStatementCsv(statement);

        try {
            String maskedAccount = DataMaskingUtil.maskAccountNumber(accountNumber);
            Map<String, Object> metadata = Map.of(
                    "fromDate", fromDate.toString(),
                    "toDate", toDate.toString(),
                    "result", "SUCCESS"
            );
            auditTrailService.logDataChange(
                    "REPORTING",
                    "ACCOUNT_STATEMENT_CSV_DOWNLOAD",
                    "ACCOUNT",
                    maskedAccount,
                    null,
                    metadata,
                    "Account statement CSV downloaded successfully for account " + maskedAccount
            );
        } catch (Exception ex) {
            log.error("Failed to log audit event ACCOUNT_STATEMENT_CSV_DOWNLOAD for account: {}",
                    DataMaskingUtil.maskAccountNumber(accountNumber), ex);
        }

        String filename = buildFilename(accountNumber, fromDate, toDate, "csv");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.parseMediaType("text/csv; charset=UTF-8"));
        headers.setContentDisposition(ContentDisposition.attachment().filename(filename).build());
        headers.setContentLength(csvBytes.length);
        headers.set(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate");
        headers.set(HttpHeaders.PRAGMA, "no-cache");
        headers.set(HttpHeaders.EXPIRES, "0");

        return ResponseEntity.ok()
                .headers(headers)
                .body(csvBytes);
    }

    private String buildFilename(String accountNumber, LocalDate fromDate, LocalDate toDate, String extension) {
        String safeAccount = (accountNumber == null) ? "account" : accountNumber.replaceAll("[^a-zA-Z0-9_-]", "");
        if (safeAccount.isEmpty()) {
            safeAccount = "account";
        }
        return String.format("account-statement-%s-%s-to-%s.%s", safeAccount, fromDate, toDate, extension);
    }
}
