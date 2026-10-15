package com.corebanking.controller;

import com.corebanking.dto.TransactionFlagRequestDto;
import com.corebanking.dto.TransactionOverrideRequestDto;
import com.corebanking.dto.TransactionOverrideResponseDto;
import com.corebanking.service.TransactionOverrideService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for Staff-initiated transaction review, suspicious activity flagging,
 * and managerial overrides (release/reject).
 */
@Slf4j
@Validated
@RestController
@RequestMapping("/api/v1/staff/transactions")
@RequiredArgsConstructor
public class TransactionOverrideController {

    private final TransactionOverrideService transactionOverrideService;

    /**
     * Retrieve a paginated review queue of transactions that are held or pending authorization.
     *
     * @param status optional status filter (e.g. HELD, PENDING_AUTHORIZATION)
     * @param pageable pagination parameters (default 20 items sorted by updatedAt descending)
     * @return paginated list of transaction summary DTOs
     */
    @GetMapping("/review-queue")
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER', 'AUDITOR')")
    public ResponseEntity<Page<TransactionOverrideResponseDto>> getReviewQueue(
            @RequestParam(required = false) String status,
            @PageableDefault(size = 20, sort = "updatedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        log.debug("REST request to fetch transaction review queue, status={}", status);
        Page<TransactionOverrideResponseDto> page = transactionOverrideService.getPendingOrFlaggedTransactions(status, pageable);
        return ResponseEntity.ok(page);
    }

    /**
     * Flags a transaction as suspicious, placing it on immediate hold.
     *
     * @param transactionId UUID of the transaction
     * @param request flag request with mandatory reason and risk level
     * @return transaction review outcome DTO
     */
    @PostMapping("/{transactionId}/flag")
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER')")
    public ResponseEntity<TransactionOverrideResponseDto> flagSuspiciousTransaction(
            @PathVariable UUID transactionId,
            @Valid @RequestBody TransactionFlagRequestDto request) {
        log.info("REST request to flag transaction: id={}", transactionId);
        TransactionOverrideResponseDto response = transactionOverrideService.flagSuspiciousTransaction(transactionId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Overrides and resolves a held/pending transaction (RELEASE or REJECT).
     *
     * @param transactionId UUID of the transaction
     * @param request override request with action and reason
     * @return transaction resolution outcome DTO
     */
    @PostMapping("/{transactionId}/override")
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER')")
    public ResponseEntity<TransactionOverrideResponseDto> overrideTransaction(
            @PathVariable UUID transactionId,
            @Valid @RequestBody TransactionOverrideRequestDto request) {
        log.info("REST request to override transaction: id={}, action={}", transactionId, request.getAction());
        TransactionOverrideResponseDto response = transactionOverrideService.resolveTransaction(transactionId, request);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves the chronological review and override history for a given transaction.
     *
     * @param transactionId UUID of the transaction
     * @return list of chronological review actions
     */
    @GetMapping("/{transactionId}/review-history")
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER', 'AUDITOR')")
    public ResponseEntity<List<TransactionOverrideResponseDto>> getReviewHistory(@PathVariable UUID transactionId) {
        log.debug("REST request to fetch review history for transaction: id={}", transactionId);
        List<TransactionOverrideResponseDto> history = transactionOverrideService.getTransactionReviewHistory(transactionId);
        return ResponseEntity.ok(history);
    }
}
