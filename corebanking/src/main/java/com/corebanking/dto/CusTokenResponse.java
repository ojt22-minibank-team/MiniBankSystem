package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class CusTokenResponse {

    private boolean success;

    private String message;

    private String accessToken;

    private String refreshToken;
}