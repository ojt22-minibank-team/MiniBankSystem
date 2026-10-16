package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateTransferLimitRequestDto {

    @NotBlank(message = "Transaction PIN is required to update transfer limits.")
    private String transactionPin;

    private BigDecimal customOneTimeLimit;

    private BigDecimal customDailyLimit;
}
