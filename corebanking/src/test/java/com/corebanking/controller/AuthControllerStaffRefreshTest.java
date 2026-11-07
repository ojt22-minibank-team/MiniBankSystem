package com.corebanking.controller;

import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.dto.CoreRefreshRequest;
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

import java.util.List;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("Staff Refresh Controller Unit Tests - AuthControllerStaffRefreshTest")
public class AuthControllerStaffRefreshTest {

    @Mock
    private AuthService authService;

    @InjectMocks
    private AuthController authController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private static final String REFRESH_URL = "/api/auth/refresh";
    private static final String PLAIN_REFRESH_TOKEN = "plain-refresh-token-test";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(authController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("POST /api/auth/refresh - Success returns 200 OK with refreshed tokens")
    void refresh_success_returns200Ok() throws Exception {
        CoreRefreshRequest request = new CoreRefreshRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        CoreLoginResponse loginResponse = new CoreLoginResponse(
                "refreshed-jwt-access-token",
                "new-plain-refresh-token",
                "teller_user",
                List.of("ROLE_TELLER"),
                List.of("VIEW_PROFILE")
        );

        when(authService.refreshToken(any(CoreRefreshRequest.class))).thenReturn(loginResponse);

        mockMvc.perform(post(REFRESH_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.message", is("Token refreshed successfully")))
                .andExpect(jsonPath("$.data.accessToken", is("refreshed-jwt-access-token")))
                .andExpect(jsonPath("$.data.refreshToken", is("new-plain-refresh-token")))
                .andExpect(jsonPath("$.data.username", is("teller_user")));

        verify(authService).refreshToken(any(CoreRefreshRequest.class));
    }

    @Test
    @DisplayName("POST /api/auth/refresh - Blank refreshToken returns 400 Bad Request")
    void refresh_blankRefreshToken_returns400BadRequest() throws Exception {
        CoreRefreshRequest request = new CoreRefreshRequest();
        request.setRefreshToken("");

        mockMvc.perform(post(REFRESH_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(authService);
    }

    @Test
    @DisplayName("POST /api/auth/refresh - Service throws AuthException returns 401 Unauthorized")
    void refresh_serviceThrowsAuthException_returns401() throws Exception {
        CoreRefreshRequest request = new CoreRefreshRequest();
        request.setRefreshToken("invalid-or-expired-token");

        when(authService.refreshToken(any(CoreRefreshRequest.class)))
                .thenThrow(new AuthException("Invalid refresh token"));

        mockMvc.perform(post(REFRESH_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message", is("Invalid refresh token")));

        verify(authService).refreshToken(any(CoreRefreshRequest.class));
    }
}
