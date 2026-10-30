package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class FeeRevenueReportDTO {
    private LocalDate startDate;
    private LocalDate endDate;
    private String channel;
    private Long grandTotalTransactions;
    private BigDecimal grandTotalVolume;
    private BigDecimal grandTotalFeeRevenue;
    private List<FeeRevenueItemDTO> items;
}
