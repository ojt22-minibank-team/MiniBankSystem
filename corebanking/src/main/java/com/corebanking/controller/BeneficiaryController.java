package com.corebanking.controller;

import com.corebanking.dto.BeneficiaryRequestDto;
import com.corebanking.dto.BeneficiaryResponseDto;
import com.corebanking.service.BeneficiaryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer/beneficiaries")
@RequiredArgsConstructor
public class BeneficiaryController {

    private final BeneficiaryService beneficiaryService;

    @GetMapping
    public ResponseEntity<List<BeneficiaryResponseDto>> getMyBeneficiaries(
            @AuthenticationPrincipal String customerId) {
        List<BeneficiaryResponseDto> list = beneficiaryService.getMyBeneficiaries(customerId);
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<BeneficiaryResponseDto> addBeneficiary(
            @AuthenticationPrincipal String customerId,
            @Valid @RequestBody BeneficiaryRequestDto request) {
        BeneficiaryResponseDto response = beneficiaryService.addBeneficiary(customerId, request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @DeleteMapping("/{beneficiaryId}")
    public ResponseEntity<Map<String, Object>> deleteBeneficiary(
            @AuthenticationPrincipal String customerId,
            @PathVariable UUID beneficiaryId) {
        beneficiaryService.deleteBeneficiary(customerId, beneficiaryId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Beneficiary removed successfully"
        ));
    }
}