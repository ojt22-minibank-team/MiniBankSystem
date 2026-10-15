package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.util.List;

@Getter
@AllArgsConstructor
public class CoreLoginResponse {

    private String accessToken;

    private String refreshToken;

    private String username;

    private List<String> roles;

    private List<String> permissions;
}