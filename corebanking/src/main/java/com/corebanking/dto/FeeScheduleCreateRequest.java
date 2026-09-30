package com.corebanking.dto;

import com.corebanking.entity.enums.FeeType;
import com.corebanking.entity.enums.TransactionType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
public class FeeScheduleCreateRequest {

    @NotBlank(message = "Fee code is required")
    @Size(max = 32, message = "Fee code must not exceed 32 characters")
    private String feeCode;

    @NotNull(message = "Transaction type is required")
    private TransactionType transactionType;

    @NotNull(message = "Fee type is required")
    private FeeType feeType;

    @NotNull(message = "Fee value is required")
    @DecimalMin(value = "0.0", inclusive = true, message = "Fee value cannot be negative")
    private BigDecimal feeValue;

    @DecimalMin(value = "0.0", inclusive = true, message = "Minimum fee cannot be negative")
    private BigDecimal minimumFee;

    @DecimalMin(value = "0.0", inclusive = true, message = "Maximum fee cannot be negative")
    private BigDecimal maximumFee;

    @NotBlank(message = "Currency is required")
    @Size(min = 3, max = 3, message = "Currency must be 3 characters")
    private String currency;

    @NotNull(message = "Active from is required")
    private LocalDateTime activeFrom;

    private LocalDateTime activeUntil;
}