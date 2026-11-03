package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatewayAccountVerificationRequestDto {

    @NotBlank(message = "Account number is required")
    @Size(max = 34, message = "Account number must not exceed 34 characters")
    private String accountNumber;
}
