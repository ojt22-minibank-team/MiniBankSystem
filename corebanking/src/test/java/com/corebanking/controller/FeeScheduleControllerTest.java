package com.corebanking.controller;

import com.corebanking.dto.FeeScheduleCreateRequest;
import com.corebanking.dto.FeeScheduleResponse;
import com.corebanking.dto.FeeScheduleUpdateRequest;
import com.corebanking.entity.enums.FeeType;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.SystemRulesConfigService;
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
import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Fee Schedules Unit Tests - Controller Layer")
class FeeScheduleControllerTest {

    @Mock
    private SystemRulesConfigService systemRulesConfigService;

    @InjectMocks
    private SystemRulesConfigController systemRulesConfigController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private static final String FEES_URL = "/api/admin/system-rules/fees";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(systemRulesConfigController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("POST /fees should return 201 Created on valid request")
    void createFee_Success() throws Exception {
        FeeScheduleCreateRequest request = new FeeScheduleCreateRequest();
        request.setFeeCode("FEE-TRANSFER");
        request.setTransactionType(TransactionType.INTERNAL_TRANSFER);
        request.setFeeType(FeeType.FLAT);
        request.setFeeValue(new BigDecimal("200.0000"));
        request.setCurrency("MMK");
        request.setActiveFrom(LocalDateTime.now());

        FeeScheduleResponse response = FeeScheduleResponse.builder()
                .feeScheduleId(1)
                .feeCode("FEE-TRANSFER")
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .feeType(FeeType.FLAT)
                .feeValue(new BigDecimal("200.0000"))
                .currency("MMK")
                .active(true)
                .build();

        when(systemRulesConfigService.createFee(any(FeeScheduleCreateRequest.class))).thenReturn(response);

        mockMvc.perform(post(FEES_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.feeCode", is("FEE-TRANSFER")))
                .andExpect(jsonPath("$.feeValue", is(200.0)))
                .andExpect(jsonPath("$.active", is(true)));

        verify(systemRulesConfigService).createFee(any(FeeScheduleCreateRequest.class));
    }

    @Test
    @DisplayName("POST /fees should return 400 Bad Request on invalid request")
    void createFee_ValidationErrors() throws Exception {
        FeeScheduleCreateRequest invalid = new FeeScheduleCreateRequest();
        // Missing all required fields

        mockMvc.perform(post(FEES_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));

        verify(systemRulesConfigService, never()).createFee(any());
    }

    @Test
    @DisplayName("GET /fees should return 200 OK and list of fee schedules")
    void getAllFees_ReturnsList() throws Exception {
        FeeScheduleResponse fee = FeeScheduleResponse.builder()
                .feeScheduleId(1)
                .feeCode("FEE-DEPOSIT")
                .build();

        when(systemRulesConfigService.getAllFees()).thenReturn(List.of(fee));

        mockMvc.perform(get(FEES_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].feeCode", is("FEE-DEPOSIT")));
    }

    @Test
    @DisplayName("GET /fees/{id} should return 200 OK with fee schedule details")
    void getFeeById_Success() throws Exception {
        FeeScheduleResponse fee = FeeScheduleResponse.builder()
                .feeScheduleId(5)
                .feeCode("FEE-OTC")
                .build();

        when(systemRulesConfigService.getFeeById(5)).thenReturn(fee);

        mockMvc.perform(get(FEES_URL + "/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.feeScheduleId", is(5)))
                .andExpect(jsonPath("$.feeCode", is("FEE-OTC")));
    }

    @Test
    @DisplayName("PUT /fees/{id} should return 200 OK with updated fee schedule")
    void updateFee_Success() throws Exception {
        FeeScheduleUpdateRequest request = new FeeScheduleUpdateRequest();
        request.setTransactionType(TransactionType.OTC_DEPOSIT);
        request.setFeeType(FeeType.FLAT);
        request.setFeeValue(new BigDecimal("300.0000"));
        request.setCurrency("MMK");
        request.setActiveFrom(LocalDateTime.now());

        FeeScheduleResponse response = FeeScheduleResponse.builder()
                .feeScheduleId(5)
                .feeCode("FEE-OTC")
                .transactionType(TransactionType.OTC_DEPOSIT)
                .feeType(FeeType.FLAT)
                .feeValue(new BigDecimal("300.0000"))
                .currency("MMK")
                .active(true)
                .build();

        when(systemRulesConfigService.updateFee(eq(5), any(FeeScheduleUpdateRequest.class))).thenReturn(response);

        mockMvc.perform(put(FEES_URL + "/5")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.feeValue", is(300.0)));
    }

    @Test
    @DisplayName("PATCH /fees/{id}/activate should return 200 OK and active=true")
    void activateFee_Success() throws Exception {
        FeeScheduleResponse response = FeeScheduleResponse.builder()
                .feeScheduleId(5)
                .feeCode("FEE-OTC")
                .active(true)
                .build();

        when(systemRulesConfigService.activateFee(5)).thenReturn(response);

        mockMvc.perform(patch(FEES_URL + "/5/activate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active", is(true)));

        verify(systemRulesConfigService).activateFee(5);
    }

    @Test
    @DisplayName("PATCH /fees/{id}/deactivate should return 200 OK and active=false")
    void deactivateFee_Success() throws Exception {
        FeeScheduleResponse response = FeeScheduleResponse.builder()
                .feeScheduleId(5)
                .feeCode("FEE-OTC")
                .active(false)
                .build();

        when(systemRulesConfigService.deactivateFee(5)).thenReturn(response);

        mockMvc.perform(patch(FEES_URL + "/5/deactivate"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active", is(false)));

        verify(systemRulesConfigService).deactivateFee(5);
    }
}
