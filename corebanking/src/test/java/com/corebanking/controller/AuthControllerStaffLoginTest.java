package com.corebanking.controller;

import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
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
        @DisplayName("Should return 200 OK and CoreLoginResponse when request is valid")
        void login_Returns200_WhenValidRequest() throws Exception {
            // Arrange
            CoreLoginResponse mockResponse = new CoreLoginResponse(
                    "mock-access-token",
                    "mock-refresh-token",
                    "test_staff",
                    List.of("ROLE_ADMIN", "ROLE_STAFF"),
                    List.of("STAFF_READ", "STAFF_WRITE")
            );

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
                    .andExpect(jsonPath("$.message", is("Login successful")))
                    .andExpect(jsonPath("$.data.username", is("test_staff")))
                    .andExpect(jsonPath("$.data.accessToken", is("mock-access-token")))
                    .andExpect(jsonPath("$.data.refreshToken", is("mock-refresh-token")))
                    .andExpect(jsonPath("$.data.roles[0]", is("ROLE_ADMIN")))
                    .andExpect(jsonPath("$.data.roles[1]", is("ROLE_STAFF")))
                    .andExpect(jsonPath("$.data.permissions[0]", is("STAFF_READ")))
                    .andExpect(jsonPath("$.data.permissions[1]", is("STAFF_WRITE")));

            verify(authService).login(any(CoreLoginRequest.class));
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
