
package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StaffPasswordSetupRequest {

    @NotBlank(message = "Setup token is required")
    private String token;

    @NotBlank(message = "Password is required")
    @Size(
        min = 8,
        max = 72,
        message = "Password must contain between 8 and 72 characters"
    )
    private String newPassword;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;
}