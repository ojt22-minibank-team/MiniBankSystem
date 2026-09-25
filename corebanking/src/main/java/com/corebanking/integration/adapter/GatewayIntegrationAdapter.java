package com.corebanking.integration.adapter;

import com.corebanking.dto.PaymentDetailsResponse;
import com.corebanking.exception.TransactionException;
import com.corebanking.integration.port.GatewayOutboundPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class GatewayIntegrationAdapter implements GatewayOutboundPort {

    private final RestTemplate restTemplate;
    
    private final String gatewayBaseUrl = "http://localhost:8081"; 

    @Override
    public PaymentDetailsResponse fetchPaymentDetails(String paymentToken) {
        log.info("Fetching real payment details from Group 3 Gateway for token: {}", paymentToken);
        
        try {
            String url = gatewayBaseUrl + "/api/v1/payments/checkout-info/" + paymentToken;
            ResponseEntity<PaymentDetailsResponse> response = restTemplate.getForEntity(url, PaymentDetailsResponse.class);
            
            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            } else {
                throw new TransactionException("Failed to fetch payment details from Group 3.");
            }
        } catch (Exception e) {
            log.error("Could not reach Group 3 checkout-info API: {}", e.getMessage());
            throw new TransactionException("Gateway is offline or Token is invalid.");
        }
    }

    @Override
    public void dispatchAuthorizationOutcome(String paymentToken, String transactionStatus, UUID customerId) {
        log.info("Sending Authorization to Group 3 Gateway for token: {} with status: {}", paymentToken, transactionStatus);
        
        try {
            String url = gatewayBaseUrl + "/api/v1/payments/authorize";
            
            Map<String, String> request = new HashMap<>();
            request.put("paymentToken", paymentToken);
            request.put("status", transactionStatus);
            if (customerId != null) {
                request.put("customerId", customerId.toString());
            }

            ResponseEntity<Void> response = restTemplate.postForEntity(url, request, Void.class);
            
            if (response.getStatusCode() != HttpStatus.OK) {
                throw new TransactionException("Payment Authorization rejected by Gateway.");
            }
            
        } catch (Exception e) {
            log.warn("Could not reach Group 3 Gateway Server. Error: {}", e.getMessage());
            
            throw new TransactionException("Gateway is offline. Payment could not be authorized.");
        }
    }
}
