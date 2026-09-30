package com.corebanking.controller;

import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.dto.CoreRefreshRequest;
import com.corebanking.service.AuthService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;


    // =========================================================
    // LOGIN
    // =========================================================

    @PostMapping("/login")
    public ResponseEntity<CoreLoginResponse> login(
            @Valid @RequestBody CoreLoginRequest request
    ) {

        return ResponseEntity.ok(
                authService.login(request)
        );
    }


    // =========================================================
    // REFRESH
    // =========================================================

    @PostMapping("/refresh")
    public ResponseEntity<CoreLoginResponse> refresh(
            @RequestBody CoreRefreshRequest request
    ) {

        return ResponseEntity.ok(
                authService.refreshToken(request)
        );
    }


    // =========================================================
    // LOGOUT
    // =========================================================

    @PostMapping("/logout")
    public ResponseEntity<String> logout(

            @RequestHeader(
                    "Authorization"
            )
            String authorizationHeader,

            @RequestBody
            CoreRefreshRequest request
    ) {

        authService.logout(
                authorizationHeader,
                request
        );


        return ResponseEntity.ok(
                "Logged out successfully"
        );
    }
}