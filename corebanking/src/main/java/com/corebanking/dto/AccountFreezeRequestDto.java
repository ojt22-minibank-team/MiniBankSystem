package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Data Transfer Object for requesting an account freeze or unfreeze operation.
 * Requires a mandatory reason for strict banking audit compliance.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountFreezeRequestDto {

    @NotBlank(message = "Freeze/Unfreeze reason is mandatory for audit compliance")
    @Size(min = 5, max = 255, message = "Reason must be between 5 and 255 characters")
    private String reason;
}
