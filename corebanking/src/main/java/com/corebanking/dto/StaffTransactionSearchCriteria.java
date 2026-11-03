package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Filter and search criteria for Staff/Admin transaction queries.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffTransactionSearchCriteria {

    /**
     * Text query matching transaction reference, external reference,
     * account numbers, or customer names.
     */
    private String search;

    /**
     * Status filter (COMPLETED, PENDING_AUTHORIZATION, HELD, FAILED, REJECTED, CANCELLED, REVERSED).
     */
    private String status;

    /**
     * Transaction type filter (INTERNAL_TRANSFER, OTC_DEPOSIT, OTC_WITHDRAWAL, etc.).
     */
    private String transactionType;

    /**
     * Channel filter (WEB, MOBILE, BRANCH, ATM, API, STAFF_PORTAL, etc.).
     */
    private String channel;

    /**
     * Inclusive start datetime.
     */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime startDate;

    /**
     * Inclusive end datetime.
     */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime endDate;

    /**
     * Minimum transaction amount.
     */
    private BigDecimal minAmount;

    /**
     * Maximum transaction amount.
     */
    private BigDecimal maxAmount;
}
