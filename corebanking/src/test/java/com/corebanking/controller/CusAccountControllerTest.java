package com.corebanking.controller;

import com.corebanking.dto.CusAccountResponseDTO;
import com.corebanking.dto.TransferLimitInfoResponseDto;
import com.corebanking.dto.UpdateTransferLimitRequestDto;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.CusAccountService;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CusAccountController Unit Tests")
class CusAccountControllerTest {

    private static final String BASE_URL = "/api/customer/accounts";
    private static final String ACCOUNT_NUMBER = "1002003001";

    @Mock
    private CusAccountService customerAccountService;

    @InjectMocks
    private CusAccountController accountController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(accountController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    private CusAccountResponseDTO buildSampleAccountResponse(String accountNumber) {
        return CusAccountResponseDTO.builder()
                .accountNumber(accountNumber)
                .accountCategory("RETAIL")
                .accountType("SAVINGS")
                .currency("MMK")
                .currentBalance(new BigDecimal("200000.00"))
                .availableBalance(new BigDecimal("190000.00"))
                .minimumBalance(new BigDecimal("10000.00"))
                .dailyTransferLimit(new BigDecimal("5000000.00"))
                .status("ACTIVE")
                .jointAccount(false)
                .requiredApprovals(1)
                .openedAt(LocalDateTime.of(2026, 1, 10, 10, 0))
                .build();
    }

    // -------------------------------------------------------------------------
    // GET /api/customer/accounts
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/customer/accounts - Returns 200 OK with list of customer accounts")
    void getMyAccounts_Success_Returns200AndList() throws Exception {
        List<CusAccountResponseDTO> accounts = List.of(
                buildSampleAccountResponse("1002003001"),
                buildSampleAccountResponse("1002003002")
        );

        when(customerAccountService.getMyAccounts()).thenReturn(accounts);

        mockMvc.perform(get(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].accountNumber", is("1002003001")))
                .andExpect(jsonPath("$[0].accountCategory", is("RETAIL")))
                .andExpect(jsonPath("$[0].accountType", is("SAVINGS")))
                .andExpect(jsonPath("$[0].currency", is("MMK")))
                .andExpect(jsonPath("$[0].currentBalance", is(200000.00)))
                .andExpect(jsonPath("$[0].availableBalance", is(190000.00)))
                .andExpect(jsonPath("$[0].status", is("ACTIVE")))
                .andExpect(jsonPath("$[1].accountNumber", is("1002003002")));

        verify(customerAccountService, times(1)).getMyAccounts();
    }

    // -------------------------------------------------------------------------
    // GET /api/customer/accounts/{accountNumber}
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/customer/accounts/{accountNumber} - Returns 200 OK with single account")
    void getMyAccount_Success_Returns200() throws Exception {
        CusAccountResponseDTO account = buildSampleAccountResponse(ACCOUNT_NUMBER);

        when(customerAccountService.getMyAccount(ACCOUNT_NUMBER)).thenReturn(account);

        mockMvc.perform(get(BASE_URL + "/{accountNumber}", ACCOUNT_NUMBER)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.accountNumber", is(ACCOUNT_NUMBER)))
                .andExpect(jsonPath("$.accountCategory", is("RETAIL")))
                .andExpect(jsonPath("$.accountType", is("SAVINGS")))
                .andExpect(jsonPath("$.status", is("ACTIVE")));

        verify(customerAccountService, times(1)).getMyAccount(ACCOUNT_NUMBER);
    }

    @Test
    @DisplayName("GET /api/customer/accounts/{accountNumber} - Returns 500 when account not found or access denied")
    void getMyAccount_NotFound_Returns500() throws Exception {
        when(customerAccountService.getMyAccount(ACCOUNT_NUMBER))
                .thenThrow(new RuntimeException("Account not found."));

        mockMvc.perform(get(BASE_URL + "/{accountNumber}", ACCOUNT_NUMBER)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code", is("INTERNAL_SERVER_ERROR")))
                .andExpect(jsonPath("$.message", is("Account not found.")));

        verify(customerAccountService, times(1)).getMyAccount(ACCOUNT_NUMBER);
    }

    // -------------------------------------------------------------------------
    // GET /api/customer/accounts/{accountNumber}/transfer-limits
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/customer/accounts/{accountNumber}/transfer-limits - Returns 200 OK with limit info")
    void getTransferLimits_Success_Returns200() throws Exception {
        TransferLimitInfoResponseDto limitDto = TransferLimitInfoResponseDto.builder()
                .accountNumber(ACCOUNT_NUMBER)
                .accountType("SAVINGS")
                .currency("MMK")
                .bankMaxDailyLimit(new BigDecimal("10000000.00"))
                .effectiveDailyLimit(new BigDecimal("5000000.00"))
                .remainingDailyLimit(new BigDecimal("4000000.00"))
                .build();

        when(customerAccountService.getAccountTransferLimits(ACCOUNT_NUMBER)).thenReturn(limitDto);

        mockMvc.perform(get(BASE_URL + "/{accountNumber}/transfer-limits", ACCOUNT_NUMBER)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.accountNumber", is(ACCOUNT_NUMBER)))
                .andExpect(jsonPath("$.bankMaxDailyLimit", is(10000000.00)))
                .andExpect(jsonPath("$.effectiveDailyLimit", is(5000000.00)))
                .andExpect(jsonPath("$.remainingDailyLimit", is(4000000.00)));

        verify(customerAccountService, times(1)).getAccountTransferLimits(ACCOUNT_NUMBER);
    }

    // -------------------------------------------------------------------------
    // PUT /api/customer/accounts/{accountNumber}/transfer-limits
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("PUT /api/customer/accounts/{accountNumber}/transfer-limits - Returns 200 OK when valid")
    void updateTransferLimits_Success_Returns200() throws Exception {
        UpdateTransferLimitRequestDto requestDto = UpdateTransferLimitRequestDto.builder()
                .transactionPin("123456")
                .customOneTimeLimit(new BigDecimal("1000000.00"))
                .customDailyLimit(new BigDecimal("5000000.00"))
                .build();

        TransferLimitInfoResponseDto responseDto = TransferLimitInfoResponseDto.builder()
                .accountNumber(ACCOUNT_NUMBER)
                .userCustomOneTimeLimit(new BigDecimal("1000000.00"))
                .userCustomDailyLimit(new BigDecimal("5000000.00"))
                .build();

        when(customerAccountService.updateAccountTransferLimits(eq(ACCOUNT_NUMBER), any(UpdateTransferLimitRequestDto.class)))
                .thenReturn(responseDto);

        mockMvc.perform(put(BASE_URL + "/{accountNumber}/transfer-limits", ACCOUNT_NUMBER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.accountNumber", is(ACCOUNT_NUMBER)))
                .andExpect(jsonPath("$.userCustomOneTimeLimit", is(1000000.00)))
                .andExpect(jsonPath("$.userCustomDailyLimit", is(5000000.00)));

        verify(customerAccountService, times(1))
                .updateAccountTransferLimits(eq(ACCOUNT_NUMBER), any(UpdateTransferLimitRequestDto.class));
    }

    @Test
    @DisplayName("PUT /api/customer/accounts/{accountNumber}/transfer-limits - Returns 400 Bad Request when transactionPin is blank")
    void updateTransferLimits_ValidationError_WhenPinMissing_Returns400() throws Exception {
        UpdateTransferLimitRequestDto requestDto = UpdateTransferLimitRequestDto.builder()
                .transactionPin("") // Blank pin fails @NotBlank
                .customOneTimeLimit(new BigDecimal("1000000.00"))
                .build();

        mockMvc.perform(put(BASE_URL + "/{accountNumber}/transfer-limits", ACCOUNT_NUMBER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));

        verifyNoInteractions(customerAccountService);
    }
}
