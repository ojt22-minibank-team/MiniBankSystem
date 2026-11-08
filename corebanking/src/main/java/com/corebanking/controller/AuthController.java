package com.corebanking.controller;

import com.corebanking.dto.CoreApiResponse;
import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.dto.CoreLogoutRequest;
import com.corebanking.dto.CoreOtpResendRequest;
import com.corebanking.dto.CoreOtpResendResponse;
import com.corebanking.dto.CoreOtpVerifyRequest;
import com.corebanking.dto.CoreRefreshRequest;
import com.corebanking.exception.AuthException;
import com.corebanking.service.AuthService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CookieValue;
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
        description = "APIs for login, OTP verification, logout, and token refresh"
)
public class AuthController {

    public static final String REFRESH_COOKIE_NAME = "cb_refresh_token";

    private static final String MSG_LOGIN_SUCCESS =
            "Login successful";

    private static final String MSG_OTP_REQUIRED =
            "OTP sent to registered email";

    private static final String MSG_REFRESH_SUCCESS =
            "Token refreshed successfully";

    private static final String MSG_LOGOUT_SUCCESS =
            "Logged out successfully";

    private final AuthService authService;

    private void attachRefreshCookie(HttpServletResponse response, String refreshToken, boolean isSecure) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, refreshToken)
                    .httpOnly(true)
                    .secure(isSecure)
                    .path("/")
                    .maxAge(7 * 24 * 60 * 60)
                    .sameSite("Lax")
                    .build();
            response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
        }
    }

    private void clearRefreshCookie(HttpServletResponse response, boolean isSecure) {
        ResponseCookie cookie = ResponseCookie.from(REFRESH_COOKIE_NAME, "")
                .httpOnly(true)
                .secure(isSecure)
                .path("/")
                .maxAge(0)
                .sameSite("Lax")
                .build();
        response.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    @PostMapping("/login")
    @Operation(
            summary = "Staff Login (Step 1)",
            description = "Validates staff credentials and dispatches an OTP to their registered email"
    )
    public ResponseEntity<CoreApiResponse<CoreLoginResponse>> login(
            @Valid @RequestBody CoreLoginRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        log.info("Login request received for user: {}", request.getUsername());

        CoreLoginResponse data = authService.login(request);

        if (!data.isOtpRequired() && data.getRefreshToken() != null) {
            attachRefreshCookie(servletResponse, data.getRefreshToken(), servletRequest.isSecure());
        }

        String message = data.isOtpRequired() ? MSG_OTP_REQUIRED : MSG_LOGIN_SUCCESS;
        log.info("Login request processed successfully for user: {}", request.getUsername());

        return ResponseEntity.ok(
                CoreApiResponse.<CoreLoginResponse>builder()
                        .success(true)
                        .message(message)
                        .data(data)
                        .build()
        );
    }

    @PostMapping("/verify-otp")
    @Operation(
            summary = "Verify Login OTP (Step 2)",
            description = "Verifies the email OTP and issues access/refresh tokens"
    )
    public ResponseEntity<CoreApiResponse<CoreLoginResponse>> verifyOtp(
            @Valid @RequestBody CoreOtpVerifyRequest request,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        log.info("OTP verification request received");

        CoreLoginResponse data = authService.verifyLoginOtp(request);
        attachRefreshCookie(servletResponse, data.getRefreshToken(), servletRequest.isSecure());

        log.info("OTP verification successful");

        return ResponseEntity.ok(
                CoreApiResponse.<CoreLoginResponse>builder()
                        .success(true)
                        .message(MSG_LOGIN_SUCCESS)
                        .data(data)
                        .build()
        );
    }

    @PostMapping("/resend-otp")
    @Operation(
            summary = "Resend Login OTP",
            description = "Resends a new login OTP code to staff email"
    )
    public ResponseEntity<CoreApiResponse<CoreOtpResendResponse>> resendOtp(
            @Valid @RequestBody CoreOtpResendRequest request
    ) {
        log.info("OTP resend request received");

        CoreOtpResendResponse data = authService.resendLoginOtp(request);

        log.info("OTP resend completed");

        return ResponseEntity.ok(
                CoreApiResponse.<CoreOtpResendResponse>builder()
                        .success(true)
                        .message(data.getMessage())
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
            @RequestBody(required = false) CoreRefreshRequest request,
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String cookieRefreshToken,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        log.info("Token refresh request received");

        String tokenToRefresh = (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank())
                ? request.getRefreshToken()
                : cookieRefreshToken;

        if (tokenToRefresh == null || tokenToRefresh.isBlank()) {
            throw new AuthException("Refresh token is required");
        }

        CoreRefreshRequest effectiveRequest = (request != null) ? request : new CoreRefreshRequest();
        effectiveRequest.setRefreshToken(tokenToRefresh);

        CoreLoginResponse data = authService.refreshToken(effectiveRequest);
        attachRefreshCookie(servletResponse, data.getRefreshToken(), servletRequest.isSecure());

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
    		@RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody(required = false) CoreLogoutRequest request,
            @CookieValue(name = REFRESH_COOKIE_NAME, required = false) String cookieRefreshToken,
            HttpServletRequest servletRequest,
            HttpServletResponse servletResponse
    ) {
        log.info("Logout request received");

        String tokenToRevoke = (request != null && request.getRefreshToken() != null && !request.getRefreshToken().isBlank())
                ? request.getRefreshToken()
                : cookieRefreshToken;

        CoreLogoutRequest effectiveRequest = (request != null) ? request : new CoreLogoutRequest();
        effectiveRequest.setRefreshToken(tokenToRevoke);

        if (authorizationHeader != null && tokenToRevoke != null && !tokenToRevoke.isBlank()) {
            authService.logout(authorizationHeader, effectiveRequest);
        }
        clearRefreshCookie(servletResponse, servletRequest.isSecure());

        return ResponseEntity.ok(
                CoreApiResponse.<Void>builder()
                        .success(true)
                        .message(MSG_LOGOUT_SUCCESS)
                        .data(null)
                        .build()
        );
    }
}
