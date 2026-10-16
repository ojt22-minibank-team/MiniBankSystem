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
public class BankTransferLimitRule {

    private BigDecimal maxOneTimeLimit;      // Beneficiary One-Time Limit
    private BigDecimal strangerOneTimeLimit; // Unsaved/Stranger One-Time Limit
    private BigDecimal maxDailyLimit;        // Cumulative Daily Limit
}
