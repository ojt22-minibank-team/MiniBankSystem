package com.corebanking.integration.adapter;

import com.corebanking.dto.PaymentDetailsResponse;
import com.corebanking.exception.TransactionException;
import com.corebanking.integration.port.GatewayOutboundPort;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${group3.gateway.base-url:http://42.156.32.114:8093}")
    private String gatewayBaseUrl;

    @Value("${group3.gateway.internal-key:MMSPG-SEC-KEY-2026}")
    private String internalApiKey;

    private String getNormalizedGatewayUrl(String endpoint) {
        String base = gatewayBaseUrl != null ? gatewayBaseUrl.trim() : "http://42.156.32.114:8093";
        base = base.replaceAll("/+$", "");
        if (base.endsWith("/api/v1")) {
            base = base.substring(0, base.length() - "/api/v1".length());
        }
        return base + endpoint;
    }

    @Override
    public PaymentDetailsResponse fetchPaymentDetails(String paymentToken) {
        log.info("Fetching real payment details from Group 3 Gateway for token: {}", paymentToken);

        try {
            String url = getNormalizedGatewayUrl("/api/v1/payments/checkout-info/{token}");

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
                PaymentDetailsResponse details = response.getBody();
                if (details.getOrderId() != null) {
                    details.setOrderId(PaymentDetailsResponse.formatOrderId(details.getOrderId()));
                }
                return details;
            } else {
                throw new TransactionException("Failed to fetch payment details from Group 3.");
            }
        } catch (HttpStatusCodeException httpEx) {
            log.error("Group 3 rejected checkout-info for token {}. Status: {}, ResponseBody: {}",
                    paymentToken, httpEx.getStatusCode(), httpEx.getResponseBodyAsString());

            if (httpEx.getStatusCode() == HttpStatus.NOT_FOUND || httpEx.getStatusCode() == HttpStatus.GONE) {
                throw new TransactionException("This payment link is invalid or has expired.");
            } else if (httpEx.getStatusCode().is5xxServerError()) {
                throw new TransactionException("Payment Gateway is currently experiencing internal errors. Please try again later.");
            } else if (httpEx.getStatusCode() == HttpStatus.UNAUTHORIZED || httpEx.getStatusCode() == HttpStatus.FORBIDDEN) {
                throw new TransactionException("Payment Gateway access denied. Invalid internal service key.");
            }

            String responseBody = httpEx.getResponseBodyAsString();
            if (responseBody != null && !responseBody.isBlank()) {
                try {
                    JsonNode node = objectMapper.readTree(responseBody);
                    if (node.has("error") && !node.get("error").asText().isBlank()) {
                        throw new TransactionException(node.get("error").asText());
                    } else if (node.has("message") && !node.get("message").asText().isBlank()) {
                        throw new TransactionException(node.get("message").asText());
                    }
                } catch (TransactionException te) {
                    throw te;
                } catch (Exception ignored) {
                }
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
            String url = getNormalizedGatewayUrl("/api/v1/payments/authorize");

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
            log.error("Gateway rejected payment authorization. Status: {}, Body: {}", httpEx.getStatusCode(), httpEx.getResponseBodyAsString());
            String responseBody = httpEx.getResponseBodyAsString();
            if (responseBody != null && !responseBody.isBlank()) {
                try {
                    JsonNode node = objectMapper.readTree(responseBody);
                    if (node.has("error") && !node.get("error").asText().isBlank()) {
                        throw new TransactionException(node.get("error").asText());
                    } else if (node.has("message") && !node.get("message").asText().isBlank()) {
                        throw new TransactionException(node.get("message").asText());
                    }
                } catch (TransactionException te) {
                    throw te;
                } catch (Exception ignored) {
                }
            }
            throw new TransactionException("Payment was rejected by Gateway. The payment link may have expired or is invalid.");
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
