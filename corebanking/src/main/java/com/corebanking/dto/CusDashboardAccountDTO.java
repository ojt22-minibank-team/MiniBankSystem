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
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CusDashboardAccountDTO {

    private String accountNumber;

    private String accountCategory;

    private String accountType;

    private String currency;

    private BigDecimal currentBalance;

    private BigDecimal availableBalance;

    private String status;

    private Boolean jointAccount;

    private LocalDateTime openedAt;
}