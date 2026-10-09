

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
import com.corebanking.dto.CusPasswordResetConfirmRequest;
import com.corebanking.dto.CusPasswordResetOtpVerifyRequest;
import com.corebanking.dto.CusPasswordResetOtpVerifyResponse;
import com.corebanking.dto.CusPasswordResetRequest;
import com.corebanking.dto.CusPasswordResetStartResponse;
import com.corebanking.dto.CusPinResetConfirmRequest;
import com.corebanking.dto.CusPinResetOtpVerifyRequest;
import com.corebanking.dto.CusPinResetOtpVerifyResponse;
import com.corebanking.dto.CusPinResetStartResponse;
import com.corebanking.dto.CusPinSetupRequest;
import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.service.CusAuthService;

import lombok.RequiredArgsConstructor;
import java.util.Map;
@RestController
@RequestMapping("/api/customer/auth")
@RequiredArgsConstructor
public class CusAuthController {

    private final CusAuthService cusAuthService;


    // =========================================================
    // 1. CUSTOMER LOGIN
    // =========================================================

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


    // =========================================================
    // 2. LOGIN OTP VERIFY
    // =========================================================

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


    // =========================================================
    // 3. LOGIN OTP RESEND
    // =========================================================

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


    // =========================================================
    // 4. FIRST LOGIN - CHANGE TEMPORARY PASSWORD
    // =========================================================

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


    // =========================================================
    // 5. FIRST LOGIN - SETUP TRANSACTION PIN
    // =========================================================

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
    
 // =========================================================
 // SESSION KEEP ALIVE
 // =========================================================

 @GetMapping("/session/keep-alive")
 public ResponseEntity<Map<String, Object>>
         keepSessionAlive() {

     return ResponseEntity.ok(
             Map.of(
                     "success", true,
                     "message", "Session is active."
             )
     );
 }


    // =========================================================
    // 6. PASSWORD RESET - REQUEST OTP
    // =========================================================

    @PostMapping("/password-reset/request")
    public ResponseEntity<CusPasswordResetStartResponse>
            requestPasswordReset(
                    @RequestBody
                    CusPasswordResetRequest request) {

        CusPasswordResetStartResponse response =
                cusAuthService.requestPasswordReset(
                        request
                );

        return ResponseEntity.ok(
                response
        );
    }


    // =========================================================
    // 7. PASSWORD RESET - RESEND OTP
    // =========================================================

    @PostMapping("/password-reset/resend-otp")
    public ResponseEntity<CusOtpResendResponse>
            resendPasswordResetOtp(
                    @RequestBody
                    CusOtpResendRequest request) {

        CusOtpResendResponse response =
                cusAuthService.resendPasswordResetOtp(
                        request
                );

        return ResponseEntity.ok(
                response
        );
    }


    // =========================================================
    // 8. PASSWORD RESET - VERIFY OTP
    // =========================================================

    @PostMapping("/password-reset/verify-otp")
    public ResponseEntity<CusPasswordResetOtpVerifyResponse>
            verifyPasswordResetOtp(
                    @RequestBody
                    CusPasswordResetOtpVerifyRequest request) {

        CusPasswordResetOtpVerifyResponse response =
                cusAuthService.verifyPasswordResetOtp(
                        request
                );

        return ResponseEntity.ok(
                response
        );
    }


    // =========================================================
    // 9. PASSWORD RESET - CONFIRM NEW PASSWORD
    // =========================================================

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<String> confirmPasswordReset(
            @RequestBody
            CusPasswordResetConfirmRequest request) {

        cusAuthService.resetPassword(
                request
        );

        return ResponseEntity.ok(
                "Password reset successfully."
        );
    }


    // =========================================================
    // 10. TRANSACTION PIN RESET - REQUEST OTP
    // =========================================================

    @PostMapping("/pin-reset/request")
    public ResponseEntity<CusPinResetStartResponse>
            requestPinReset(
                    @RequestHeader("Authorization")
                    String authorizationHeader) {

        CusPinResetStartResponse response =
                cusAuthService.requestPinReset(
                        authorizationHeader
                );

        return ResponseEntity.ok(
                response
        );
    }


    // =========================================================
    // 11. TRANSACTION PIN RESET - RESEND OTP
    // =========================================================

    @PostMapping("/pin-reset/resend-otp")
    public ResponseEntity<CusOtpResendResponse>
            resendPinResetOtp(

                    @RequestHeader("Authorization")
                    String authorizationHeader,

                    @RequestBody
                    CusOtpResendRequest request) {

        CusOtpResendResponse response =
                cusAuthService.resendPinResetOtp(
                        authorizationHeader,
                        request
                );

        return ResponseEntity.ok(
                response
        );
    }
 // =========================================================
 // TRANSACTION PIN RESET - VERIFY OTP
 // =========================================================

 @PostMapping("/pin-reset/verify-otp")
 public ResponseEntity<CusPinResetOtpVerifyResponse>
         verifyPinResetOtp(

                 @RequestHeader("Authorization")
                 String authorizationHeader,

                 @RequestBody
                 CusPinResetOtpVerifyRequest request) {

     CusPinResetOtpVerifyResponse response =
             cusAuthService.verifyPinResetOtp(
                     authorizationHeader,
                     request
             );

     return ResponseEntity.ok(
             response
     );
 }
//=========================================================
//TRANSACTION PIN RESET - CONFIRM NEW PIN
//=========================================================

@PostMapping("/pin-reset/confirm")
public ResponseEntity<String>
      confirmPinReset(

              @RequestHeader("Authorization")
              String authorizationHeader,

              @RequestBody
              CusPinResetConfirmRequest request) {

  cusAuthService.resetTransactionPin(
          authorizationHeader,
          request
  );

  return ResponseEntity.ok(
          "Transaction PIN reset successfully."
  );
}
    // =========================================================
    // 12. REFRESH TOKEN
    // =========================================================

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


    // =========================================================
    // 13. LOGOUT
    // =========================================================

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


    // =========================================================
    // 14. PROTECTED API TEST
    // =========================================================

    @GetMapping("/test")
    public ResponseEntity<String> testProtectedApi() {

        return ResponseEntity.ok(
                "Customer authentication is working."
        );
    }
    
    
}