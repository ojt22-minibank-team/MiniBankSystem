package com.corebanking.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class LargeTransactionReportDTO {
	private LocalDate startDate;
	private LocalDate endDate;
	private BigDecimal thresholdAmount;
	private String transactionType;
	private Long totalFlaggedCount;
	private BigDecimal totalFlaggedVolume;
	private List<LargeTransactionItemDTO> items;
}
