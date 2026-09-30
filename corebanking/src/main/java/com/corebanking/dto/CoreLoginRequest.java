package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CoreLoginRequest {

    @NotBlank(message = "Username is required")
    @Size(max = 64, message = "Username must not exceed 64 characters")
    private String username;

    @NotBlank(message = "Password is required")
    @Size(min = 8, message = "Password must be at least 8 characters")
    @Pattern(
        regexp = "^[A-Za-z0-9]+$",
        message = "Password can contain only letters and numbers"
    )
    private String password;
}