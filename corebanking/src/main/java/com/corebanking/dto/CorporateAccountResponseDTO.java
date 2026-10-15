package com.corebanking.dto;

import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorporateAccountResponseDTO {
    private String accountNumber;
    private String companyCustomerCode;
    private String companyName;
    private String accountType;
    private BigDecimal currentBalance;
    private String currency;
    
    // CEO Corporate Login Credentials
    private String ceoCustomerCode;
    private String ceoTempCorporatePassword;

    // Accountant Corporate Login Credentials
    private String accountantCustomerCode;
    private String accountantTempCorporatePassword;
}