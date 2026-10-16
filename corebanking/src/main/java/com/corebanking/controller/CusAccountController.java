package com.corebanking.controller;

import com.corebanking.dto.CusAccountResponseDTO;
import com.corebanking.dto.TransferLimitInfoResponseDto;
import com.corebanking.dto.UpdateTransferLimitRequestDto;
import com.corebanking.service.CusAccountService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer/accounts")
@RequiredArgsConstructor
public class CusAccountController {

    private final CusAccountService customerAccountService;

    /**
     * Get all accounts belonging to logged-in customer
     */
    @GetMapping
    public ResponseEntity<List<CusAccountResponseDTO>> getMyAccounts() {

        List<CusAccountResponseDTO> accounts =
                customerAccountService.getMyAccounts();

        return ResponseEntity.ok(accounts);
    }

    /**
     * Get one account belonging to logged-in customer
     */
    @GetMapping("/{accountNumber}")
    public ResponseEntity<CusAccountResponseDTO> getMyAccount(
            @PathVariable String accountNumber) {

        CusAccountResponseDTO account =
                customerAccountService.getMyAccount(accountNumber);

        return ResponseEntity.ok(account);
    }

    /**
     * Get transfer limits info (bank max, custom limits, remaining) for an account
     */
    @GetMapping("/{accountNumber}/transfer-limits")
    public ResponseEntity<TransferLimitInfoResponseDto> getTransferLimits(
            @PathVariable String accountNumber) {

        TransferLimitInfoResponseDto limits =
                customerAccountService.getAccountTransferLimits(accountNumber);

        return ResponseEntity.ok(limits);
    }

    /**
     * Update customer custom transfer limits after verifying Transaction PIN
     */
    @PutMapping("/{accountNumber}/transfer-limits")
    public ResponseEntity<TransferLimitInfoResponseDto> updateTransferLimits(
            @PathVariable String accountNumber,
            @Valid @RequestBody UpdateTransferLimitRequestDto request) {

        TransferLimitInfoResponseDto updatedLimits =
                customerAccountService.updateAccountTransferLimits(accountNumber, request);

        return ResponseEntity.ok(updatedLimits);
    }
}