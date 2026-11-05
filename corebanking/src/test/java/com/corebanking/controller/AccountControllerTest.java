package com.corebanking.controller;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.AccountService;
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

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@ExtendWith(MockitoExtension.class)
class AccountControllerTest {

    @Mock
    private AccountService accountService;

    @InjectMocks
    private AccountController accountController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(accountController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    
    @Test
    @DisplayName("testCreateRetailAccount_Success_Returns201: POST /api/accounts with valid payload returns HTTP 201 Created")
    void testCreateRetailAccount_Success_Returns201() throws Exception {
        AccountResponseDTO responseDto = AccountResponseDTO.builder()
                .accountNumber("1001234567")
                .accountType("SAVINGS")
                .accountCategory("RETAIL")
                .customerCode("CUST-20261102-1001")
                .customerName("Daw Yoon")
                .currentBalance(new BigDecimal("100000.0000"))
                .currency("MMK")
                .status("ACTIVE")
                .build();

        when(accountService.createAccount(any(AccountCreateDTO.class))).thenReturn(responseDto);

        String jsonPayload = """
                {
                    "customerCode": "CUST-20261102-1001",
                    "accountType": "SAVINGS",
                    "currency": "MMK",
                    "initialDeposit": 100000.00
                }
                """;

        mockMvc.perform(post("/api/accounts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.accountNumber").value("1001234567"))
                .andExpect(jsonPath("$.accountType").value("SAVINGS"))
                .andExpect(jsonPath("$.customerCode").value("CUST-20261102-1001"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        verify(accountService, times(1)).createAccount(any(AccountCreateDTO.class));
    }

    
    @Test
    @DisplayName("testCreateCorporateAccount_Success_Returns201: POST /api/accounts/corporate with valid codes returns HTTP 201 Created")
    void testCreateCorporateAccount_Success_Returns201() throws Exception {
        when(accountService.createCorporateAccountWithExistingRoles(any(CorporateAccountCreateDTO.class)))
                .thenReturn("2009998877");

        String jsonPayload = """
                {
                    "companyCustomerCode": "COMP-20261102-5001",
                    "accountType": "CURRENT",
                    "ceoCustomerCode": "CUST-CEO-001",
                    "accountantCustomerCode": "CUST-ACC-002",
                    "ceoFullName": "U Tin Win (CEO)",
                    "ceoEmail": "ceo@acetech.com",
                    "makerFullName": "Daw Khin (Accountant)",
                    "makerEmail": "accountant@acetech.com",
                    "initialDeposit": 1000000.00,
                    "currency": "MMK"
                }
                """;

        mockMvc.perform(post("/api/accounts/corporate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.accountNumber").value("2009998877"))
                .andExpect(jsonPath("$.message").value("Corporate account created successfully with CEO and Accountant"));

        verify(accountService, times(1)).createCorporateAccountWithExistingRoles(any(CorporateAccountCreateDTO.class));
    }

   
    @Test
    @DisplayName("testCreateAccount_DuplicateAccountType_ReturnsError: When service throws account limit exception, returns 400 Bad Request")
    void testCreateAccount_DuplicateAccountType_ReturnsError() throws Exception {
        when(accountService.createAccount(any(AccountCreateDTO.class)))
                .thenThrow(new IllegalStateException("Customer already holds an active SAVINGS account"));

        String jsonPayload = """
                {
                    "customerCode": "CUST-20261102-1001",
                    "accountType": "SAVINGS",
                    "currency": "MMK",
                    "initialDeposit": 50000.00
                }
                """;

        mockMvc.perform(post("/api/accounts")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().is4xxClientError())
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message", containsString("Customer already holds an active SAVINGS account")));

        verify(accountService, times(1)).createAccount(any(AccountCreateDTO.class));
    }
}
