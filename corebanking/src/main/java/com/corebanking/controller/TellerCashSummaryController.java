package com.corebanking.controller;

import com.corebanking.dto.DailyCashSummaryDto;
import com.corebanking.service.OtcTransactionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/teller")
@RequiredArgsConstructor
public class TellerCashSummaryController {

    private final OtcTransactionService otcTransactionService;

    /**
     * Get Daily / All-Time Cash Summary for the currently authenticated Teller
     * GET /api/v1/teller/daily-cash-summary?scope=today|all
     */
    @GetMapping("/daily-cash-summary")
    @PreAuthorize("hasRole('TELLER')")
    public ResponseEntity<DailyCashSummaryDto> getDailyCashSummary(
            @RequestParam(value = "scope", defaultValue = "today", required = false) String scope) {
        DailyCashSummaryDto summary = otcTransactionService.getDailyCashSummary(scope);
        return ResponseEntity.ok(summary);
    }
}
