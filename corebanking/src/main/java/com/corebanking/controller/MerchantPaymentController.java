package com.corebanking.controller;

import com.corebanking.dto.MerchantPaymentRequest;
import com.corebanking.dto.PaymentDetailsResponse;
import com.corebanking.dto.PaymentReceiptResponse;
import com.corebanking.service.MerchantAuthorizationEngine;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/merchant-payment")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MerchantPaymentController {

    private final MerchantAuthorizationEngine authorizationEngine;
    private final PasswordEncoder passwordEncoder;

    @GetMapping("/generate-hash")
    public String generateHash(@RequestParam String pin) {
        return passwordEncoder.encode(pin);
    }

    @GetMapping("/request/{token}")
    public ResponseEntity<PaymentDetailsResponse> getPaymentDetails(@PathVariable String token) {
        return ResponseEntity.ok(authorizationEngine.getPaymentDetails(token));
    }

    @PostMapping("/authorize")
    public ResponseEntity<PaymentReceiptResponse> authorizePayment(@Valid @RequestBody MerchantPaymentRequest request) {
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getName() != null && !authentication.getName().equals("anonymousUser")) {
            try {
                UUID customerId = UUID.fromString(authentication.getName());
                request.setCustomerId(customerId);
            } catch (IllegalArgumentException e) {
               
            }
        }
        
        String ledgerReference = authorizationEngine.processPaymentAuthorization(request);

        PaymentReceiptResponse receipt = PaymentReceiptResponse.builder()
                .success(true)
                .message("Payment authorized successfully")
                .paymentToken(request.getPaymentToken())
                .coreLedgerReference(ledgerReference)
                .amount(request.getAmount())
                .currency("MMK")
                .timestamp(java.time.LocalDateTime.now())
                .build();

        return ResponseEntity.ok(receipt);
    }
}
