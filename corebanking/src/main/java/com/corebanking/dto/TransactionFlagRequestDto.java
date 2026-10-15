package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for flagging suspicious transactions.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionFlagRequestDto {

    @NotBlank(message = "Reason is mandatory for flagging suspicious activity")
    @Size(min = 5, max = 255, message = "Reason must be between 5 and 255 characters")
    private String reason;

    private String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL

    @Size(max = 500, message = "Resolution note cannot exceed 500 characters")
    private String resolutionNote;
}
