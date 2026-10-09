package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerAccountResponseDTO {

    private String accountNumber;

    private String accountCategory;

    private String accountType;

    private String currency;

    private BigDecimal currentBalance;

    private BigDecimal availableBalance;

    private BigDecimal minimumBalance;

    private BigDecimal dailyTransferLimit;

    private String status;

    private Boolean jointAccount;

    private Integer requiredApprovals;

    private LocalDateTime openedAt;

    private LocalDateTime closedAt;
}