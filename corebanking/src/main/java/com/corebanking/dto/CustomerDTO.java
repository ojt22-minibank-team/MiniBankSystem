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
    private String fullName;
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
    private String officialEmail;
    private String businessAddress;
    private LocalDate establishedDate;

    public String getFirstName() {
        if (firstName != null && !firstName.isBlank()) {
            return firstName;
        }
        if (fullName != null && !fullName.isBlank()) {
            String[] parts = fullName.trim().split("\\s+", 2);
            return parts[0];
        }
        return firstName;
    }

    public String getLastName() {
        if (lastName != null && !lastName.isBlank()) {
            return lastName;
        }
        if (fullName != null && !fullName.isBlank()) {
            String[] parts = fullName.trim().split("\\s+", 2);
            return parts.length > 1 ? parts[1] : "";
        }
        return lastName;
    }

    public String getEmail() {
        if (email != null && !email.isBlank()) return email;
        return officialEmail;
    }

    public String getAddress() {
        if (address != null && !address.isBlank()) return address;
        return businessAddress;
    }
	
}