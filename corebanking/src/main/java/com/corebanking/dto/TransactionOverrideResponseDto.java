package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Response DTO representing the outcome of transaction review, flagging, or managerial override.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionOverrideResponseDto {

    private UUID transactionId;
    private String transactionRef;
    private BigDecimal amount;
    private String currency;
    private String previousStatus;
    private String currentStatus;
    private String action;
    private String reason;
    private String riskLevel;
    private String resolutionNote;
    private String performedByStaff;
    private LocalDateTime performedAt;
}
