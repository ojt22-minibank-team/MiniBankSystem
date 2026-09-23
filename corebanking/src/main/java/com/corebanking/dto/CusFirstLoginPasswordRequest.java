package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CusFirstLoginPasswordRequest {

	 private String challengeGroupId;

    private String newPassword;

    private String confirmPassword;
}