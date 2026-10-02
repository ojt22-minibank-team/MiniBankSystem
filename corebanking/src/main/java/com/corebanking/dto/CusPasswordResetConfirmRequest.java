package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CusPasswordResetConfirmRequest {

    private String challengeGroupId;

    private String newPassword;

    private String confirmPassword;
}
