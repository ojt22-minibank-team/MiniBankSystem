package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CusPinResetOtpVerifyRequest {

    private String challengeGroupId;

    private String otp;
}