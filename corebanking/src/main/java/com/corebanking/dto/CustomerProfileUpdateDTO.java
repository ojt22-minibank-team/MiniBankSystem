package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CustomerProfileUpdateDTO {

    private String email;

    private String phone;

    private String occupation;

    private String address;

    private String city;

    private String stateRegion;

    private String country;

    private String companyPhone;

    private String companyEmail;
}