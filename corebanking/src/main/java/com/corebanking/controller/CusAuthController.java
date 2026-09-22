package com.corebanking.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.corebanking.dto.CusFirstLoginPasswordRequest;
import com.corebanking.dto.CusLoginRequest;
import com.corebanking.dto.CusLoginResponse;
import com.corebanking.dto.CusOtpResendRequest;
import com.corebanking.dto.CusOtpResendResponse;
import com.corebanking.dto.CusOtpVerifyRequest;
import com.corebanking.dto.CusOtpVerifyResponse;
import com.corebanking.dto.CusPinSetupRequest;
import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.service.CusAuthService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/customer/auth")
@RequiredArgsConstructor
public class CusAuthController {

    private final CusAuthService cusAuthService;
    
    @PostMapping("/login")
    public ResponseEntity<CusLoginResponse> login(
            @RequestBody CusLoginRequest request) {

        CusLoginResponse response =
                cusAuthService.authenticateCredentials(
                        request
                );

        return ResponseEntity.ok(
                response
        );
    }


    @PostMapping("/verify-otp")
    public ResponseEntity<CusOtpVerifyResponse> verifyOtp(
            @RequestBody CusOtpVerifyRequest request) {

        CusOtpVerifyResponse response =
                cusAuthService.verifyLoginOtp(
                        request
                );

        return ResponseEntity.ok(
                response
        );
    }


    @PostMapping("/resend-otp")
    public ResponseEntity<CusOtpResendResponse> resendOtp(
            @RequestBody CusOtpResendRequest request) {

        CusOtpResendResponse response =
                cusAuthService.resendLoginOtp(
                        request
                );

        return ResponseEntity.ok(
                response
        );
    }


    @PostMapping("/first-login/change-password")
    public ResponseEntity<String> changeFirstLoginPassword(
            @RequestBody CusFirstLoginPasswordRequest request) {

        cusAuthService.changeFirstLoginPassword(
                request.getChallengeGroupId(),
                request.getNewPassword(),
                request.getConfirmPassword()
        );

        return ResponseEntity.ok(
                "Password changed successfully."
        );
    }


    @PostMapping("/first-login/setup-pin")
    public ResponseEntity<CusTokenResponse> setupTransactionPin(
            @RequestBody CusPinSetupRequest request) {

        CusTokenResponse response =
                cusAuthService.setupTransactionPin(
                        request.getChallengeGroupId(),
                        request.getPin(),
                        request.getConfirmPin()
                );

        return ResponseEntity.ok(
                response
        );
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<CusTokenResponse> refreshToken(
            @RequestBody CusRefreshTokenRequest request) {

        CusTokenResponse response =
                cusAuthService.refreshToken(
                        request
                );

        return ResponseEntity.ok(
                response
        );
    }
    @PostMapping("/logout")
    public ResponseEntity<String> logout(
            @RequestHeader("Authorization")
            String authorizationHeader) {

        cusAuthService.logout(
                authorizationHeader
        );

        return ResponseEntity.ok(
                "Logged out successfully."
        );
    }
    @GetMapping("/test")
    public ResponseEntity<String> testProtectedApi() {

        return ResponseEntity.ok(
                "Customer authentication is working."
        );
    }
}