package com.corebanking.controller;

import com.corebanking.dto.MerchantPaymentRequest;
import com.corebanking.dto.PaymentDetailsResponse;
import com.corebanking.service.MerchantAuthorizationEngine;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


import com.corebanking.dto.PaymentReceiptResponse;

import org.springframework.web.bind.annotation.CrossOrigin;

@RestController
@RequestMapping("/api/v1/merchant-payment")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MerchantPaymentController {

    private final MerchantAuthorizationEngine authorizationEngine;
    private final PasswordEncoder passwordEncoder;

    // Temporary utility to generate a 100% correct BCrypt hash
    @GetMapping("/generate-hash")
    public String generateHash(@RequestParam String pin) {
        return passwordEncoder.encode(pin);
    }

    @GetMapping("/request/{token}")
    public ResponseEntity<PaymentDetailsResponse> getPaymentDetails(@org.springframework.web.bind.annotation.PathVariable String token) {
        return ResponseEntity.ok(authorizationEngine.getPaymentDetails(token));
    }

    @PostMapping("/authorize")
    public ResponseEntity<PaymentReceiptResponse> authorizePayment(@Valid @RequestBody MerchantPaymentRequest request) {
        
        // Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        // UUID customerId = UUID.fromString(authentication.getName());
        // request.setCustomerId(customerId);
        // -----------------------------------------------------------------------------------
        
        String ledgerReference = authorizationEngine.processPaymentAuthorization(request);

        PaymentReceiptResponse receipt = PaymentReceiptResponse.builder()
                .success(true)
                .message("Payment authorized successfully")
                .paymentToken(request.getPaymentToken())
                .coreLedgerReference(ledgerReference)
                .merchantAccountId(request.getMerchantAccountId())
                .amount(request.getAmount())
                .currency("MMK")
                .timestamp(java.time.LocalDateTime.now())
                .build();

        return ResponseEntity.ok(receipt);
    }
}