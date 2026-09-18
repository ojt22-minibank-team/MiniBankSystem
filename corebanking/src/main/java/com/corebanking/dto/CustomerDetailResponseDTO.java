package com.corebanking.dto;

import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Getter
@Setter
@Builder
public class CustomerDetailResponseDTO {
    private String customerCode;
    private String customerType;
    private String fullName;
    private String email;
    private String phone;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Personal Customer အချက်အလက်များ
    private String firstName;
    private String lastName;
    private String gender;
    private LocalDate dateOfBirth;
    private String nrc;
    private String address;
    private String occupation;

    // Company Customer အချက်အလက်များ
    private String companyName;
    private String registrationNumber;
    private String taxId;
    private String businessType;
    private String country;
}