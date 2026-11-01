package com.corebanking.integration.adapter;

import com.corebanking.dto.PaymentDetailsResponse;
import com.corebanking.exception.TransactionException;
import com.corebanking.integration.port.GatewayOutboundPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class GatewayIntegrationAdapter implements GatewayOutboundPort {

    private final RestTemplate restTemplate;

    @Value("${group3.gateway.base-url:http://localhost:8004}")
    private String gatewayBaseUrl;

    @Value("${group3.gateway.internal-key:MMSPG-SEC-KEY-2026}")
    private String internalApiKey;

    @Override
    public PaymentDetailsResponse fetchPaymentDetails(String paymentToken) {
        log.info("Fetching real payment details from Group 3 Gateway for token: {}", paymentToken);

        try {
            String url = gatewayBaseUrl + "/api/v1/payments/checkout-info/{token}";

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Service-Key", internalApiKey);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));
            HttpEntity<Void> requestEntity = new HttpEntity<>(headers);

            ResponseEntity<PaymentDetailsResponse> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    requestEntity,
                    PaymentDetailsResponse.class,
                    paymentToken
            );

            if (response.getStatusCode() == HttpStatus.OK && response.getBody() != null) {
                return response.getBody();
            } else {
                throw new TransactionException("Failed to fetch payment details from Group 3.");
            }
        } catch (HttpStatusCodeException httpEx) {
            log.warn("Group 3 rejected checkout-info for token {}. Status: {}", paymentToken, httpEx.getStatusCode());
            if (httpEx.getStatusCode() == HttpStatus.NOT_FOUND || httpEx.getStatusCode() == HttpStatus.GONE) {
                throw new TransactionException("This payment link is invalid or has expired.");
            }
            throw new TransactionException("This transaction has already been processed or the payment link is invalid.");
        } catch (ResourceAccessException raEx) {
            log.error("Group 3 Gateway connection failed or timed out for token {}: {}", paymentToken, raEx.getMessage());
            throw new TransactionException("Gateway is currently unreachable. Please try again later.");
        } catch (TransactionException transEx) {
            throw transEx;
        } catch (Exception e) {
            log.error("Could not reach Group 3 checkout-info API: {}", e.getMessage());
            throw new TransactionException("Gateway is currently unreachable. Please try again later.");
        }
    }

    @Override
    public String dispatchAuthorizationOutcome(
            String paymentToken,
            String transactionStatus,
            String sourceAccountNumber,
            String errorCode,
            String errorMessage) {

        log.info("Sending Authorization to Group 3 Gateway for token: {} with status: {}", paymentToken, transactionStatus);

        try {
            String url = gatewayBaseUrl + "/api/v1/payments/authorize";

            // Strictly conform to Group 3's required payload contract:
            // paymentToken, status, sourceAccountNumber, errorCode, errorMessage
            Map<String, String> request = new HashMap<>();
            request.put("paymentToken", paymentToken);
            request.put("status", transactionStatus);
            if (sourceAccountNumber != null && !sourceAccountNumber.isBlank()) {
                request.put("sourceAccountNumber", sourceAccountNumber);
            }
            if (errorCode != null && !errorCode.isBlank()) {
                request.put("errorCode", errorCode);
            }
            if (errorMessage != null && !errorMessage.isBlank()) {
                request.put("errorMessage", errorMessage);
            }

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Internal-Service-Key", internalApiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setAccept(Collections.singletonList(MediaType.APPLICATION_JSON));

            HttpEntity<Map<String, String>> requestEntity = new HttpEntity<>(request, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(url, requestEntity, Map.class);

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new TransactionException("Payment Authorization rejected by Gateway.");
            }

            Map<?, ?> responseBody = response.getBody();
            if ("AUTHORIZED".equalsIgnoreCase(transactionStatus) && "FAILED".equalsIgnoreCase(String.valueOf(responseBody.get("status")))) {
                String failureReason = (String) responseBody.get("failureReason");
                if (failureReason == null) {
                    failureReason = (String) responseBody.get("errorMessage");
                }
                throw new TransactionException(failureReason != null ? failureReason : "Payment settlement failed at Gateway.");
            }

            Object txnRef = responseBody.get("transactionReference");
            if (txnRef == null) {
                txnRef = responseBody.get("referenceNumber");
            }
            if (txnRef != null && !String.valueOf(txnRef).isBlank()) {
                return String.valueOf(txnRef);
            }

            return "AUTH-SUCCESS-" + paymentToken;

        } catch (HttpStatusCodeException httpEx) {
            log.warn("Gateway rejected the payment (Likely expired). Status: {}", httpEx.getStatusCode());
            throw new TransactionException("Payment was rejected by Gateway. The payment link may have expired.");
        } catch (ResourceAccessException raEx) {
            log.error("Group 3 Gateway connection failed or timed out during authorization for token {}: {}", paymentToken, raEx.getMessage());
            throw new TransactionException("Gateway is currently unreachable. Payment could not be authorized.");
        } catch (TransactionException transEx) {
            throw transEx;
        } catch (Exception e) {
            log.warn("Could not reach Group 3 Gateway Server. Error: {}", e.getMessage());
            throw new TransactionException("Gateway is currently unreachable. Payment could not be authorized.");
        }
    }
}
