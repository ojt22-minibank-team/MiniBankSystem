package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DailyCashSummaryDto {
    private String tellerUsername;
    private String tellerFullName;
    private LocalDate reportDate;
    private BigDecimal openingCash;
    private BigDecimal totalCashIn;
    private BigDecimal totalCashOut;
    private BigDecimal netCashInDrawer;
    private long totalTransactions;
    private long depositCount;
    private long withdrawalCount;
    private String currency;
    private String scope;
}
