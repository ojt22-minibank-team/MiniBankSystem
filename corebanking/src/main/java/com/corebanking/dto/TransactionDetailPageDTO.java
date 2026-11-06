package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDetailPageDTO {
    private List<TransactionDetailReportDTO> rows;
    private long totalCount;
    private BigDecimal totalVolume;
    private BigDecimal totalFees;
    private int page;
    private int pageSize;
    private int totalPages;
}
