package com.corebanking.service;

import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.dto.CoreRefreshRequest;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.exception.AuthException;
import com.corebanking.repository.AuthSessionsRepository;
import com.corebanking.repository.JWTRevokedTokensRepository;
import com.corebanking.repository.PermissionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffOtpChallengesRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Staff Refresh Service Unit Tests - AuthServiceStaffRefreshTest")
public class AuthServiceStaffRefreshTest {

    @Mock
    private StaffUsersRepository staffUsersRepository;

    @Mock
    private RolesRepository rolesRepository;

    @Mock
    private PermissionsRepository permissionsRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthSessionsRepository authSessionsRepository;

    @Mock
    private JWTRevokedTokensRepository jwtRevokedTokensRepository;

    @Mock
    private SessionRevocationService sessionRevocationService;

    @Mock
    private EmailService emailService;

    @Mock
    private StaffOtpChallengesRepository staffOtpChallengesRepository;

    @InjectMocks
    private AuthService authService;

    private StaffUsers sampleStaff;
    private AuthSession activeSession;
    private String hashedToken;

    private static final UUID SAMPLE_STAFF_ID = UUID.fromString("22222222-3333-4444-5555-666666666666");
    private static final String SAMPLE_USERNAME = "teller_refresh_staff";
    private static final String PLAIN_REFRESH_TOKEN = "plain-refresh-token-test-12345";

    private static String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException(e);
        }
    }

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "refreshTokenValidityDays", 7);
        ReflectionTestUtils.setField(authService, "maxFailedAttempts", 5);
        ReflectionTestUtils.setField(authService, "lockoutDurationMinutes", 15);

        sampleStaff = StaffUsers.builder()
                .staffId(SAMPLE_STAFF_ID)
                .staffNo("STF-2026-REFRESH")
                .username(SAMPLE_USERNAME)
                .status(StaffUserStatus.ACTIVE)
                .tokenVersion(1L)
                .build();

        hashedToken = hashToken(PLAIN_REFRESH_TOKEN);
        activeSession = AuthSession.builder()
                .sessionUuid(UUID.randomUUID().toString())
                .subjectType(SessionSubjectType.STAFF)
                .staff(sampleStaff)
                .refreshTokenHash(hashedToken)
                .tokenVersionAtIssue(1L)
                .issuedAt(LocalDateTime.now().minusDays(1))
                .refreshExpiresAt(LocalDateTime.now().plusDays(6))
                .idleTimeoutMinutes(30)
                .revokedAt(null)
                .build();
    }

    @Test
    @DisplayName("Should successfully rotate token and return new credentials when refresh token is valid")
    void refreshToken_success_rotatesTokens() {
        CoreRefreshRequest request = new CoreRefreshRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        when(authSessionsRepository.findByRefreshTokenHash(hashedToken))
                .thenReturn(Optional.of(activeSession));

        when(rolesRepository.findRoleCodesByStaffId(any(byte[].class)))
                .thenReturn(List.of("ROLE_TELLER"));
        when(permissionsRepository.findPermissionCodesByStaffId(any(byte[].class)))
                .thenReturn(List.of("VIEW_PROFILE"));

        when(jwtService.generateToken(eq(SAMPLE_STAFF_ID), eq(SAMPLE_USERNAME), eq(1L), anyList(), anyList()))
                .thenReturn("brand-new-jwt-access-token");

        // Act
        CoreLoginResponse response = authService.refreshToken(request);

        // Assert
        assertThat(response).isNotNull();
        assertThat(response.getAccessToken()).isEqualTo("brand-new-jwt-access-token");
        assertThat(response.getRefreshToken()).isNotBlank();
        assertThat(response.getUsername()).isEqualTo(SAMPLE_USERNAME);

        // Verify old session revoked
        assertThat(activeSession.getRevokedAt()).isNotNull();
        assertThat(activeSession.getRevokeReason()).isEqualTo("Token Rotated");

        // Verify new session saved
        ArgumentCaptor<AuthSession> captor = ArgumentCaptor.forClass(AuthSession.class);
        verify(authSessionsRepository, atLeast(2)).save(captor.capture());
        AuthSession newSession = captor.getValue();
        assertThat(newSession.getStaff()).isEqualTo(sampleStaff);
        assertThat(newSession.getRevokedAt()).isNull();
    }

    @Test
    @DisplayName("Should detect reuse of revoked token, revoke all sessions and throw security alert")
    void refreshToken_reusedToken_alertsAndRevokesAllSessions() {
        activeSession.setRevokedAt(LocalDateTime.now().minusHours(2));
        activeSession.setRevokeReason("Token Rotated");

        CoreRefreshRequest request = new CoreRefreshRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        when(authSessionsRepository.findByRefreshTokenHash(hashedToken))
                .thenReturn(Optional.of(activeSession));

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(AuthException.class)
                .hasMessageContaining("Security Alert: Token compromised. All sessions revoked");

        verify(sessionRevocationService).revokeAllActiveSessions(SAMPLE_STAFF_ID);
    }

    @Test
    @DisplayName("Should throw AuthException when refresh token has expired")
    void refreshToken_expiredToken_throwsAuthException() {
        activeSession.setRefreshExpiresAt(LocalDateTime.now().minusMinutes(10));

        CoreRefreshRequest request = new CoreRefreshRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        when(authSessionsRepository.findByRefreshTokenHash(hashedToken))
                .thenReturn(Optional.of(activeSession));

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(AuthException.class)
                .hasMessage("Refresh token has expired. Please login again.");
    }

    @Test
    @DisplayName("Should throw AuthException when token version mismatches staff token version")
    void refreshToken_tokenVersionMismatch_throwsAuthException() {
        sampleStaff.setTokenVersion(2L); // Active session is at version 1L

        CoreRefreshRequest request = new CoreRefreshRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        when(authSessionsRepository.findByRefreshTokenHash(hashedToken))
                .thenReturn(Optional.of(activeSession));

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(AuthException.class)
                .hasMessage("Token version mismatch. Please login again.");
    }

    @Test
    @DisplayName("Should throw AuthException when staff account is not active")
    void refreshToken_inactiveStaff_throwsAuthException() {
        sampleStaff.setStatus(StaffUserStatus.SUSPENDED);

        CoreRefreshRequest request = new CoreRefreshRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        when(authSessionsRepository.findByRefreshTokenHash(hashedToken))
                .thenReturn(Optional.of(activeSession));

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(AuthException.class)
                .hasMessage("Account is not active");
    }

    @Test
    @DisplayName("Should throw AuthException when refresh token does not exist in database")
    void refreshToken_sessionNotFound_throwsAuthException() {
        CoreRefreshRequest request = new CoreRefreshRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        when(authSessionsRepository.findByRefreshTokenHash(hashedToken))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.refreshToken(request))
                .isInstanceOf(AuthException.class)
                .hasMessage("Invalid refresh token");
    }
}
