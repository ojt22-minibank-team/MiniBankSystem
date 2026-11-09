package com.corebanking.dto;

import java.time.LocalDate;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Dedicated registration request DTO for COMPANY bank accounts.
 * Date of Birth is completely removed and excluded from this request contract.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class CompanyAccountRegisterRequest {

    @NotBlank(message = "Company name is required")
    private String companyName;

    @NotBlank(message = "Registration number is required")
    private String registrationNumber;

    @NotBlank(message = "Tax ID is required")
    private String taxId;

    private String businessType;

    @NotBlank(message = "Phone number is required")
    @Pattern(
        regexp = "^09\\d{9}$",
        message = "Phone number must be exactly 11 digits starting with 09"
    )
    private String phone;

    @NotBlank(message = "Email is required")
    @Pattern(
        regexp = "^[A-Za-z0-9._%+-]+@gmail\\.com$",
        message = "Email must be a valid @gmail.com address"
    )
    private String email;

    @Pattern(
        regexp = "^$|^[A-Za-z0-9._%+-]+@gmail\\.com$",
        message = "Email must be a valid @gmail.com address"
    )
    private String officialEmail;

    @NotBlank(message = "Address is required")
    private String address;

    private String businessAddress;
    private LocalDate establishedDate;

    public String getEmail() {
        if (email != null && !email.isBlank()) {
            return email;
        }
        return officialEmail;
    }

    /**
     * Converts to internal CustomerDTO for service processing.
     * Note: dateOfBirth is intentionally absent and null.
     */
    public CustomerDTO toCustomerDTO() {
        return CustomerDTO.builder()
                .customerType("COMPANY")
                .companyName(this.companyName)
                .registrationNumber(this.registrationNumber)
                .taxId(this.taxId)
                .businessType(this.businessType)
                .phone(this.phone)
                .email(getEmail())
                .officialEmail(this.officialEmail)
                .address(this.address)
                .businessAddress(this.businessAddress)
                .establishedDate(this.establishedDate)
                .build();
    }
}
