package com.corebanking.controller;

import com.corebanking.dto.AccountLookupResponseDto;
import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.dto.P2PTransferResponseDto;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.InvalidPinException;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.service.AsyncNotificationService;
import com.corebanking.service.AuditTrailService;
import com.corebanking.service.P2PTransferService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class P2PTransferControllerTest {

    private static final String BASE_URL = "/api/customer/transfers";
    private static final String CUSTOMER_ID = UUID.randomUUID().toString();

    @Mock
    private P2PTransferService p2pTransferService;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private AsyncNotificationService asyncNotificationService;

    @Mock
    private AuditTrailService auditTrailService;

    @InjectMocks
    private P2PTransferController p2pTransferController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        mockMvc = MockMvcBuilders.standaloneSetup(p2pTransferController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
                    }

                    @Override
                    public Object resolveArgument(MethodParameter parameter,
                                                  ModelAndViewContainer mavContainer,
                                                  NativeWebRequest webRequest,
                                                  WebDataBinderFactory binderFactory) {
                        return CUSTOMER_ID;
                    }
                })
                .build();
    }

    @Test
    @DisplayName("GET /api/customer/transfers/lookup/{accountNumber} - Returns account details")
    void testLookupAccount_Success() throws Exception {
        AccountLookupResponseDto lookupDto = AccountLookupResponseDto.builder()
                .accountNumber("2002222222")
                .accountName("Daw Mya")
                .accountType("SAVINGS")
                .status("ACTIVE")
                .build();

        when(p2pTransferService.lookupAccount("2002222222")).thenReturn(lookupDto);

        mockMvc.perform(get(BASE_URL + "/lookup/2002222222"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accountNumber", is("2002222222")))
                .andExpect(jsonPath("$.accountName", is("Daw Mya")))
                .andExpect(jsonPath("$.accountType", is("SAVINGS")))
                .andExpect(jsonPath("$.status", is("ACTIVE")));

        verify(p2pTransferService, times(1)).lookupAccount("2002222222");
    }

    @Test
    @DisplayName("GET /api/customer/transfers/lookup/{accountNumber} - AccountNotFound throws 404")
    void testLookupAccount_NotFound() throws Exception {
        when(p2pTransferService.lookupAccount("9999999999"))
                .thenThrow(new AccountNotFoundException("Account not found: 9999999999"));

        mockMvc.perform(get(BASE_URL + "/lookup/9999999999"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("POST /api/customer/transfers/p2p - Executes transfer successfully")
    void testExecuteP2PTransfer_Success() throws Exception {
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .idempotencyKey("IDEMP-001")
                .transactionPin("123456")
                .description("Gift")
                .build();

        P2PTransferResponseDto responseDto = P2PTransferResponseDto.builder()
                .transactionRef("TXN-P2P-20261103-0001")
                .status(TransactionStatus.COMPLETED)
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .serviceFee(BigDecimal.ZERO)
                .totalDebitedAmount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .completedAt(LocalDateTime.now())
                .description("Gift")
                .build();

        when(p2pTransferService.processP2PTransfer(eq(CUSTOMER_ID), any(), eq("IDEMP-001")))
                .thenReturn(responseDto);

        mockMvc.perform(post(BASE_URL + "/p2p")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionRef", is("TXN-P2P-20261103-0001")))
                .andExpect(jsonPath("$.status", is("COMPLETED")))
                .andExpect(jsonPath("$.sourceAccountNumber", is("2001111111")))
                .andExpect(jsonPath("$.destinationAccountNumber", is("2002222222")))
                .andExpect(jsonPath("$.amount", is(50000.0000)));

        verify(p2pTransferService, times(1)).processP2PTransfer(eq(CUSTOMER_ID), any(), eq("IDEMP-001"));
    }

    @Test
    @DisplayName("POST /api/customer/transfers/p2p - Header Idempotency-Key takes precedence")
    void testExecuteP2PTransfer_HeaderIdempotencyPrecedence() throws Exception {
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("30000.0000"))
                .currency("MMK")
                .idempotencyKey("BODY-KEY")
                .transactionPin("123456")
                .build();

        P2PTransferResponseDto responseDto = P2PTransferResponseDto.builder()
                .transactionRef("TXN-P2P-20261103-0002")
                .status(TransactionStatus.COMPLETED)
                .build();

        when(p2pTransferService.processP2PTransfer(eq(CUSTOMER_ID), any(), eq("HEADER-KEY-XYZ")))
                .thenReturn(responseDto);

        mockMvc.perform(post(BASE_URL + "/p2p")
                        .header("Idempotency-Key", "HEADER-KEY-XYZ")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk());

        verify(p2pTransferService).processP2PTransfer(eq(CUSTOMER_ID), any(), eq("HEADER-KEY-XYZ"));
    }

    @Test
    @DisplayName("POST /api/customer/transfers/p2p - Failure triggers audit logging and failed notification")
    void testExecuteP2PTransfer_FailureAuditAndNotification() throws Exception {
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("900000.0000"))
                .currency("MMK")
                .idempotencyKey("IDEMP-FAIL")
                .transactionPin("123456")
                .build();

        Customers sender = Customers.builder()
                .customerId(UUID.fromString(CUSTOMER_ID))
                .fullName("U Ba")
                .build();

        when(p2pTransferService.processP2PTransfer(eq(CUSTOMER_ID), any(), eq("IDEMP-FAIL")))
                .thenThrow(new InsufficientFundsException("Insufficient available funds"));
        when(customerRepository.findById(UUID.fromString(CUSTOMER_ID))).thenReturn(Optional.of(sender));

        mockMvc.perform(post(BASE_URL + "/p2p")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verify(auditTrailService, times(1)).logActivity(
                eq("TRANSACTION"),
                eq("P2P_TRANSFER_INSUFFICIENT_FUNDS"),
                eq("TRANSACTION"),
                eq("2001111111"),
                any()
        );

        verify(asyncNotificationService, times(1)).sendFailedTransferNotificationAsync(
                eq(sender),
                eq("2002222222"),
                eq(new BigDecimal("900000.0000")),
                eq("MMK"),
                eq("Insufficient available funds")
        );
    }

    @Test
    @DisplayName("POST /api/customer/transfers/p2p - InvalidPin logs SECURITY audit and skips notification")
    void testExecuteP2PTransfer_InvalidPin_NoNotification() throws Exception {
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("20000.0000"))
                .currency("MMK")
                .idempotencyKey("IDEMP-PIN")
                .transactionPin("999999")
                .build();

        when(p2pTransferService.processP2PTransfer(eq(CUSTOMER_ID), any(), eq("IDEMP-PIN")))
                .thenThrow(new InvalidPinException("Invalid transaction PIN"));

        mockMvc.perform(post(BASE_URL + "/p2p")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());

        verify(auditTrailService, times(1)).logActivity(
                eq("SECURITY"),
                eq("P2P_TRANSFER_INVALID_PIN"),
                eq("TRANSACTION"),
                eq("2001111111"),
                any()
        );

        // Security exceptions should not broadcast push notifications
        verifyNoInteractions(asyncNotificationService);
    }

    @Test
    @DisplayName("POST /api/customer/transfers/p2p/queued - Returns 202 ACCEPTED with PENDING status")
    void testExecuteP2PTransferQueued_Success() throws Exception {
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .idempotencyKey("IDEMP-QUEUED")
                .transactionPin("123456")
                .build();

        P2PTransferResponseDto pendingResponse = P2PTransferResponseDto.builder()
                .transactionRef("TXN-P2P-QUEUED-0001")
                .status(TransactionStatus.INITIATED)
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .build();

        when(p2pTransferService.enqueueP2PTransfer(eq(CUSTOMER_ID), any(), eq("IDEMP-QUEUED")))
                .thenReturn(pendingResponse);

        mockMvc.perform(post(BASE_URL + "/p2p/queued")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isAccepted())
                .andExpect(jsonPath("$.transactionRef", is("TXN-P2P-QUEUED-0001")))
                .andExpect(jsonPath("$.status", is("INITIATED")));

        verify(p2pTransferService, times(1)).enqueueP2PTransfer(eq(CUSTOMER_ID), any(), eq("IDEMP-QUEUED"));
    }

    @Test
    @DisplayName("POST /api/customer/transfers/{transactionRef}/reverse - Reverses transfer successfully")
    void testReverseTransfer_Success() throws Exception {
        BankTransactions reversedTxn = BankTransactions.builder()
                .transactionRef("TXN-REV-001")
                .status(TransactionStatus.REVERSED)
                .amount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .build();

        P2PTransferResponseDto responseDto = P2PTransferResponseDto.builder()
                .transactionRef("TXN-REV-001")
                .status(TransactionStatus.REVERSED)
                .amount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .build();

        when(p2pTransferService.executeAutoReversal(eq("TXN-REV-001"), eq("Test reversal"), eq("CLIENT_REQUESTED_REVERSAL")))
                .thenReturn(reversedTxn);
        when(p2pTransferService.mapToResponseDto(reversedTxn)).thenReturn(responseDto);

        mockMvc.perform(post(BASE_URL + "/TXN-REV-001/reverse")
                        .param("reason", "Test reversal"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.transactionRef", is("TXN-REV-001")))
                .andExpect(jsonPath("$.status", is("REVERSED")));

        verify(p2pTransferService, times(1))
                .executeAutoReversal(eq("TXN-REV-001"), eq("Test reversal"), eq("CLIENT_REQUESTED_REVERSAL"));
    }
}
