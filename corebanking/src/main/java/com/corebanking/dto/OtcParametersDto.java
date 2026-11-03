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
    private BigDecimal maxOnetimeWithdrawal;
    private BigDecimal maxDailyWithdrawal;

    // Active OTC Fee Schedule parameters
    private String depositFeeType;
    private BigDecimal depositFeeValue;
    private BigDecimal depositMinFee;
    private BigDecimal depositMaxFee;

    private String withdrawalFeeType;
    private BigDecimal withdrawalFeeValue;
    private BigDecimal withdrawalMinFee;
    private BigDecimal withdrawalMaxFee;
}
