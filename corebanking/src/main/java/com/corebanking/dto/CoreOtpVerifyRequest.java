package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CoreOtpVerifyRequest {

    @NotBlank(message = "Challenge group ID is required")
    private String challengeGroupId;

    @NotBlank(message = "OTP is required")
    private String otp;
}
