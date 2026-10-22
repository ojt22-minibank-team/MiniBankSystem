package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for managerial transaction override (RELEASE or REJECT).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionOverrideRequestDto {

    @NotBlank(message = "Action is mandatory")
    @Pattern(regexp = "^(?i)(RELEASE|REJECT)$", message = "Action must be either RELEASE or REJECT")
    private String action;

    @NotBlank(message = "Reason is mandatory for override compliance")
    @Size(min = 5, max = 255, message = "Reason must be between 5 and 255 characters")
    private String reason;

    @Size(max = 500, message = "Resolution note cannot exceed 500 characters")
    private String resolutionNote;

    private String riskLevel; // Optional updated risk level (LOW, MEDIUM, HIGH, CRITICAL)
}
