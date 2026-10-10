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
public class AccountStatusSummaryDTO {
    private String accountStatus;
    private Long accountCount;
    private Long newAccountsInRange;
    private BigDecimal avgBalance;
    private BigDecimal minBalance;
    private BigDecimal maxBalance;
}
