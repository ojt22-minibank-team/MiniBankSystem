package com.corebanking.controller;

import com.corebanking.dto.EcommercePaymentRequestDto;
import com.corebanking.dto.EcommercePaymentResponseDto;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.exception.TransactionException;
import com.corebanking.service.EcommercePaymentService;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class EcommercePaymentControllerTest {

    @Mock
    private EcommercePaymentService ecommercePaymentService;

    @InjectMocks
    private EcommercePaymentController ecommercePaymentController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "/api/v1/payments/ecommerce/checkout";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(ecommercePaymentController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("POST /checkout - success with header Idempotency-Key taking precedence")
    void executeEcommercePayment_Success_HeaderKey() throws Exception {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("50000.00"))
                .serviceFee(new BigDecimal("1000.00"))
                .currency("MMK")
                .orderId("ORD-101")
                .idempotencyKey("BODY-KEY-1")
                .description("E-commerce Payment")
                .build();

        EcommercePaymentResponseDto response = EcommercePaymentResponseDto.builder()
                .transactionRef("TXN-ECOM-12345")
                .orderId("ORD-101")
                .status(TransactionStatus.COMPLETED)
                .amount(new BigDecimal("50000.00"))
                .serviceFee(new BigDecimal("1000.00"))
                .netMerchantAmount(new BigDecimal("49000.00"))
                .totalDebitedAmount(new BigDecimal("50000.00"))
                .currency("MMK")
                .completedAt(LocalDateTime.now())
                .message("E-Commerce payment completed successfully.")
                .build();

        when(ecommercePaymentService.processEcommercePayment(any(EcommercePaymentRequestDto.class), eq("HEADER-KEY-1")))
                .thenReturn(response);

        mockMvc.perform(post(BASE_URL)
                        .header("Idempotency-Key", "HEADER-KEY-1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionRef", is("TXN-ECOM-12345")))
                .andExpect(jsonPath("$.orderId", is("ORD-101")))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.amount", is(50000.00)))
                .andExpect(jsonPath("$.serviceFee", is(1000.00)))
                .andExpect(jsonPath("$.netMerchantAmount", is(49000.00)))
                .andExpect(jsonPath("$.message", is("E-Commerce payment completed successfully.")));

        verify(ecommercePaymentService).processEcommercePayment(any(), eq("HEADER-KEY-1"));
    }

    @Test
    @DisplayName("POST /checkout - success falling back to body Idempotency-Key when header is missing")
    void executeEcommercePayment_Success_BodyKey() throws Exception {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("20000.00"))
                .serviceFee(new BigDecimal("500.00"))
                .currency("MMK")
                .orderId("ORD-102")
                .idempotencyKey("BODY-KEY-ONLY")
                .build();

        EcommercePaymentResponseDto response = EcommercePaymentResponseDto.builder()
                .transactionRef("TXN-ECOM-67890")
                .status(TransactionStatus.COMPLETED)
                .build();

        when(ecommercePaymentService.processEcommercePayment(any(EcommercePaymentRequestDto.class), eq("BODY-KEY-ONLY")))
                .thenReturn(response);

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionRef", is("TXN-ECOM-67890")));

        verify(ecommercePaymentService).processEcommercePayment(any(), eq("BODY-KEY-ONLY"));
    }

    @Test
    @DisplayName("POST /checkout - 400 Bad Request on blank source account")
    void executeEcommercePayment_BlankSourceAccount_ReturnsBadRequest() throws Exception {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("") // Blank
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("50000.00"))
                .serviceFee(new BigDecimal("1000.00"))
                .orderId("ORD-101")
                .idempotencyKey("KEY-1")
                .build();

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(ecommercePaymentService);
    }

    @Test
    @DisplayName("POST /checkout - 400 Bad Request on amount below minimum (100 MMK)")
    void executeEcommercePayment_AmountBelowMin_ReturnsBadRequest() throws Exception {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("50.00")) // < 100.00
                .serviceFee(new BigDecimal("10.00"))
                .orderId("ORD-101")
                .idempotencyKey("KEY-1")
                .build();

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(ecommercePaymentService);
    }

    @Test
    @DisplayName("POST /checkout - transaction exception maps to error response")
    void executeEcommercePayment_TransactionException_Mapped() throws Exception {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("50000.00"))
                .serviceFee(new BigDecimal("1000.00"))
                .currency("MMK")
                .orderId("ORD-101")
                .idempotencyKey("KEY-ERR")
                .build();

        when(ecommercePaymentService.processEcommercePayment(any(), any()))
                .thenThrow(new TransactionException("Merchant settlement account is not ACTIVE."));

        mockMvc.perform(post(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }
}
