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
public class BalanceBracketDTO {
    private String balanceBracket;
    private Long bracketCount;
    private BigDecimal bracketTotalBalance;
    private String accountStatus;
}
