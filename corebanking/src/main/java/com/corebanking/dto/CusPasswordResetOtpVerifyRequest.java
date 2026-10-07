package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CusPasswordResetOtpVerifyRequest {

    private String challengeGroupId;

    private String otp;
}