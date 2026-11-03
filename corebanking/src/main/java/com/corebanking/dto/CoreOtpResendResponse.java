package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoreOtpResendResponse {

    private boolean success;

    private String message;

    private String challengeGroupId;

    private int resendNo;

    private int maxResendAttempts;
}
