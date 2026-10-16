
package com.corebanking.controller;

import com.corebanking.dto.CoreApiResponse;
import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.dto.CoreLogoutRequest;
import com.corebanking.dto.CoreRefreshRequest;
import com.corebanking.service.AuthService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(
        name = "Authentication API",
        description = "APIs for login, logout, and token refresh"
)
public class AuthController {

    private static final String MSG_LOGIN_SUCCESS =
            "Login successful";

    private static final String MSG_REFRESH_SUCCESS =
            "Token refreshed successfully";

    private static final String MSG_LOGOUT_SUCCESS =
            "Logged out successfully";

    private final AuthService authService;

    @PostMapping("/login")

    @Operation(
            summary = "User Login",
            description = "Authenticates a user and returns authentication tokens"
    )
    public ResponseEntity<CoreApiResponse<CoreLoginResponse>> login(
            @Valid @RequestBody CoreLoginRequest request
    ) {
        log.info("Login request received");

        CoreLoginResponse data = authService.login(request);

        log.info("Login request processed successfully");

        return ResponseEntity.ok(
                CoreApiResponse.<CoreLoginResponse>builder()
                        .success(true)
                        .message(MSG_LOGIN_SUCCESS)
                        .data(data)
                        .build()
        );
    }

    @PostMapping("/refresh")
    @Operation(
            summary = "Refresh Access Token",
            description = "Issues refreshed authentication tokens"
    )
    public ResponseEntity<CoreApiResponse<CoreLoginResponse>> refresh(
            @Valid @RequestBody CoreRefreshRequest request
    ) {
        log.info("Token refresh request received");

        CoreLoginResponse data = authService.refreshToken(request);

        log.info("Token refresh request processed successfully");

        return ResponseEntity.ok(
                CoreApiResponse.<CoreLoginResponse>builder()
                        .success(true)
                        .message(MSG_REFRESH_SUCCESS)
                        .data(data)
                        .build()
        );
    }

    @PostMapping("/logout")
    @Operation(
            summary = "User Logout",
            description = "Logs out the user and invalidates authentication tokens"
    )
    public ResponseEntity<CoreApiResponse<Void>> logout(
            @RequestHeader(
                    value = "Authorization",
                    required = false
            ) String authorizationHeader,
            @Valid @RequestBody CoreLogoutRequest request
    ) {
        log.info("Logout request received");

        authService.logout(authorizationHeader, request);

        return ResponseEntity.ok(
                CoreApiResponse.<Void>builder()
                        .success(true)
                        .message(MSG_LOGOUT_SUCCESS)
                        .data(null)
                        .build()
        );

    }
}