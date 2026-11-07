package com.corebanking.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerDTO {

    // Common Fields
    private String customerType; // PERSONAL or COMPANY
    private String phone;

    @NotBlank(message = "Email is required")
    @Pattern(
        regexp = "^[A-Za-z0-9._%+-]+@gmail\\.com$",
        message = "Email must be a valid @gmail.com address"
    )
    private String email;

    private String address;
    private String status;

    // Personal Customer Fields
    private String fullName;
    private String firstName;
    private String lastName;
    private String gender; // MALE, FEMALE, OTHER
    private LocalDate dateOfBirth;

    @Pattern(
        regexp = "^(1[0-4]|[1-9])/[A-Z0-9a-z]+\\([NPE]\\)[0-9]{6}$",
        message = "Invalid Myanmar NRC format (e.g., 12/DAGANA(N)123456)"
    )
    private String nrc;

    private String occupation;

    // Company Customer Fields
    private String companyName;
    private String registrationNumber;
    private String taxId;
    private String businessType;

    @Pattern(
        regexp = "^$|^[A-Za-z0-9._%+-]+@gmail\\.com$",
        message = "Email must be a valid @gmail.com address"
    )
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
