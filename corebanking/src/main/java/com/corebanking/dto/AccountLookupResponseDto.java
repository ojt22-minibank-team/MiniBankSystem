package com.corebanking.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountLookupResponseDto {
    private String accountNumber;
    private String accountName;
    private String accountType;
    private String status;
}