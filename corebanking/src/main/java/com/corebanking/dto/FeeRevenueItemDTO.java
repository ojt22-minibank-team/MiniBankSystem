package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FeeRevenueItemDTO {
    private String transactionType;
    private String channel;
    private Long transactionCount;
    private BigDecimal totalVolume;
    private BigDecimal totalFeeRevenue;
    private BigDecimal avgFeePerTx;
}
