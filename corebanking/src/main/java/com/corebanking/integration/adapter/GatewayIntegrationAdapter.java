package com.corebanking.integration.adapter;

import com.corebanking.dto.PaymentDetailsResponse;
import com.corebanking.dto.PaymentStatusUpdateRequest;
import com.corebanking.integration.port.GatewayOutboundPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

@Slf4j
@Component
@RequiredArgsConstructor
public class GatewayIntegrationAdapter implements GatewayOutboundPort {

    private final RestTemplate restTemplate;

    @Override
    public PaymentDetailsResponse fetchPaymentDetails(String paymentToken) {
        log.info("Mock fetching details from Gateway for token: {}", paymentToken);
        
        // Dynamic Mocking based on Token
        switch (paymentToken) {
            case "PAY-TOK-COFFEE":
                return PaymentDetailsResponse.builder()
                        .merchantName("Starbucks (Mock)")
                        .merchantAccountId(java.util.UUID.fromString("22222222-2222-2222-2222-222222222222"))
                        .amount(new java.math.BigDecimal("5500.00"))
                        .currency("MMK")
                        .orderReference("ORD-COFFEE-001")
                        .build();
            case "PAY-TOK-IPHONE":
                return PaymentDetailsResponse.builder()
                        .merchantName("Apple Store (Mock)")
                        .merchantAccountId(java.util.UUID.fromString("22222222-2222-2222-2222-222222222222"))
                        .amount(new java.math.BigDecimal("2500000.00")) // 2.5 Million MMK
                        .currency("MMK")
                        .orderReference("ORD-IPHONE-004")
                        .build();
            case "PAY-TOK-LAPTOP":
                return PaymentDetailsResponse.builder()
                        .merchantName("Dell Store (Mock)")
                        .merchantAccountId(java.util.UUID.fromString("22222222-2222-2222-2222-222222222222"))
                        .amount(new java.math.BigDecimal("4500000.00"))
                        .currency("MMK")
                        .orderReference("ORD-LAPTOP-002")
                        .build();
            default: // Default case (PAY-TOK-123)
                return PaymentDetailsResponse.builder()
                        .merchantName("Apple Store (Mock)")
                        .merchantAccountId(java.util.UUID.fromString("22222222-2222-2222-2222-222222222222"))
                        .amount(new java.math.BigDecimal("3200000.00"))
                        .currency("MMK")
                        .orderReference("ORD-MOCK-123")
                        .build();
        }
    }

    @Override
    @org.springframework.scheduling.annotation.Async
    public void dispatchAuthorizationOutcome(String paymentToken, String transactionStatus) {
        log.info("Dispatching webhook for token {} with status {}", paymentToken, transactionStatus);
        try {
            PaymentStatusUpdateRequest request = PaymentStatusUpdateRequest.builder()
                    .paymentToken(paymentToken)
                    .status(transactionStatus)
                    .build();

            String url = "http://localhost:8081/api/v1/gateway/payments/status/update";
            try {
                restTemplate.postForEntity(url, request, Void.class);
                
                log.info("Successfully dispatched authorization outcome for paymentToken: {}", paymentToken);
            } catch (Exception e) {
                log.warn("Could not reach Group 3 Webhook (Server offline?). Payment succeeded locally. Error: {}", e.getMessage());
            }
        } catch (Exception e) {
            log.error("Failed to dispatch authorization outcome for paymentToken: {}. Error: {}", paymentToken, e.getMessage(), e);
        }
    }
}
