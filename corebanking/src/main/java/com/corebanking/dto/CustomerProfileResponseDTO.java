package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerProfileResponseDTO {

    private String customerCode;
    private String customerType;
    private String status;

    // Personal
    private String firstName;
    private String lastName;
    private LocalDate dateOfBirth;
    private String gender;
    private String nrc;
    private String passportNumber;
    private String email;
    private String phone;
    private String occupation;

    // Address
    private String address;
    private String city;
    private String stateRegion;
    private String country;

    // Company
    private String companyName;
    private String registrationNumber;
    private String taxId;
    private String businessType;
    private LocalDate incorporationDate;
    private String companyPhone;
    private String companyEmail;

    // Cloud image
    private String profileImageUrl;
}