package com.corebanking.controller;

import com.corebanking.dto.EcommercePaymentRequestDto;
import com.corebanking.dto.EcommercePaymentResponseDto;
import com.corebanking.service.EcommercePaymentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments/ecommerce")
@RequiredArgsConstructor
public class EcommercePaymentController {

    private final EcommercePaymentService ecommercePaymentService;

    @PostMapping("/checkout")
    public ResponseEntity<EcommercePaymentResponseDto> executeEcommercePayment(
            @RequestHeader(value = "Idempotency-Key", required = false) String headerIdempotencyKey,
            @Valid @RequestBody EcommercePaymentRequestDto request) {

        String idempotencyKey = (headerIdempotencyKey != null && !headerIdempotencyKey.isBlank())
                ? headerIdempotencyKey
                : request.getIdempotencyKey();

        EcommercePaymentResponseDto response = ecommercePaymentService.processEcommercePayment(
                request,
                idempotencyKey
        );

        return ResponseEntity.ok(response);
    }
}
