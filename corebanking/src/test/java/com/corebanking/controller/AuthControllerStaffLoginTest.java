package com.corebanking.controller;

import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.dto.CoreOtpResendRequest;
import com.corebanking.dto.CoreOtpResendResponse;
import com.corebanking.dto.CoreOtpVerifyRequest;
import com.corebanking.exception.AuthException;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Staff Login Unit Tests - AuthController")
class AuthControllerStaffLoginTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;

    private static final String LOGIN_URL = "/api/auth/login";
    private static final String VERIFY_OTP_URL = "/api/auth/verify-otp";
    private static final String RESEND_OTP_URL = "/api/auth/resend-otp";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Nested
    @DisplayName("POST /api/auth/login - Success Scenarios")
    class SuccessScenarios {

        @Test
        @DisplayName("Should return 200 OK and OTP challenge response when credentials are valid")
        void login_Returns200_WhenValidRequest() throws Exception {
            // Arrange
            CoreLoginResponse mockResponse = CoreLoginResponse.builder()
                    .otpRequired(true)
                    .challengeGroupId("grp-12345")
                    .destinationMasked("st****@minibank.com")
                    .username("test_staff")
                    .build();

            when(authService.login(any(CoreLoginRequest.class))).thenReturn(mockResponse);

            String requestBody = """
                    {
                        "username": "test_staff",
                        "password": "Password123!"
                    }
                    """;

            // Act & Assert
            mockMvc.perform(post(LOGIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.message", is("OTP sent to registered email")))
                    .andExpect(jsonPath("$.data.otpRequired", is(true)))
                    .andExpect(jsonPath("$.data.challengeGroupId", is("grp-12345")))
                    .andExpect(jsonPath("$.data.destinationMasked", is("st****@minibank.com")))
                    .andExpect(jsonPath("$.data.username", is("test_staff")));

            verify(authService).login(any(CoreLoginRequest.class));
        }
    }

    @Nested
    @DisplayName("POST /api/auth/verify-otp - OTP Verification Scenarios")
    class VerifyOtpScenarios {

        @Test
        @DisplayName("Should return 200 OK and tokens when OTP verification succeeds")
        void verifyOtp_Returns200_WhenOtpValid() throws Exception {
            CoreLoginResponse mockResponse = CoreLoginResponse.builder()
                    .otpRequired(false)
                    .accessToken("mock-access-token")
                    .refreshToken("mock-refresh-token")
                    .username("test_staff")
                    .roles(List.of("ROLE_ADMIN", "ROLE_STAFF"))
                    .permissions(List.of("STAFF_READ", "STAFF_WRITE"))
                    .build();

            when(authService.verifyLoginOtp(any(CoreOtpVerifyRequest.class))).thenReturn(mockResponse);

            String requestBody = """
                    {
                        "challengeGroupId": "grp-12345",
                        "otp": "123456"
                    }
                    """;

            mockMvc.perform(post(VERIFY_OTP_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.message", is("Login successful")))
                    .andExpect(jsonPath("$.data.otpRequired", is(false)))
                    .andExpect(jsonPath("$.data.accessToken", is("mock-access-token")))
                    .andExpect(jsonPath("$.data.refreshToken", is("mock-refresh-token")))
                    .andExpect(jsonPath("$.data.username", is("test_staff")))
                    .andExpect(jsonPath("$.data.roles[0]", is("ROLE_ADMIN")))
                    .andExpect(jsonPath("$.data.permissions[0]", is("STAFF_READ")));

            verify(authService).verifyLoginOtp(any(CoreOtpVerifyRequest.class));
        }

        @Test
        @DisplayName("Should return 401 when OTP is invalid")
        void verifyOtp_Returns401_WhenOtpInvalid() throws Exception {
            when(authService.verifyLoginOtp(any(CoreOtpVerifyRequest.class)))
                    .thenThrow(new AuthException("Invalid OTP code. 4 attempts remaining."));

            String requestBody = """
                    {
                        "challengeGroupId": "grp-12345",
                        "otp": "999999"
                    }
                    """;

            mockMvc.perform(post(VERIFY_OTP_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code", is("AUTH_FAILED")))
                    .andExpect(jsonPath("$.message", containsString("Invalid OTP code")));
        }
    }

    @Nested
    @DisplayName("POST /api/auth/resend-otp - Resend Scenarios")
    class ResendOtpScenarios {

        @Test
        @DisplayName("Should return 200 OK when resend request is valid")
        void resendOtp_Returns200_WhenValid() throws Exception {
            CoreOtpResendResponse mockResponse = CoreOtpResendResponse.builder()
                    .success(true)
                    .message("A new OTP code has been sent to your email.")
                    .challengeGroupId("grp-12345")
                    .resendNo(1)
                    .maxResendAttempts(5)
                    .build();

            when(authService.resendLoginOtp(any(CoreOtpResendRequest.class))).thenReturn(mockResponse);

            String requestBody = """
                    {
                        "challengeGroupId": "grp-12345"
                    }
                    """;

            mockMvc.perform(post(RESEND_OTP_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.success", is(true)))
                    .andExpect(jsonPath("$.message", containsString("new OTP code has been sent")))
                    .andExpect(jsonPath("$.data.resendNo", is(1)));

            verify(authService).resendLoginOtp(any(CoreOtpResendRequest.class));
        }
    }

    @Nested
    @DisplayName("POST /api/auth/login - Validation Failure Scenarios")
    class ValidationFailureScenarios {

        @Test
        @DisplayName("Should return 400 Bad Request when username is blank")
        void login_Returns400_WhenUsernameIsBlank() throws Exception {
            String requestBody = """
                    {
                        "username": "",
                        "password": "Password123!"
                    }
                    """;

            mockMvc.perform(post(LOGIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                    .andExpect(jsonPath("$.message", containsString("username: Username is required")));
        }

        @Test
        @DisplayName("Should return 400 Bad Request when password is blank")
        void login_Returns400_WhenPasswordIsBlank() throws Exception {
            String requestBody = """
                    {
                        "username": "test_staff",
                        "password": ""
                    }
                    """;

            mockMvc.perform(post(LOGIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")))
                    .andExpect(jsonPath("$.message", containsString("password: Password is required")));
        }

        @Test
        @DisplayName("Should return 400 Bad Request when payload is empty JSON")
        void login_Returns400_WhenBodyIsEmpty() throws Exception {
            mockMvc.perform(post(LOGIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{}"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));
        }
    }

    @Nested
    @DisplayName("POST /api/auth/login - Authentication Failure Scenarios")
    class AuthFailureScenarios {

        @Test
        @DisplayName("Should return 401 Unauthorized when credentials are invalid")
        void login_Returns401_WhenCredentialsInvalid() throws Exception {
            when(authService.login(any(CoreLoginRequest.class)))
                    .thenThrow(new AuthException("Invalid username or password"));

            String requestBody = """
                    {
                        "username": "test_staff",
                        "password": "WrongPassword!"
                    }
                    """;

            mockMvc.perform(post(LOGIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code", is("AUTH_FAILED")))
                    .andExpect(jsonPath("$.message", is("Invalid username or password")));
        }

        @Test
        @DisplayName("Should return 401 Unauthorized when account is locked")
        void login_Returns401_WhenAccountIsLocked() throws Exception {
            when(authService.login(any(CoreLoginRequest.class)))
                    .thenThrow(new AuthException("Account is temporarily locked due to too many failed attempts. Please try again later."));

            String requestBody = """
                    {
                        "username": "locked_staff",
                        "password": "Password123!"
                    }
                    """;

            mockMvc.perform(post(LOGIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code", is("AUTH_FAILED")))
                    .andExpect(jsonPath("$.message", containsString("Account is temporarily locked")));
        }

        @Test
        @DisplayName("Should return 401 Unauthorized when staff account is not active")
        void login_Returns401_WhenAccountIsNotActive() throws Exception {
            when(authService.login(any(CoreLoginRequest.class)))
                    .thenThrow(new AuthException("Account is not active"));

            String requestBody = """
                    {
                        "username": "inactive_staff",
                        "password": "Password123!"
                    }
                    """;

            mockMvc.perform(post(LOGIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code", is("AUTH_FAILED")))
                    .andExpect(jsonPath("$.message", is("Account is not active")));
        }

        @Test
        @DisplayName("Should return 401 Unauthorized when first-time password setup is required")
        void login_Returns401_WhenPasswordSetupRequired() throws Exception {
            when(authService.login(any(CoreLoginRequest.class)))
                    .thenThrow(new AuthException("Password setup is required. Please use the setup link sent to your email."));

            String requestBody = """
                    {
                        "username": "new_staff",
                        "password": "Password123!"
                    }
                    """;

            mockMvc.perform(post(LOGIN_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(requestBody))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.code", is("AUTH_FAILED")))
                    .andExpect(jsonPath("$.message", containsString("Password setup is required")));
        }
    }
}
