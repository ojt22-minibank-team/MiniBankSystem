package com.corebanking.dto;



import java.time.LocalDate;



import lombok.Getter;
import lombok.Setter;
   @Getter
   @Setter

public class CustomerDTO {

    // Common Fields
    private String customerType; // PERSONAL or COMPANY
    private String phone;
    private String email;
    private String address;
    private String status;

    // Personal Customer Fields
    private String firstName;
    private String lastName;
    private String gender; // MALE, FEMALE, OTHER
    private LocalDate dateOfBirth;
    private String nrc;
    private String occupation;

    // Company Customer Fields
    private String companyName;
    private String registrationNumber;
    private String taxId;
    private String businessType;

    
	
	
	
}