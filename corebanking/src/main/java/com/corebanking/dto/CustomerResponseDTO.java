package com.corebanking.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class CustomerResponseDTO {
    private String customerCode;
    private String customerType;
    private String fullName;
    private String email;
    private String phone;
    private String status;
    private LocalDateTime createdAt;
    private String temporaryPassword;
}