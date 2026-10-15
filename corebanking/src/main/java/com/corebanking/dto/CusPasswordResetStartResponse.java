package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class CusPasswordResetStartResponse {

    private boolean success;

    private String message;

    private String challengeGroupId;

    private String destinationMasked;
}
