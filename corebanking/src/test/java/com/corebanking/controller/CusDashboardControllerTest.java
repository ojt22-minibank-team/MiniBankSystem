package com.corebanking.controller;

import com.corebanking.dto.CusDashboardAccountDTO;
import com.corebanking.dto.CusDashboardResponseDTO;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.CusDashboardService;
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
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CusDashboardController Unit Tests")
class CusDashboardControllerTest {

    private static final String DASHBOARD_URL = "/api/customer/dashboard";

    @Mock
    private CusDashboardService dashboardService;

    @InjectMocks
    private CusDashboardController dashboardController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(dashboardController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private CusDashboardResponseDTO buildSampleDashboardResponse() {
        CusDashboardAccountDTO account1 = CusDashboardAccountDTO.builder()
                .accountNumber("1001234567")
                .accountCategory("RETAIL")
                .accountType("SAVINGS")
                .currency("MMK")
                .currentBalance(new BigDecimal("150000.00"))
                .availableBalance(new BigDecimal("140000.00"))
                .status("ACTIVE")
                .jointAccount(false)
                .openedAt(LocalDateTime.of(2026, 1, 10, 9, 0))
                .build();

        CusDashboardAccountDTO account2 = CusDashboardAccountDTO.builder()
                .accountNumber("1007654321")
                .accountCategory("RETAIL")
                .accountType("CURRENT")
                .currency("MMK")
                .currentBalance(new BigDecimal("80000.00"))
                .availableBalance(new BigDecimal("75000.00"))
                .status("FROZEN")
                .jointAccount(true)
                .openedAt(LocalDateTime.of(2026, 2, 15, 11, 30))
                .build();

        return CusDashboardResponseDTO.builder()
                .customerCode("CUS-2026-0001")
                .fullName("Daw Thida Win")
                .customerType(CustomerType.INDIVIDUAL)
                .totalBalance(new BigDecimal("215000.00"))
                .accountCount(2)
                .accounts(List.of(account1, account2))
                .build();
    }

    @Test
    @DisplayName("GET /api/customer/dashboard - Returns 200 OK with dashboard response payload")
    void getDashboard_Success_Returns200AndJson() throws Exception {
        CusDashboardResponseDTO responseDTO = buildSampleDashboardResponse();
        when(dashboardService.getDashboard()).thenReturn(responseDTO);

        mockMvc.perform(get(DASHBOARD_URL)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.customerCode", is("CUS-2026-0001")))
                .andExpect(jsonPath("$.fullName", is("Daw Thida Win")))
                .andExpect(jsonPath("$.customerType", is("INDIVIDUAL")))
                .andExpect(jsonPath("$.totalBalance", is(215000.00)))
                .andExpect(jsonPath("$.accountCount", is(2)))
                .andExpect(jsonPath("$.accounts", hasSize(2)))
                .andExpect(jsonPath("$.accounts[0].accountNumber", is("1001234567")))
                .andExpect(jsonPath("$.accounts[0].accountCategory", is("RETAIL")))
                .andExpect(jsonPath("$.accounts[0].accountType", is("SAVINGS")))
                .andExpect(jsonPath("$.accounts[0].currency", is("MMK")))
                .andExpect(jsonPath("$.accounts[0].currentBalance", is(150000.00)))
                .andExpect(jsonPath("$.accounts[0].availableBalance", is(140000.00)))
                .andExpect(jsonPath("$.accounts[0].status", is("ACTIVE")))
                .andExpect(jsonPath("$.accounts[0].jointAccount", is(false)))
                .andExpect(jsonPath("$.accounts[1].accountNumber", is("1007654321")))
                .andExpect(jsonPath("$.accounts[1].accountType", is("CURRENT")))
                .andExpect(jsonPath("$.accounts[1].status", is("FROZEN")))
                .andExpect(jsonPath("$.accounts[1].jointAccount", is(true)));

        verify(dashboardService, times(1)).getDashboard();
    }

    @Test
    @DisplayName("GET /api/customer/dashboard - Returns 400 BAD_REQUEST when customer record not found")
    void getDashboard_CustomerNotFound_Returns400() throws Exception {
        when(dashboardService.getDashboard())
                .thenThrow(new IllegalStateException("Authenticated customer record was not found."));

        mockMvc.perform(get(DASHBOARD_URL)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")))
                .andExpect(jsonPath("$.message", is("Authenticated customer record was not found.")));

        verify(dashboardService, times(1)).getDashboard();
    }

    @Test
    @DisplayName("GET /api/customer/dashboard - Returns 500 INTERNAL_SERVER_ERROR when unexpected RuntimeException occurs")
    void getDashboard_AuthenticationFailure_Returns500() throws Exception {
        when(dashboardService.getDashboard())
                .thenThrow(new RuntimeException("Customer authentication is required."));

        mockMvc.perform(get(DASHBOARD_URL)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code", is("INTERNAL_SERVER_ERROR")))
                .andExpect(jsonPath("$.message", is("Customer authentication is required.")));

        verify(dashboardService, times(1)).getDashboard();
    }
}
