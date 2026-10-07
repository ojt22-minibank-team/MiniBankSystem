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
import org.springframework.web.bind.annotation.*;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer/merchant-payment")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MerchantPaymentController {

    private final MerchantAuthorizationEngine authorizationEngine;

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
        
        PaymentReceiptResponse receipt = authorizationEngine.processPaymentAuthorization(request);
        return ResponseEntity.ok(receipt);
    }
}
