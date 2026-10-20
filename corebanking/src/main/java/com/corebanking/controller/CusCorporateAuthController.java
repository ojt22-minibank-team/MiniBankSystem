package com.corebanking.controller;

import com.corebanking.dto.CusCorporateFirstLoginPasswordRequest;
import com.corebanking.dto.CusCorporateLoginRequest;
import com.corebanking.dto.CusCorporateLoginResponse;
import com.corebanking.dto.CusCorporateOtpVerifyRequest;
import com.corebanking.dto.CusCorporateOtpVerifyResponse;
import com.corebanking.dto.CusCorporatePinSetupRequest;
import com.corebanking.dto.CusOtpResendRequest;
import com.corebanking.dto.CusOtpResendResponse;
import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.service.CusCorporateAuthService;
import com.corebanking.service.CusCorporateFirstLoginService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/corporate/auth")
@RequiredArgsConstructor
public class CusCorporateAuthController {

    private final CusCorporateAuthService corporateAuthService;
    private final CusCorporateFirstLoginService corporateFirstLoginService;

    @PostMapping("/login")
    public ResponseEntity<CusCorporateLoginResponse> login(
            @Valid @RequestBody CusCorporateLoginRequest request) {
        return ResponseEntity.ok(corporateAuthService.login(request));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<CusCorporateOtpVerifyResponse> verifyOtp(
            @Valid @RequestBody CusCorporateOtpVerifyRequest request) {
        return ResponseEntity.ok(corporateAuthService.verifyLoginOtp(request));
    }

    @PostMapping("/resend-otp")
    public ResponseEntity<CusOtpResendResponse> resendOtp(
            @RequestBody CusOtpResendRequest request) {
        return ResponseEntity.ok(corporateAuthService.resendLoginOtp(request));
    }

    @PostMapping("/first-login/change-password")
    public ResponseEntity<Map<String, Object>> changeFirstLoginPassword(
            @Valid @RequestBody CusCorporateFirstLoginPasswordRequest request) {
        boolean pinSetupRequired = corporateFirstLoginService.changeFirstLoginPassword(request);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Password changed successfully.",
                "pinSetupRequired", pinSetupRequired
        ));
    }

    @PostMapping("/first-login/setup-pin")
    public ResponseEntity<String> setupTransactionPin(
            @Valid @RequestBody CusCorporatePinSetupRequest request) {
        corporateFirstLoginService.setupTransactionPin(request);
        return ResponseEntity.ok("Transaction PIN set up successfully.");
    }

    @PostMapping("/first-login/complete")
    public ResponseEntity<CusCorporateOtpVerifyResponse> completeFirstLogin(
            @RequestParam("challengeGroupId") String challengeGroupId) {
        return ResponseEntity.ok(corporateAuthService.completeFirstLogin(challengeGroupId));
    }

    @PostMapping("/refresh")
    public ResponseEntity<CusTokenResponse> refreshToken(
            @RequestBody CusRefreshTokenRequest request) {
        return ResponseEntity.ok(corporateAuthService.refreshToken(request));
    }

    // The Corporate security chain validates and touches the session before dispatch.
    @GetMapping("/session/keep-alive")
    public ResponseEntity<Map<String, Object>> keepAlive() {
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Corporate session is active."
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<String> logout(
            @RequestHeader("Authorization") String authorizationHeader) {
        corporateAuthService.logout(authorizationHeader);
        return ResponseEntity.ok("Logged out successfully.");
    }
}
