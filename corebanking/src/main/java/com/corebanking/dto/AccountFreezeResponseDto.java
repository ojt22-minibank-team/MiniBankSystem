package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Data Transfer Object representing the outcome of an account freeze or unfreeze operation.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountFreezeResponseDto {

    private UUID accountId;
    private String accountNumber;
    private String previousStatus;
    private String currentStatus;
    private String reason;
    private LocalDateTime updatedAt;
}
