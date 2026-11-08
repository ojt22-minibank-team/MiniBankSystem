package com.corebanking.controller;

import com.corebanking.dto.OtcAccountLimitDto;
import com.corebanking.dto.OtcParametersDto;
import com.corebanking.dto.OtcTransactionRequestDto;
import com.corebanking.dto.OtcTransactionResponseDto;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.OtcTransactionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class OtcTransactionControllerTest {

    @Mock
    private OtcTransactionService otcTransactionService;

    @InjectMocks
    private OtcTransactionController otcTransactionController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "/api/transactions/otc";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(otcTransactionController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("POST /deposit - success with 200 OK")
    void processDeposit_Success() throws Exception {
        OtcTransactionRequestDto request = OtcTransactionRequestDto.builder()
                .accountNumber("1000000001")
                .amount(new BigDecimal("100000.00"))
                .currency("MMK")
                .remark("Counter Deposit")
                .manualReferenceId("VOUCHER-001")
                .manualAuditNote("Customer present")
                .build();

        OtcTransactionResponseDto response = OtcTransactionResponseDto.builder()
                .transactionRef("TXN-OTC-DEP-999")
                .transactionType(TransactionType.OTC_DEPOSIT)
                .status(TransactionStatus.COMPLETED)
                .accountNumber("1000000001")
                .amount(new BigDecimal("100000.00"))
                .currency("MMK")
                .transactedAt(LocalDateTime.now())
                .build();

        when(otcTransactionService.processDeposit(any(OtcTransactionRequestDto.class), eq("IDEMP-DEP-1")))
                .thenReturn(response);

        mockMvc.perform(post(BASE_URL + "/deposit")
                        .header("Idempotency-Key", "IDEMP-DEP-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionRef", is("TXN-OTC-DEP-999")))
                .andExpect(jsonPath("$.transactionType", is("OTC_DEPOSIT")))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.amount", is(100000.00)));

        verify(otcTransactionService).processDeposit(any(), eq("IDEMP-DEP-1"));
    }

    @Test
    @DisplayName("POST /withdraw - success with 200 OK")
    void processWithdrawal_Success() throws Exception {
        OtcTransactionRequestDto request = OtcTransactionRequestDto.builder()
                .accountNumber("1000000001")
                .amount(new BigDecimal("50000.00"))
                .currency("MMK")
                .remark("Counter Withdrawal")
                .manualReferenceId("VOUCHER-002")
                .manualAuditNote("Passbook checked")
                .build();

        OtcTransactionResponseDto response = OtcTransactionResponseDto.builder()
                .transactionRef("TXN-OTC-WD-888")
                .transactionType(TransactionType.OTC_WITHDRAWAL)
                .status(TransactionStatus.COMPLETED)
                .accountNumber("1000000001")
                .amount(new BigDecimal("50000.00"))
                .currency("MMK")
                .build();

        when(otcTransactionService.processWithdrawal(any(OtcTransactionRequestDto.class), eq("IDEMP-WD-1")))
                .thenReturn(response);

        mockMvc.perform(post(BASE_URL + "/withdraw")
                        .header("Idempotency-Key", "IDEMP-WD-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionRef", is("TXN-OTC-WD-888")))
                .andExpect(jsonPath("$.transactionType", is("OTC_WITHDRAWAL")))
                .andExpect(jsonPath("$.amount", is(50000.00)));

        verify(otcTransactionService).processWithdrawal(any(), eq("IDEMP-WD-1"));
    }

    @Test
    @DisplayName("POST /deposit - 400 Bad Request on missing required fields")
    void processDeposit_MissingRequiredFields_ReturnsBadRequest() throws Exception {
        OtcTransactionRequestDto invalidRequest = OtcTransactionRequestDto.builder()
                .accountNumber("") // Blank
                .amount(null) // Null
                .build();

        mockMvc.perform(post(BASE_URL + "/deposit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(otcTransactionService);
    }

    @Test
    @DisplayName("GET /parameters - returns configured OTC parameters")
    void getOtcParameters_Success() throws Exception {
        OtcParametersDto params = OtcParametersDto.builder()
                .minDepositAmount(new BigDecimal("10000.00"))
                .minWithdrawalAmount(new BigDecimal("10000.00"))
                .maxDailyWithdrawal(new BigDecimal("20000000.00"))
                .minimumBalance(new BigDecimal("10000.00"))
                .build();

        when(otcTransactionService.getOtcParameters()).thenReturn(params);

        mockMvc.perform(get(BASE_URL + "/parameters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.minDepositAmount", is(10000.00)))
                .andExpect(jsonPath("$.maxDailyWithdrawal", is(20000000.00)));
    }

    @Test
    @DisplayName("GET /calculate-fee - returns estimated fee")
    void calculateFee_Success() throws Exception {
        when(otcTransactionService.calculateOtcFee(new BigDecimal("100000.00"), TransactionType.OTC_DEPOSIT))
                .thenReturn(new BigDecimal("500.00"));

        mockMvc.perform(get(BASE_URL + "/calculate-fee")
                        .param("type", "OTC_DEPOSIT")
                        .param("amount", "100000.00"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fee", is(500.00)));
    }

    @Test
    @DisplayName("GET /check-reference - returns reference duplicate check status")
    void checkReference_Success() throws Exception {
        when(otcTransactionService.isReferenceIdDuplicate("VOUCHER-123")).thenReturn(true);

        mockMvc.perform(get(BASE_URL + "/check-reference")
                        .param("ref", "VOUCHER-123"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.exists", is(true)));
    }

    @Test
    @DisplayName("GET /account-limits - returns remaining limits")
    void getAccountLimitStatus_Success() throws Exception {
        OtcAccountLimitDto limitDto = OtcAccountLimitDto.builder()
                .accountNumber("1000000001")
                .maxDailyWithdrawal(new BigDecimal("20000000.00"))
                .todayWithdrawnAmount(new BigDecimal("500000.00"))
                .remainingDailyLimit(new BigDecimal("19500000.00"))
                .build();

        when(otcTransactionService.getAccountLimitStatus("1000000001")).thenReturn(limitDto);

        mockMvc.perform(get(BASE_URL + "/account-limits")
                        .param("accountNumber", "1000000001"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountNumber", is("1000000001")))
                .andExpect(jsonPath("$.remainingDailyLimit", is(19500000.00)));
    }
}
