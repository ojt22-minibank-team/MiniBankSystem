package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class CusOtpVerifyResponse {

    private boolean success;

    private String message;

    private boolean firstLoginSetupRequired;

    private boolean passwordChangeRequired;

    private boolean pinSetupRequired;
}

//{
//	  "success": true,
//	  "message": "OTP verified. Please complete first-time setup.",
//	  "firstLoginSetupRequired": true,
//	  "passwordChangeRequired": true,
//	  "pinSetupRequired": true
//	}

//{
//	  "success": true,
//	  "message": "OTP verified successfully.",
//	  "firstLoginSetupRequired": false,
//	  "passwordChangeRequired": false,
//	  "pinSetupRequired": false
//	}