package com.corebanking.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GatewayAccountVerificationResponseDto {

    private String accountNumber;
    private String companyName;
    private boolean isCorporate;
    private boolean verified;
    private String accountCategory;
    private String customerType;
    private String accountType;
    private String currency;
    private String status;
    private String businessRegistrationNo;
    private String taxId;
    private String message;
}
