package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CusPasswordResetOtpVerifyResponse {

    private boolean success;

    private String message;

    private String challengeGroupId;
}
