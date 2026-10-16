package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransferLimitInfoResponseDto {

    private String accountNumber;
    private String accountType;
    private String accountCategory;
    private String currency;

    // Bank Maximum Limits (Ceilings)
    private BigDecimal bankMaxOneTimeLimit;
    private BigDecimal bankStrangerOneTimeLimit;
    private BigDecimal bankMaxDailyLimit;

    // User Custom Limits (if set by customer)
    private BigDecimal userCustomOneTimeLimit;
    private BigDecimal userCustomDailyLimit;

    // Effective Limits (min(Bank, UserCustom))
    private BigDecimal effectiveOneTimeLimitBeneficiary;
    private BigDecimal effectiveOneTimeLimitStranger;
    private BigDecimal effectiveDailyLimit;

    // Real-time tracking
    private BigDecimal todayTransferredAmount;
    private BigDecimal remainingDailyLimit;
}
