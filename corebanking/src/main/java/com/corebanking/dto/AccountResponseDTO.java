package com.corebanking.dto;

import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class AccountResponseDTO {
    private String accountNumber;
    private String accountType;
    private String accountCategory;
    private boolean isJointAccount;
    private String customerCode;
    private String customerName;
    private BigDecimal currentBalance;
    private BigDecimal availableBalance;
    private String currency;
    private String status;
    private LocalDateTime openedAt;
}