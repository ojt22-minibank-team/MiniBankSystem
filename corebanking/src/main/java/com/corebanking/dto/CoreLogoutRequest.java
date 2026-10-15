package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CoreLogoutRequest {

    @NotBlank(message = "Refresh token is required")
    private String refreshToken;

}