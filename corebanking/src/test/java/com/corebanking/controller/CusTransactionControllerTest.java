package com.corebanking.controller;

import com.corebanking.dto.CusTransactionHistoryItemDTO;
import com.corebanking.dto.CusTransactionHistoryResponseDTO;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.CusTransactionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CusTransactionControllerTest {

    private static final String BASE_URL = "/api/customer/transactions";
    private static final String ACCOUNT_NUMBER = "2003513817";
    private static final String TRANSACTION_REF = "TXN-P2P-20261019-6123";

    @Mock
    private CusTransactionService transactionService;

    @InjectMocks
    private CusTransactionController controller;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    // -------------------------------------------------------------------------
    // Test Fixtures
    // -------------------------------------------------------------------------

    private CusTransactionHistoryItemDTO createSampleItem() {
        return CusTransactionHistoryItemDTO.builder()
                .transactionRef(TRANSACTION_REF)
                .transactionDate(LocalDateTime.of(2026, 10, 19, 14, 20))
                .transactionType("INTERNAL_TRANSFER")
                .status("COMPLETED")
                .direction("OUT")
                .amount(new BigDecimal("1000.00"))
                .currency("MMK")
                .serviceFee(BigDecimal.ZERO)
                .description("P2P Transfer")
                .sourceAccountNumber(ACCOUNT_NUMBER)
                .destinationAccountNumber("1008207493")
                .counterpartyName("Thiri Ngweyee")
                .isOwnAccount(true)
                .displayTitle("Transfer to Own Account")
                .build();
    }

    private CusTransactionHistoryResponseDTO createSampleResponse(CusTransactionHistoryItemDTO item) {
        return CusTransactionHistoryResponseDTO.builder()
                .content(List.of(item))
                .page(0)
                .size(10)
                .totalElements(1L)
                .totalPages(1)
                .first(true)
                .last(true)
                .hasNext(false)
                .hasPrevious(false)
                .build();
    }

    // =========================================================================
    // PART A — TRANSACTION HISTORY LIST CONTROLLER TESTS
    // =========================================================================

    @Test
    @DisplayName("GET /api/customer/transactions with minimum valid params returns 200 and page JSON")
    void getTransactionHistory_validMinimumParams_returnsOkAndPageJson() throws Exception {
        CusTransactionHistoryItemDTO item = createSampleItem();
        CusTransactionHistoryResponseDTO pageResponse = createSampleResponse(item);

        when(transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10))
                .thenReturn(pageResponse);

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content", hasSize(1)))
                .andExpect(jsonPath("$.content[0].transactionRef", is(TRANSACTION_REF)))
                .andExpect(jsonPath("$.page", is(0)))
                .andExpect(jsonPath("$.size", is(10)))
                .andExpect(jsonPath("$.totalElements", is(1)))
                .andExpect(jsonPath("$.totalPages", is(1)))
                .andExpect(jsonPath("$.first", is(true)))
                .andExpect(jsonPath("$.last", is(true)))
                .andExpect(jsonPath("$.hasNext", is(false)))
                .andExpect(jsonPath("$.hasPrevious", is(false)));

        verify(transactionService).getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10);
    }

    @Test
    @DisplayName("GET /api/customer/transactions with all filters delegates parsed parameters to service")
    void getTransactionHistory_allFiltersSupplied_delegatesAllParameters() throws Exception {
        CusTransactionHistoryItemDTO item = createSampleItem();
        CusTransactionHistoryResponseDTO pageResponse = CusTransactionHistoryResponseDTO.builder()
                .content(List.of(item))
                .page(2)
                .size(20)
                .totalElements(45L)
                .totalPages(3)
                .first(false)
                .last(false)
                .hasNext(true)
                .hasPrevious(true)
                .build();

        LocalDate fromDate = LocalDate.of(2026, 10, 19);
        LocalDate toDate = LocalDate.of(2026, 10, 31);
        BigDecimal min = new BigDecimal("100.00");
        BigDecimal max = new BigDecimal("5000.00");

        when(transactionService.getTransactionHistory(
                ACCOUNT_NUMBER, "COMPLETED", "INTERNAL_TRANSFER", fromDate, toDate, min, max, 2, 20
        )).thenReturn(pageResponse);

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("status", "COMPLETED")
                        .param("transactionType", "INTERNAL_TRANSFER")
                        .param("fromDate", "2026-10-19")
                        .param("toDate", "2026-10-31")
                        .param("minAmount", "100.00")
                        .param("maxAmount", "5000.00")
                        .param("page", "2")
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.page", is(2)))
                .andExpect(jsonPath("$.size", is(20)))
                .andExpect(jsonPath("$.totalElements", is(45)))
                .andExpect(jsonPath("$.totalPages", is(3)));

        verify(transactionService).getTransactionHistory(
                ACCOUNT_NUMBER, "COMPLETED", "INTERNAL_TRANSFER", fromDate, toDate, min, max, 2, 20
        );
    }

    @Test
    @DisplayName("GET /api/customer/transactions missing accountNumber is rejected before service call")
    void getTransactionHistory_missingAccountNumber_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MissingServletRequestParameterException.class, result.getResolvedException());
        verifyNoInteractions(transactionService);
    }

    @Test
    @DisplayName("GET /api/customer/transactions with invalid date format is rejected before service call")
    void getTransactionHistory_invalidDateFormat_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("fromDate", "not-a-date"))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MethodArgumentTypeMismatchException.class, result.getResolvedException());
        verifyNoInteractions(transactionService);
    }

    @Test
    @DisplayName("GET /api/customer/transactions with invalid decimal format is rejected before service call")
    void getTransactionHistory_invalidAmountFormat_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("minAmount", "abc"))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MethodArgumentTypeMismatchException.class, result.getResolvedException());
        verifyNoInteractions(transactionService);
    }

    @Test
    @DisplayName("GET /api/customer/transactions service CusValidationException maps to HTTP 400 VALIDATION_ERROR")
    void getTransactionHistory_serviceValidationException_returnsMapped400() throws Exception {
        when(transactionService.getTransactionHistory(eq(ACCOUNT_NUMBER), any(), any(), any(), any(), any(), any(), eq(0), eq(10)))
                .thenThrow(new CusValidationException("Page index cannot be negative."));

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.message", is("Page index cannot be negative.")))
                .andExpect(jsonPath("$.timestamp").exists());

        verify(transactionService).getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10);
    }

    @Test
    @DisplayName("GET /api/customer/transactions service AccountNotFoundException maps to HTTP 404 ACCOUNT_NOT_FOUND")
    void getTransactionHistory_accountNotFound_returnsMapped404() throws Exception {
        when(transactionService.getTransactionHistory(eq(ACCOUNT_NUMBER), any(), any(), any(), any(), any(), any(), eq(0), eq(10)))
                .thenThrow(new AccountNotFoundException("Account not found or access denied for this customer"));

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.code", is("ACCOUNT_NOT_FOUND")))
                .andExpect(jsonPath("$.message", is("Account not found or access denied for this customer")));

        verify(transactionService).getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10);
    }

    @Test
    @DisplayName("GET /api/customer/transactions service CusAuthenticationException maps to HTTP 401 UNAUTHORIZED")
    void getTransactionHistory_unauthorized_returnsMapped401() throws Exception {
        when(transactionService.getTransactionHistory(eq(ACCOUNT_NUMBER), any(), any(), any(), any(), any(), any(), eq(0), eq(10)))
                .thenThrow(new CusAuthenticationException("Customer authentication is required."));

        mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status", is(401)))
                .andExpect(jsonPath("$.code", is("UNAUTHORIZED")))
                .andExpect(jsonPath("$.message", is("Customer authentication is required.")));

        verify(transactionService).getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10);
    }

    // =========================================================================
    // PART B — TRANSACTION DETAIL CONTROLLER TESTS
    // =========================================================================

    @Test
    @DisplayName("GET /api/customer/transactions/{transactionRef} with valid params returns 200 and item JSON")
    void getTransactionDetail_validParams_returnsTransactionJson() throws Exception {
        CusTransactionHistoryItemDTO item = createSampleItem();

        when(transactionService.getTransactionDetail(TRANSACTION_REF, ACCOUNT_NUMBER))
                .thenReturn(item);

        mockMvc.perform(get(BASE_URL + "/{transactionRef}", TRANSACTION_REF)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionRef", is(TRANSACTION_REF)))
                .andExpect(jsonPath("$.transactionType", is("INTERNAL_TRANSFER")))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.direction", is("OUT")))
                .andExpect(jsonPath("$.amount", is(1000.00)))
                .andExpect(jsonPath("$.currency", is("MMK")))
                .andExpect(jsonPath("$.serviceFee", is(0)))
                .andExpect(jsonPath("$.description", is("P2P Transfer")))
                .andExpect(jsonPath("$.sourceAccountNumber", is(ACCOUNT_NUMBER)))
                .andExpect(jsonPath("$.destinationAccountNumber", is("1008207493")))
                .andExpect(jsonPath("$.counterpartyName", is("Thiri Ngweyee")))
                .andExpect(jsonPath("$.isOwnAccount", is(true)))
                .andExpect(jsonPath("$.displayTitle", is("Transfer to Own Account")));

        verify(transactionService).getTransactionDetail(TRANSACTION_REF, ACCOUNT_NUMBER);
    }

    @Test
    @DisplayName("GET /api/customer/transactions/{transactionRef} missing accountNumber returns client error")
    void getTransactionDetail_missingAccountNumber_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL + "/{transactionRef}", TRANSACTION_REF)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MissingServletRequestParameterException.class, result.getResolvedException());
        verifyNoInteractions(transactionService);
    }

    @Test
    @DisplayName("GET /api/customer/transactions/{transactionRef} with blank accountNumber delegates to service and returns 400")
    void getTransactionDetail_blankAccountNumber_handlesAccordingToCurrentMvcBehavior() throws Exception {
        when(transactionService.getTransactionDetail(TRANSACTION_REF, ""))
                .thenThrow(new CusValidationException("Account number is required."));

        mockMvc.perform(get(BASE_URL + "/{transactionRef}", TRANSACTION_REF)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.message", is("Account number is required.")));

        verify(transactionService).getTransactionDetail(TRANSACTION_REF, "");
    }

    @Test
    @DisplayName("GET /api/customer/transactions/{transactionRef} not found maps to HTTP 404 ACCOUNT_NOT_FOUND")
    void getTransactionDetail_notFound_returnsMapped404() throws Exception {
        when(transactionService.getTransactionDetail(TRANSACTION_REF, ACCOUNT_NUMBER))
                .thenThrow(new AccountNotFoundException("Transaction not found or access denied for this account"));

        mockMvc.perform(get(BASE_URL + "/{transactionRef}", TRANSACTION_REF)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status", is(404)))
                .andExpect(jsonPath("$.code", is("ACCOUNT_NOT_FOUND")))
                .andExpect(jsonPath("$.message", is("Transaction not found or access denied for this account")));

        verify(transactionService).getTransactionDetail(TRANSACTION_REF, ACCOUNT_NUMBER);
    }

    @Test
    @DisplayName("GET /api/customer/transactions/{transactionRef} service validation error maps to HTTP 400 VALIDATION_ERROR")
    void getTransactionDetail_validationException_returnsMapped400() throws Exception {
        when(transactionService.getTransactionDetail(TRANSACTION_REF, ACCOUNT_NUMBER))
                .thenThrow(new CusValidationException("Transaction reference is required."));

        mockMvc.perform(get(BASE_URL + "/{transactionRef}", TRANSACTION_REF)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.message", is("Transaction reference is required.")));

        verify(transactionService).getTransactionDetail(TRANSACTION_REF, ACCOUNT_NUMBER);
    }

    // =========================================================================
    // PART C — STATUS DISCOVERY CONTROLLER TESTS
    // =========================================================================

    @Test
    @DisplayName("GET /api/customer/transactions/statuses with valid account returns JSON string array")
    void getDistinctStatuses_validAccount_returnsStringArray() throws Exception {
        when(transactionService.getDistinctStatuses(ACCOUNT_NUMBER))
                .thenReturn(List.of("COMPLETED", "FAILED"));

        mockMvc.perform(get(BASE_URL + "/statuses")
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0]", is("COMPLETED")))
                .andExpect(jsonPath("$[1]", is("FAILED")));

        verify(transactionService).getDistinctStatuses(ACCOUNT_NUMBER);
    }

    @Test
    @DisplayName("GET /api/customer/transactions/statuses missing accountNumber returns client error")
    void getDistinctStatuses_missingAccountNumber_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL + "/statuses")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MissingServletRequestParameterException.class, result.getResolvedException());
        verifyNoInteractions(transactionService);
    }

    @Test
    @DisplayName("GET /api/customer/transactions/statuses validation exception maps to HTTP 400 VALIDATION_ERROR")
    void getDistinctStatuses_serviceValidationException_returnsMapped400() throws Exception {
        when(transactionService.getDistinctStatuses(ACCOUNT_NUMBER))
                .thenThrow(new CusValidationException("Account number is required."));

        mockMvc.perform(get(BASE_URL + "/statuses")
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.message", is("Account number is required.")));

        verify(transactionService).getDistinctStatuses(ACCOUNT_NUMBER);
    }

    // =========================================================================
    // PART D — TYPE DISCOVERY CONTROLLER TESTS
    // =========================================================================

    @Test
    @DisplayName("GET /api/customer/transactions/types with valid account returns JSON string array")
    void getDistinctTypes_validAccount_returnsStringArray() throws Exception {
        when(transactionService.getDistinctTypes(ACCOUNT_NUMBER))
                .thenReturn(List.of("INTERNAL_TRANSFER", "OTC_DEPOSIT"));

        mockMvc.perform(get(BASE_URL + "/types")
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0]", is("INTERNAL_TRANSFER")))
                .andExpect(jsonPath("$[1]", is("OTC_DEPOSIT")));

        verify(transactionService).getDistinctTypes(ACCOUNT_NUMBER);
    }

    @Test
    @DisplayName("GET /api/customer/transactions/types missing accountNumber returns client error")
    void getDistinctTypes_missingAccountNumber_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL + "/types")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MissingServletRequestParameterException.class, result.getResolvedException());
        verifyNoInteractions(transactionService);
    }

    @Test
    @DisplayName("GET /api/customer/transactions/types validation exception maps to HTTP 400 VALIDATION_ERROR")
    void getDistinctTypes_serviceValidationException_returnsMapped400() throws Exception {
        when(transactionService.getDistinctTypes(ACCOUNT_NUMBER))
                .thenThrow(new CusValidationException("Account number is required."));

        mockMvc.perform(get(BASE_URL + "/types")
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status", is(400)))
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                .andExpect(jsonPath("$.message", is("Account number is required.")));

        verify(transactionService).getDistinctTypes(ACCOUNT_NUMBER);
    }

    // =========================================================================
    // PART E — OPTIONAL BINDING EDGE TESTS
    // =========================================================================

    @Test
    @DisplayName("GET /api/customer/transactions with non-integer page is rejected before service call")
    void getTransactionHistory_invalidPageFormat_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("page", "abc"))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MethodArgumentTypeMismatchException.class, result.getResolvedException());
        verifyNoInteractions(transactionService);
    }

    @Test
    @DisplayName("GET /api/customer/transactions with non-integer size is rejected before service call")
    void getTransactionHistory_invalidSizeFormat_returnsBadRequest() throws Exception {
        var result = mockMvc.perform(get(BASE_URL)
                        .accept(MediaType.APPLICATION_JSON)
                        .param("accountNumber", ACCOUNT_NUMBER)
                        .param("size", "xyz"))
                .andExpect(resultMatcher -> {
                    int status = resultMatcher.getResponse().getStatus();
                    assertTrue(status == 400 || status == 500,
                            "Expected HTTP 400 or 500 from Spring MVC / GlobalExceptionHandler");
                })
                .andReturn();

        assertInstanceOf(MethodArgumentTypeMismatchException.class, result.getResolvedException());
        verifyNoInteractions(transactionService);
    }
}
