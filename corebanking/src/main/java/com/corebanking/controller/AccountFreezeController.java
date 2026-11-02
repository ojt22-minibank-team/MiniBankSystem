package com.corebanking.controller;

import com.corebanking.dto.AccountFreezeRequestDto;
import com.corebanking.dto.AccountFreezeResponseDto;
import com.corebanking.service.AccountFreezeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * REST Controller for Staff-initiated account freeze and unfreeze actions.
 * Secured by Spring Security RBAC permitting only ADMIN and TELLER roles.
 */
@Slf4j
@Validated
@RestController
@RequestMapping("/api/v1/staff/accounts")
@RequiredArgsConstructor
public class AccountFreezeController {

    private final AccountFreezeService accountFreezeService;

    /**
     * Freezes a customer account upon fraud detection or administrative hold.
     *
     * @param accountId UUID of the account to freeze
     * @param request mandatory freeze reason DTO
     * @return response DTO containing updated status
     */
    @PutMapping("/{accountId}/freeze")
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER')")
    public ResponseEntity<AccountFreezeResponseDto> freezeAccount(
            @PathVariable UUID accountId,
            @Valid @RequestBody AccountFreezeRequestDto request) {
        log.info("REST request to freeze accountId={}", accountId);
        AccountFreezeResponseDto response = accountFreezeService.freezeAccount(accountId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Unfreezes and reactivates a frozen customer account.
     *
     * @param accountId UUID of the account to unfreeze
     * @param request mandatory unfreeze reason DTO
     * @return response DTO containing updated status
     */
    @PutMapping("/{accountId}/unfreeze")
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER')")
    public ResponseEntity<AccountFreezeResponseDto> unfreezeAccount(
            @PathVariable UUID accountId,
            @Valid @RequestBody AccountFreezeRequestDto request) {
        log.info("REST request to unfreeze accountId={}", accountId);
        AccountFreezeResponseDto response = accountFreezeService.unfreezeAccount(accountId, request);
        return ResponseEntity.ok(response);
    }
}
