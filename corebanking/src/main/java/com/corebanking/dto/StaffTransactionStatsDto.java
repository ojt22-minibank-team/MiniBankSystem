package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

/**
 * Metric summary stats for transaction overview chips.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffTransactionStatsDto {
    private long totalCount;
    private long completedCount;
    private long heldOrPendingCount;
    private long failedCount;
    private BigDecimal totalCompletedVolume;
}
