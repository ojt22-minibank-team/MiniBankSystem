package com.corebanking.dto;

import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

/**
 * Data Transfer Object for updating specific customer profile fields.
 * Strictly limited to editable fields: phone, occupation, and dateOfBirth.
 * Protects core identifiers: customerCode, nrc, email, and account numbers.
 */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CustomerUpdateDTO {

    @Pattern(regexp = "^$|^\\+?[0-9]{5,20}$", message = "Phone number must be a valid format between 5 and 20 digits")
    private String phone;

    @Size(max = 100, message = "Occupation must not exceed 100 characters")
    private String occupation;

    @Past(message = "Date of birth must be a date in the past")
    private LocalDate dateOfBirth;
}
