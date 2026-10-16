package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccessibleAccountDTO {
    private String accountNumber;
    private String accountType;
    private String accountCategory;
    private String companyName;
    private String role;
    private BigDecimal currentBalance;
    private BigDecimal availableBalance;
    private String currency;
    private boolean canInitiate;
    private boolean canApprove;
}
