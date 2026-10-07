package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CusPinResetConfirmRequest {

    private String verifiedChallengeGroupId;

    private String newPin;

    private String confirmPin;
}