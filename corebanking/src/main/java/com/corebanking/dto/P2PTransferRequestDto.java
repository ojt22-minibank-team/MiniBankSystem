
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
public class P2PTransferRequestDto {

    @NotBlank(message = "Source account number is required")
    @Size(max = 34, message = "Source account number must not exceed 34 characters")
    private String sourceAccountNumber;

    @NotBlank(message = "Destination account number is required")
    @Size(max = 34, message = "Destination account number must not exceed 34 characters")
    private String destinationAccountNumber;

   
    @NotNull(message = "Transfer amount is required")
    @DecimalMin(value = "10000.00", message = "Minimum transfer amount is 10000 MMK") 
    @Digits(integer = 14, fraction = 4, message = "Invalid amount format")
    private BigDecimal amount;
   
    @Builder.Default
    @NotBlank(message = "Currency is required")
    @Pattern(regexp = "^[A-Z]{3}$", message = "Invalid currency code format")
    private String currency = "MMK";

    @NotBlank(message = "Transaction PIN is required")
    @Pattern(regexp = "^\\d{6}$", message = "Transaction PIN must be exactly 6 digits")
    private String transactionPin;

    @Size(max = 255, message = "Description must not exceed 255 characters")
    private String description;

	@NotBlank(message = "Idempotency key is required")
	@Size(max = 64, message = "Idempotency key must not exceed 64 characters")
    private String idempotencyKey;
}	
