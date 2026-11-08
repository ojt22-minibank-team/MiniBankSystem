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
        min = 6,
        max = 12,
        message = "Password must contain between 6 and 12 characters"
    )
    private String newPassword;

    @NotBlank(message = "Confirm password is required")
    private String confirmPassword;
}
