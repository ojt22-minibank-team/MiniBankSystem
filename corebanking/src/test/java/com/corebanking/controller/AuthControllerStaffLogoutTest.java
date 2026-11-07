package com.corebanking.controller;

import com.corebanking.dto.CoreLogoutRequest;
import com.corebanking.exception.AuthException;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.AuthService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Staff Logout Controller Unit Tests - AuthControllerStaffLogoutTest")
public class AuthControllerStaffLogoutTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private static final String LOGOUT_URL = "/api/auth/logout";
    private static final String VALID_BEARER = "Bearer valid.jwt.token";
    private static final String PLAIN_REFRESH_TOKEN = "plain-refresh-token-12345";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("POST /api/auth/logout - Success returns 200 OK with success message")
    void logout_success_returns200Ok() throws Exception {
        CoreLogoutRequest request = new CoreLogoutRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        doNothing().when(authService).logout(eq(VALID_BEARER), any(CoreLogoutRequest.class));

        mockMvc.perform(post(LOGOUT_URL)
                        .header("Authorization", VALID_BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Logged out successfully")));

        verify(authService).logout(eq(VALID_BEARER), any(CoreLogoutRequest.class));
    }

    @Test
    @DisplayName("POST /api/auth/logout - Blank refreshToken returns 400 Bad Request")
    void logout_blankRefreshToken_returns400BadRequest() throws Exception {
        CoreLogoutRequest request = new CoreLogoutRequest();
        request.setRefreshToken("");

        mockMvc.perform(post(LOGOUT_URL)
                        .header("Authorization", VALID_BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("POST /api/auth/logout - Missing Authorization header returns 400 Bad Request")
    void logout_missingAuthorizationHeader_returns400BadRequest() throws Exception {
        CoreLogoutRequest request = new CoreLogoutRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        mockMvc.perform(post(LOGOUT_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("POST /api/auth/logout - Service throws AuthException returns 401 Unauthorized")
    void logout_serviceThrowsAuthException_returns401() throws Exception {
        CoreLogoutRequest request = new CoreLogoutRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        doThrow(new AuthException("Refresh token does not belong to this staff"))
                .when(authService).logout(eq(VALID_BEARER), any(CoreLogoutRequest.class));

        mockMvc.perform(post(LOGOUT_URL)
                        .header("Authorization", VALID_BEARER)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("Refresh token does not belong to this staff")));

        verify(authService).logout(eq(VALID_BEARER), any(CoreLogoutRequest.class));
    }
}
