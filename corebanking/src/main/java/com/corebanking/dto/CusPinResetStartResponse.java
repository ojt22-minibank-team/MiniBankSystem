package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CusPinResetStartResponse {

    private boolean success;

    private String message;

    private String challengeGroupId;

    private String destinationMasked;
}
