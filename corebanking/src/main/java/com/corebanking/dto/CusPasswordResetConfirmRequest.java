package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CusPasswordResetConfirmRequest {

    private String verifiedChallengeGroupId;

    private String newPassword;

    private String confirmPassword;
}
