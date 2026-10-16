package com.corebanking.dto;

import lombok.*;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BeneficiaryResponseDto {
    private UUID beneficiaryId;
    private String beneficiaryAccountNumber;
    private String beneficiaryAccountName;
    private String beneficiaryAccountType;
    private String nickname;
    private String ownerAccountNumber;
    private boolean isActive;
    private LocalDateTime createdAt;
}