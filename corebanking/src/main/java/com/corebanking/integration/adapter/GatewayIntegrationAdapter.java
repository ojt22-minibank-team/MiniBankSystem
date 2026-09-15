package com.corebanking.integration.adapter;

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
    public void dispatchAuthorizationOutcome(String paymentToken, String transactionStatus) {
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
