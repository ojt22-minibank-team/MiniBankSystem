package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CoreLoginResponse {

    @Builder.Default
    private boolean otpRequired = false;

    private String challengeGroupId;

    private String destinationMasked;

    private String accessToken;

    private String refreshToken;

    private String username;

    private List<String> roles;

    private List<String> permissions;

    public CoreLoginResponse(String accessToken, String refreshToken, String username, List<String> roles, List<String> permissions) {
        this.otpRequired = false;
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.username = username;
        this.roles = roles;
        this.permissions = permissions;
    }
}
