package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CusPinSetupRequest {

	 private String challengeGroupId;

    private String pin;

    private String confirmPin;
}