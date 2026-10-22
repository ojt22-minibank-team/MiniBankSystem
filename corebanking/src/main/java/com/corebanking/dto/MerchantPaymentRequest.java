package com.corebanking.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.math.BigDecimal;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MerchantPaymentRequest {

    @NotBlank(message = "Payment token is mandatory")
    @Size(max = 64, message = "Payment token must not exceed 64 characters")
    @Pattern(regexp = "^[a-zA-Z0-9_-]+$", message = "Invalid payment token format")
    private String paymentToken;

    @JsonIgnore // Prevent frontend from spoofing customerId in JSON body
    private UUID customerId;

    @NotBlank(message = "Account ID is mandatory")
    @Size(max = 64, message = "Account ID must not exceed 64 characters")
    private String accountId;

    @NotNull(message = "Amount is mandatory")
    @DecimalMin(value = "0.01", message = "Amount must be greater than zero")
    @Digits(integer = 14, fraction = 2, message = "Invalid amount format")
    private BigDecimal amount;

    @ToString.Exclude // Never print raw PIN in logs
    @NotBlank(message = "Transaction PIN is mandatory")
    @Pattern(regexp = "^\\d{6}$", message = "Transaction PIN must be exactly 6 digits")
    private String transactionPin;
}