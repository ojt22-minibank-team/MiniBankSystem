package com.corebanking.controller;

import com.corebanking.dto.OtcAccountLimitDto;
import com.corebanking.dto.OtcParametersDto;
import com.corebanking.dto.OtcTransactionRequestDto;
import com.corebanking.dto.OtcTransactionResponseDto;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.service.OtcTransactionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

@RestController
@RequestMapping("/api/transactions/otc")
@RequiredArgsConstructor
@PreAuthorize("hasRole('TELLER')")
public class OtcTransactionController {

    private final OtcTransactionService otcTransactionService;

    /**
     * Over-the-Counter Cash Deposit
     * POST /api/transactions/otc/deposit
     */
    @PostMapping("/deposit")
    public ResponseEntity<OtcTransactionResponseDto> processDeposit(
            @Valid @RequestBody OtcTransactionRequestDto request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {

        OtcTransactionResponseDto response = otcTransactionService.processDeposit(request, idempotencyKey);
        return ResponseEntity.ok(response);
    }

    /**
     * Over-the-Counter Cash Withdrawal
     * POST /api/transactions/otc/withdraw
     */
    @PostMapping("/withdraw")
    public ResponseEntity<OtcTransactionResponseDto> processWithdrawal(
            @Valid @RequestBody OtcTransactionRequestDto request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey) {

        OtcTransactionResponseDto response = otcTransactionService.processWithdrawal(request, idempotencyKey);
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves active OTC system parameters (limits, minimum balances & fee schedules) configured in database.
     * GET /api/transactions/otc/parameters
     */
    @GetMapping("/parameters")
    public ResponseEntity<OtcParametersDto> getOtcParameters() {
        return ResponseEntity.ok(otcTransactionService.getOtcParameters());
    }

    /**
     * Calculates estimated OTC service fee dynamically from active FeeSchedules in database.
     * GET /api/transactions/otc/calculate-fee?type=OTC_DEPOSIT&amount=...
     */
    @GetMapping("/calculate-fee")
    public ResponseEntity<Map<String, BigDecimal>> calculateFee(
            @RequestParam("type") TransactionType type,
            @RequestParam("amount") BigDecimal amount) {
        BigDecimal fee = otcTransactionService.calculateOtcFee(amount, type);
        return ResponseEntity.ok(Map.of("fee", fee));
    }

    /**
     * Checks if a counter voucher / slip reference ID is already used in the database.
     * GET /api/transactions/otc/check-reference?ref=...
     */
    @GetMapping("/check-reference")
    public ResponseEntity<Map<String, Boolean>> checkReference(@RequestParam("ref") String ref) {
        boolean exists = otcTransactionService.isReferenceIdDuplicate(ref);
        return ResponseEntity.ok(Map.of("exists", exists));
    }

    /**
     * Checks account withdrawal limits and today's cumulative withdrawn amount.
     * GET /api/transactions/otc/account-limits?accountNumber=...
     */
    @GetMapping("/account-limits")
    public ResponseEntity<OtcAccountLimitDto> getAccountLimitStatus(@RequestParam("accountNumber") String accountNumber) {
        return ResponseEntity.ok(otcTransactionService.getAccountLimitStatus(accountNumber));
    }
}
