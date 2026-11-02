package com.corebanking.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtcTransactionRequestDto {

    @NotBlank(message = "Account number is required")
    private String accountNumber;

    @NotNull(message = "Transaction amount is required")
    @DecimalMin(value = "0.01", message = "Transaction amount must be greater than zero")
    private BigDecimal amount;

    private String currency; // default MMK if null

    @NotBlank(message = "Statement narration is required")
    @Size(max = 255, message = "Statement narration must not exceed 255 characters")
    private String remark;

    @NotBlank(message = "Counter voucher / reference ID is required")
    @Size(max = 64, message = "Counter voucher / reference ID must not exceed 64 characters")
    private String manualReferenceId;

    @NotBlank(message = "Internal audit note is required")
    @Size(max = 500, message = "Internal audit note must not exceed 500 characters")
    private String manualAuditNote;
}
