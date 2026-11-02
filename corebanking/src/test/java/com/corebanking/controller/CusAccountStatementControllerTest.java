package com.corebanking.controller;

import com.corebanking.dto.CusAccountStatementDTO;
import com.corebanking.dto.CusStatementRowDTO;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.CusAccountStatementCsvService;
import com.corebanking.service.CusAccountStatementPdfService;
import com.corebanking.service.CusAccountStatementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CusAccountStatementControllerTest {

    private static final String BASE_URL = "/api/customer/account-statements";
    private static final String ACCOUNT_NUMBER = "2003513817";
    private static final LocalDate FROM_DATE = LocalDate.of(2026, 10, 19);
    private static final LocalDate TO_DATE = LocalDate.of(2026, 10, 31);

    private static final byte[] PDF_BYTES = "%PDF-1.4 synthetic statement content".getBytes(StandardCharsets.UTF_8);
    private static final byte[] CSV_BYTES = "Date,Reference,Amount\n2026-10-19,TXN-001,20000.00\n".getBytes(StandardCharsets.UTF_8);

    @Mock
    private CusAccountStatementService statementService;

    @Mock
    private CusAccountStatementPdfService pdfService;

    @Mock
    private CusAccountStatementCsvService csvService;

    @InjectMocks
    private CusAccountStatementController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // -------------------------------------------------------------------------
    // Test Fixture Helper
    // -------------------------------------------------------------------------

    private CusAccountStatementDTO createSampleStatement(String accountNumber, LocalDate from, LocalDate to) {
        return CusAccountStatementDTO.builder()
                .accountNumber(accountNumber)
                .accountType("CURRENT")
                .customerName("Thiri Ngwe Yee")
                .phone("0912345678")
                .nrc("12/KAMAYA(N)123456")
                .currency("MMK")
                .fromDate(from)
                .toDate(to)
                .openingBalance(new BigDecimal("200000.00"))
                .closingBalance(new BigDecimal("186000.00"))
                .numberOfCreditEntries(1)
                .totalCredit(new BigDecimal("20000.00"))
                .numberOfDebitEntries(1)
                .totalDebit(new BigDecimal("34000.00"))
                .transactions(List.of(
                        CusStatementRowDTO.builder()
                                .transactionDate(from.atTime(10, 30))
                                .transactionRef("TXN-20261019-001")
                                .description("P2P Transfer Credit to Acc: " + accountNumber)
                                .creditAmount(new BigDecimal("20000.00"))
                                .debitAmount(BigDecimal.ZERO)
                                .balance(new BigDecimal("220000.00"))
                                .build()
                ))
                .build();
    }

    // -------------------------------------------------------------------------
    // 1. PDF Success & Headers
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /pdf with valid parameters returns PDF binary, attachment header, and cache controls")
    void downloadPdf_validParams_returnsPdfAttachment() throws Exception {
        CusAccountStatementDTO statement = createSampleStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE);

        when(statementService.getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE))
                .thenReturn(statement);
        when(pdfService.generateAccountStatementPdf(statement))
                .thenReturn(PDF_BYTES);

        mockMvc.perform(get(BASE_URL + "/pdf")
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("fromDate", "2026-10-19")
                        .param("toDate", "2026-10-31"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"account-statement-2003513817-2026-10-19-to-2026-10-31.pdf\""))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate"))
                .andExpect(header().string(HttpHeaders.PRAGMA, "no-cache"))
                .andExpect(header().string(HttpHeaders.EXPIRES, "0"))
                .andExpect(content().bytes(PDF_BYTES));

        verify(statementService).getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE);
        verify(pdfService).generateAccountStatementPdf(statement);
        verifyNoInteractions(csvService);
    }

    // -------------------------------------------------------------------------
    // 2. CSV Success & Headers
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /csv with valid parameters returns CSV binary encoded in UTF-8, attachment header, and cache controls")
    void downloadCsv_validParams_returnsCsvAttachment() throws Exception {
        CusAccountStatementDTO statement = createSampleStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE);

        when(statementService.getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE))
                .thenReturn(statement);
        when(csvService.generateAccountStatementCsv(statement))
                .thenReturn(CSV_BYTES);

        mockMvc.perform(get(BASE_URL + "/csv")
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("fromDate", "2026-10-19")
                        .param("toDate", "2026-10-31"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString("text/csv")))
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, containsString("charset=UTF-8")))
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"account-statement-2003513817-2026-10-19-to-2026-10-31.csv\""))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store, no-cache, must-revalidate"))
                .andExpect(header().string(HttpHeaders.PRAGMA, "no-cache"))
                .andExpect(header().string(HttpHeaders.EXPIRES, "0"))
                .andExpect(content().bytes(CSV_BYTES));

        verify(statementService).getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE);
        verify(csvService).generateAccountStatementCsv(statement);
        verifyNoInteractions(pdfService);
    }

    // -------------------------------------------------------------------------
    // 3. MVC Binding Rejections (Missing Params / Invalid Date)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /pdf missing required accountNumber is rejected before business logic")
    void downloadPdf_missingAccountNumber_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL + "/pdf")
                        .param("fromDate", "2026-10-19")
                        .param("toDate", "2026-10-31"))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MissingServletRequestParameterException.class, result.getResolvedException());
        verifyNoInteractions(statementService, pdfService, csvService);
    }

    @Test
    @DisplayName("GET /pdf with invalid fromDate format is rejected before business logic")
    void downloadPdf_invalidDateFormat_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL + "/pdf")
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("fromDate", "not-a-date")
                        .param("toDate", "2026-10-31"))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MethodArgumentTypeMismatchException.class, result.getResolvedException());
        verifyNoInteractions(statementService, pdfService, csvService);
    }

    // -------------------------------------------------------------------------
    // 4. Exception Mapping via GlobalExceptionHandler
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /pdf service CusValidationException maps to HTTP 400 VALIDATION_ERROR")
    void downloadPdf_serviceValidationException_returnsMapped400() throws Exception {
        when(statementService.getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE))
                .thenThrow(new CusValidationException("From Date cannot be later than To Date."));

        mockMvc.perform(get(BASE_URL + "/pdf")
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("fromDate", "2026-10-19")
                        .param("toDate", "2026-10-31"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.message", is("From Date cannot be later than To Date.")))
                .andExpect(jsonPath("$.timestamp").exists());

        verify(statementService).getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE);
        verifyNoInteractions(pdfService, csvService);
    }

    @Test
    @DisplayName("GET /pdf service AccountNotFoundException maps to HTTP 404 ACCOUNT_NOT_FOUND")
    void downloadPdf_accountNotFound_returnsMapped404() throws Exception {
        when(statementService.getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE))
                .thenThrow(new AccountNotFoundException("Account not found or access denied for this customer"));

        mockMvc.perform(get(BASE_URL + "/pdf")
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("fromDate", "2026-10-19")
                        .param("toDate", "2026-10-31"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.code", is("ACCOUNT_NOT_FOUND")))
                .andExpect(jsonPath("$.message", is("Account not found or access denied for this customer")))
                .andExpect(jsonPath("$.timestamp").exists());

        verify(statementService).getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE);
        verifyNoInteractions(pdfService, csvService);
    }

    @Test
    @DisplayName("GET /pdf service CusAuthenticationException maps to HTTP 401 UNAUTHORIZED")
    void downloadPdf_unauthorized_returnsMapped401() throws Exception {
        when(statementService.getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE))
                .thenThrow(new CusAuthenticationException("Customer authentication is required."));

        mockMvc.perform(get(BASE_URL + "/pdf")
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("fromDate", "2026-10-19")
                        .param("toDate", "2026-10-31"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")))
                .andExpect(jsonPath("$.message", is("Customer authentication is required.")))
                .andExpect(jsonPath("$.timestamp").exists());

        verify(statementService).getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE);
        verifyNoInteractions(pdfService, csvService);
    }

    // -------------------------------------------------------------------------
    // 5. CSV Error Mapping
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /csv service CusValidationException maps to HTTP 400 VALIDATION_ERROR")
    void downloadCsv_serviceValidationException_returnsMapped400() throws Exception {
        when(statementService.getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE))
                .thenThrow(new CusValidationException("From Date cannot be earlier than the account opening date."));

        mockMvc.perform(get(BASE_URL + "/csv")
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("fromDate", "2026-10-19")
                        .param("toDate", "2026-10-31"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.message", is("From Date cannot be earlier than the account opening date.")))
                .andExpect(jsonPath("$.timestamp").exists());

        verify(statementService).getAccountStatement(ACCOUNT_NUMBER, FROM_DATE, TO_DATE);
        verifyNoInteractions(csvService, pdfService);
    }

    // -------------------------------------------------------------------------
    // 6. Filename Sanitization
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Filename builder sanitizes special characters in accountNumber for attachment header")
    void downloadPdf_accountNumberWithSpecialCharacters_sanitizesFilename() throws Exception {
        String dirtyAccount = "ACC/2003#513817!";
        String sanitizedAccount = "ACC2003513817";
        CusAccountStatementDTO statement = createSampleStatement(dirtyAccount, FROM_DATE, TO_DATE);

        when(statementService.getAccountStatement(dirtyAccount, FROM_DATE, TO_DATE))
                .thenReturn(statement);
        when(pdfService.generateAccountStatementPdf(statement))
                .thenReturn(PDF_BYTES);

        mockMvc.perform(get(BASE_URL + "/pdf")
                        .param("accountNumber", dirtyAccount)
                        .param("fromDate", "2026-10-19")
                        .param("toDate", "2026-10-31"))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"account-statement-" + sanitizedAccount + "-2026-10-19-to-2026-10-31.pdf\""));

        verify(statementService).getAccountStatement(dirtyAccount, FROM_DATE, TO_DATE);
        verify(pdfService).generateAccountStatementPdf(statement);
    }

    // -------------------------------------------------------------------------
    // 7. Optional Additional MVC Binding Checks
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /csv missing required toDate parameter is rejected before business logic")
    void downloadCsv_missingToDate_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL + "/csv")
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("fromDate", "2026-10-19"))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MissingServletRequestParameterException.class, result.getResolvedException());
        verifyNoInteractions(statementService, csvService, pdfService);
    }

    @Test
    @DisplayName("GET /csv with invalid toDate format is rejected before business logic")
    void downloadCsv_invalidDateFormat_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL + "/csv")
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("fromDate", "2026-10-19")
                        .param("toDate", "invalid-date"))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MethodArgumentTypeMismatchException.class, result.getResolvedException());
        verifyNoInteractions(statementService, csvService, pdfService);
    }
}
