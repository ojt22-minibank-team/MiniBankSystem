package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MerchantPaymentRequest {

    @NotBlank(message = "Payment token is mandatory")
    private String paymentToken;

    @NotNull(message = "Customer ID is mandatory")
    private UUID customerId;

    @NotNull(message = "Merchant Account ID is mandatory")
    private UUID merchantAccountId;

    @NotNull(message = "Amount is mandatory")
    private BigDecimal amount;

    @NotBlank(message = "Transaction PIN is mandatory")
    @jakarta.validation.constraints.Pattern(regexp = "^\\d{6}$", message = "Transaction PIN must be exactly 6 digits")
    private String transactionPin;
}