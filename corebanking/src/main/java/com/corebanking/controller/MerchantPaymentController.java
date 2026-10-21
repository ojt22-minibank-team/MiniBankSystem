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
}