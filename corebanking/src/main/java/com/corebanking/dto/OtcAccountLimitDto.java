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
public class OtcAccountLimitDto {
    private String accountNumber;
    private BigDecimal maxOnetimeWithdrawal;
    private BigDecimal maxDailyWithdrawal;
    private BigDecimal todayWithdrawnAmount;
    private BigDecimal remainingDailyLimit;
}
