package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BeneficiaryRequestDto {

    @NotBlank(message = "Beneficiary account number is required")
    @Size(max = 34, message = "Account number must not exceed 34 characters")
    private String beneficiaryAccountNumber;

    @Size(max = 100, message = "Nickname must not exceed 100 characters")
    private String nickname;

    private String ownerAccountNumber;
}