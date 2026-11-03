package com.corebanking.controller;

import com.corebanking.dto.GatewayAccountVerificationRequestDto;
import com.corebanking.dto.GatewayAccountVerificationResponseDto;
import com.corebanking.service.GatewayAccountVerificationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/payments/gateway")
@RequiredArgsConstructor
public class GatewayAccountController {

    private final GatewayAccountVerificationService verificationService;

    @PostMapping("/verify-corporate-account")
    public ResponseEntity<GatewayAccountVerificationResponseDto> verifyCorporateAccount(
            @Valid @RequestBody GatewayAccountVerificationRequestDto request) {
        return ResponseEntity.ok(verificationService.verifyCorporateAccount(request.getAccountNumber()));
    }

    @GetMapping("/verify-corporate-account/{accountNumber}")
    public ResponseEntity<GatewayAccountVerificationResponseDto> verifyCorporateAccountByPath(
            @PathVariable String accountNumber) {
        return ResponseEntity.ok(verificationService.verifyCorporateAccount(accountNumber));
    }
}
