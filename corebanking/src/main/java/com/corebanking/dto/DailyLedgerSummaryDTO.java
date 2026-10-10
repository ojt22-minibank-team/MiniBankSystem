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
public class DailyLedgerSummaryDTO {
    private LocalDate reportDate;
    private String transactionType;
    private Long transactionCount;
    private BigDecimal totalAmount;
    private BigDecimal totalFee;
    private String currency;
}
