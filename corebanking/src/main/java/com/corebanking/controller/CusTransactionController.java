package com.corebanking.controller;

import com.corebanking.dto.CusTransactionHistoryResponseDTO;
import com.corebanking.service.CusTransactionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/customer/transactions")
@RequiredArgsConstructor
public class CusTransactionController {

    private final CusTransactionService transactionService;

    /**
     * Retrieves filterable paginated transaction history for the authenticated customer.
     */
    @GetMapping
    public ResponseEntity<CusTransactionHistoryResponseDTO> getTransactionHistory(
            @RequestParam("accountNumber") String accountNumber,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "transactionType", required = false) String transactionType,
            @RequestParam(value = "fromDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
            @RequestParam(value = "toDate", required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate,
            @RequestParam(value = "minAmount", required = false) BigDecimal minAmount,
            @RequestParam(value = "maxAmount", required = false) BigDecimal maxAmount,
            @RequestParam(value = "page", defaultValue = "0") Integer page,
            @RequestParam(value = "size", defaultValue = "10") Integer size
    ) {
        log.info("Fetching transaction history for account: {}, page: {}, size: {}", accountNumber, page, size);
        CusTransactionHistoryResponseDTO response = transactionService.getTransactionHistory(
                accountNumber, status, transactionType, fromDate, toDate, minAmount, maxAmount, page, size
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Retrieves distinct statuses that actually exist in the database for the selected account.
     */
    @GetMapping("/statuses")
    public ResponseEntity<List<String>> getDistinctStatuses(
            @RequestParam("accountNumber") String accountNumber
    ) {
        log.info("Fetching distinct statuses for account: {}", accountNumber);
        List<String> statuses = transactionService.getDistinctStatuses(accountNumber);
        return ResponseEntity.ok(statuses);
    }

    /**
     * Retrieves distinct transaction types that actually exist in the database for the selected account.
     */
    @GetMapping("/types")
    public ResponseEntity<List<String>> getDistinctTypes(
            @RequestParam("accountNumber") String accountNumber
    ) {
        log.info("Fetching distinct transaction types for account: {}", accountNumber);
        List<String> types = transactionService.getDistinctTypes(accountNumber);
        return ResponseEntity.ok(types);
    }
}
