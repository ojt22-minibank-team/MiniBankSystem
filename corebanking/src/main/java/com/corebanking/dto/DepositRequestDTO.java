package com.corebanking.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepositRequestDTO {

    // Account Number ဖြင့်ဖြစ်စေ သို့မဟုတ် Customer Code ဖြင့်ဖြစ်စေ ထည့်သွင်းနိုင်သည်
    private String accountNumber;
    private String customerCode;

    @NotNull(message = "Deposit amount is required")
    @DecimalMin(value = "100.00", message = "Minimum deposit amount is 100 MMK")
    private BigDecimal amount;

    private String remarks; // e.g. "Cash Deposit at Counter"
}
