package com.corebanking.dto;

import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountType;
import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
public class AccountCreateDTO {

    // The customer code (e.g., CUST-20260919-8406)
    private String customerCode;

    // SAVINGS, CURRENT, FIXED_DEPOSIT, SALARY
    private AccountType accountType;

    // RETAIL, CORPORATE (Optional, defaults to RETAIL)
    private AccountCategory accountCategory;

    // Currency code (e.g., MMK, USD)
    private String currency;

    // Initial deposit amount
    private BigDecimal initialDeposit;

    // Whether this account is a joint account
    private Boolean isJointAccount;

    // Number of approvals needed for transactions (defaults to 1)
    private Short requiredApprovals;
}