package com.corebanking.controller;

import com.corebanking.dto.MerchantPaymentRequest;
import com.corebanking.dto.PaymentDetailsResponse;
import com.corebanking.dto.PaymentReceiptResponse;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.InvalidPinException;
import com.corebanking.exception.TransactionException;
import com.corebanking.service.MerchantAuthorizationEngine;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.ResourceAccessException;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer/merchant-payment")
@RequiredArgsConstructor
public class MerchantPaymentController {

    private final MerchantAuthorizationEngine authorizationEngine;

    @GetMapping("/request/{token}")
    public ResponseEntity<PaymentDetailsResponse> getPaymentDetails(@PathVariable String token) {
        if (token == null || !token.matches("^[a-zA-Z0-9_-]{1,64}$")) {
            throw new TransactionException("Invalid payment token format");
        }
        return ResponseEntity.ok(authorizationEngine.getPaymentDetails(token));
    }

    @PostMapping("/authorize")
    public ResponseEntity<PaymentReceiptResponse> authorizePayment(@Valid @RequestBody MerchantPaymentRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || authentication.getName() == null || "anonymousUser".equals(authentication.getName())) {
            throw new CusAuthenticationException("Customer authentication required");
        }

        try {
            UUID customerId = UUID.fromString(authentication.getName());
            request.setCustomerId(customerId);
        } catch (IllegalArgumentException e) {
            throw new CusAuthenticationException("Invalid customer identity in token");
        }

        PaymentReceiptResponse receipt = authorizationEngine.processPaymentAuthorization(request);
        return ResponseEntity.ok(receipt);
    }

    // Local handler ONLY for MerchantPaymentController:
    // Returns 400 instead of 401 on wrong PIN so React's Axios interceptor doesn't trigger a logout/refresh loop
    @ExceptionHandler(InvalidPinException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidPinLocally(InvalidPinException ex) {
        Map<String, Object> errorBody = new LinkedHashMap<>();
        errorBody.put("success", false);
        errorBody.put("timestamp", LocalDateTime.now());
        errorBody.put("status", HttpStatus.BAD_REQUEST.value());
        errorBody.put("code", "INVALID_PIN");
        errorBody.put("error", HttpStatus.BAD_REQUEST.getReasonPhrase());
        errorBody.put("message", ex.getMessage());
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errorBody);
    }

    // Local handler ONLY for MerchantPaymentController:
    // Translates Gateway offline / unreachable errors into 503 SERVICE_UNAVAILABLE (or 400 for standard tx failures)
    // without polluting the shared GlobalExceptionHandler used by other teammates.
    @ExceptionHandler(TransactionException.class)
    public ResponseEntity<Map<String, Object>> handleTransactionExceptionLocally(TransactionException ex) {
        HttpStatus status = HttpStatus.BAD_REQUEST;
        String code = "TRANSACTION_FAILED";

        if (ex.getMessage() != null &&
                (ex.getMessage().toLowerCase().contains("unreachable") || ex.getMessage().toLowerCase().contains("offline"))) {
            status = HttpStatus.SERVICE_UNAVAILABLE;
            code = "GATEWAY_UNAVAILABLE";
        }

        Map<String, Object> errorBody = new LinkedHashMap<>();
        errorBody.put("success", false);
        errorBody.put("timestamp", LocalDateTime.now());
        errorBody.put("status", status.value());
        errorBody.put("code", code);
        errorBody.put("error", status.getReasonPhrase());
        errorBody.put("message", ex.getMessage());
        return ResponseEntity.status(status).body(errorBody);
    }

    @ExceptionHandler(ResourceAccessException.class)
    public ResponseEntity<Map<String, Object>> handleResourceAccessExceptionLocally(ResourceAccessException ex) {
        Map<String, Object> errorBody = new LinkedHashMap<>();
        errorBody.put("success", false);
        errorBody.put("timestamp", LocalDateTime.now());
        errorBody.put("status", HttpStatus.SERVICE_UNAVAILABLE.value());
        errorBody.put("code", "GATEWAY_UNAVAILABLE");
        errorBody.put("error", HttpStatus.SERVICE_UNAVAILABLE.getReasonPhrase());
        errorBody.put("message", "Gateway is currently unreachable. Please try again later.");
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(errorBody);
    }
}
