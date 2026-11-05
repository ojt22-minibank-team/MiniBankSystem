package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtcParametersDto {
    private BigDecimal minDepositAmount;
    private BigDecimal minWithdrawalAmount;
    private BigDecimal minimumBalance;
}
