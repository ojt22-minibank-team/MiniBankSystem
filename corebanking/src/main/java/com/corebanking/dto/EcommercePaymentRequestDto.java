package com.corebanking.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EcommercePaymentRequestDto {

    @NotBlank(message = "Source customer account number is required")
    @Size(max = 34, message = "Source account number must not exceed 34 characters")
    private String sourceAccountNumber;

    @NotBlank(message = "Merchant settlement account number is required")
    @Size(max = 34, message = "Merchant account number must not exceed 34 characters")
    private String merchantAccountNumber;

    @NotNull(message = "Payment amount is required")
    @DecimalMin(value = "100.00", message = "Minimum transaction amount is 100 MMK")
    @Digits(integer = 14, fraction = 4, message = "Invalid amount format")
    private BigDecimal amount;

    @Builder.Default
    @NotBlank(message = "Currency is required")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Currency must be 3 uppercase letters (e.g., MMK)")
    private String currency = "MMK";

    @NotBlank(message = "E-Commerce Order ID is required")
    @Size(max = 128, message = "Order reference must not exceed 128 characters")
    private String orderId;

    @NotBlank(message = "Idempotency key is required")
    @Size(max = 64, message = "Idempotency key must not exceed 64 characters")
    private String idempotencyKey;

    @Size(max = 255, message = "Description must not exceed 255 characters")
    private String description;
}
