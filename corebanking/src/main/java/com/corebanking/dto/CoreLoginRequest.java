package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CoreLoginRequest {

    @NotBlank(message = "Username is required")
    
    private String username;

    @NotBlank(message = "Password is required")
    
    
    private String password;
}