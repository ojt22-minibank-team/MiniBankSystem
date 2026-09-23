package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class CusOtpResendResponse {

    private boolean success;

    private String message;

    private String challengeGroupId;

    private String maskedEmail;

    private int resendNo;
}