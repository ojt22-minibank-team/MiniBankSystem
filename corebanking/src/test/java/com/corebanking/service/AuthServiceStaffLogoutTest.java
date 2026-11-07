package com.corebanking.service;

import com.corebanking.dto.CoreLogoutRequest;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.StaffUsers;
import com.corebanking.exception.AuthException;
import com.corebanking.repository.AuthSessionsRepository;
import com.corebanking.repository.JWTRevokedTokensRepository;
import com.corebanking.repository.PermissionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffOtpChallengesRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.security.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.impl.DefaultClaims;
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
import java.time.ZoneId;
import java.util.Base64;
import java.util.Date;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Staff Logout Service Unit Tests - AuthServiceStaffLogoutTest")
public class AuthServiceStaffLogoutTest {

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
    private Claims validClaims;
    private Date futureExpiration;

    private static final UUID SAMPLE_STAFF_ID = UUID.fromString("11111111-2222-3333-4444-555555555555");
    private static final String SAMPLE_USERNAME = "teller_logout_staff";
    private static final String ACCESS_TOKEN = "sample-valid-jwt-token";
    private static final String BEARER_HEADER = "Bearer " + ACCESS_TOKEN;
    private static final String JTI = "jwt-session-jti-logout-01";
    private static final String PLAIN_REFRESH_TOKEN = "plain-refresh-token-logout";

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
                .staffNo("STF-2026-LOGOUT")
                .username(SAMPLE_USERNAME)
                .build();

        futureExpiration = Date.from(LocalDateTime.now().plusHours(1).atZone(ZoneId.systemDefault()).toInstant());
        validClaims = new DefaultClaims();
        validClaims.setId(JTI);
        validClaims.setExpiration(futureExpiration);
        validClaims.put("staff_id", SAMPLE_STAFF_ID.toString());
    }

    @Test
    @DisplayName("Should successfully revoke refresh session and blacklist active access token")
    void logout_success_revokesSessionAndBlacklistsToken() {
        CoreLogoutRequest request = new CoreLogoutRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        String hashedToken = hashToken(PLAIN_REFRESH_TOKEN);
        AuthSession session = AuthSession.builder()
                .sessionUuid(UUID.randomUUID().toString())
                .staff(sampleStaff)
                .refreshTokenHash(hashedToken)
                .revokedAt(null)
                .build();

        when(jwtService.extractAllClaims(ACCESS_TOKEN)).thenReturn(validClaims);
        when(staffUsersRepository.findById(SAMPLE_STAFF_ID)).thenReturn(Optional.of(sampleStaff));
        when(authSessionsRepository.findByRefreshTokenHash(hashedToken)).thenReturn(Optional.of(session));
        when(jwtRevokedTokensRepository.existsByJti(JTI)).thenReturn(false);

        // Act
        authService.logout(BEARER_HEADER, request);

        // Assert
        assertThat(session.getRevokedAt()).isNotNull();
        assertThat(session.getRevokeReason()).isEqualTo("User Logout");
        verify(authSessionsRepository).save(session);

        ArgumentCaptor<JwtRevokedTokens> captor = ArgumentCaptor.forClass(JwtRevokedTokens.class);
        verify(jwtRevokedTokensRepository).save(captor.capture());
        JwtRevokedTokens blacklistedToken = captor.getValue();
        assertThat(blacklistedToken.getJti()).isEqualTo(JTI);
        assertThat(blacklistedToken.getStaff()).isEqualTo(sampleStaff);
        assertThat(blacklistedToken.getReason()).isEqualTo("User Logout");
    }

    @Test
    @DisplayName("Should allow logout using an expired access token without blacklisting")
    void logout_expiredAccessToken_succeedsWithoutBlacklisting() {
        CoreLogoutRequest request = new CoreLogoutRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        Date pastExpiration = Date.from(LocalDateTime.now().minusMinutes(5).atZone(ZoneId.systemDefault()).toInstant());
        DefaultClaims expiredClaims = new DefaultClaims();
        expiredClaims.setId(JTI);
        expiredClaims.setExpiration(pastExpiration);
        expiredClaims.put("staff_id", SAMPLE_STAFF_ID.toString());

        ExpiredJwtException expiredEx = new ExpiredJwtException(null, expiredClaims, "Token expired");
        when(jwtService.extractAllClaims(ACCESS_TOKEN)).thenThrow(expiredEx);

        String hashedToken = hashToken(PLAIN_REFRESH_TOKEN);
        AuthSession session = AuthSession.builder()
                .sessionUuid(UUID.randomUUID().toString())
                .staff(sampleStaff)
                .refreshTokenHash(hashedToken)
                .revokedAt(null)
                .build();

        when(staffUsersRepository.findById(SAMPLE_STAFF_ID)).thenReturn(Optional.of(sampleStaff));
        when(authSessionsRepository.findByRefreshTokenHash(hashedToken)).thenReturn(Optional.of(session));

        // Act
        authService.logout(BEARER_HEADER, request);

        // Assert
        assertThat(session.getRevokedAt()).isNotNull();
        verify(authSessionsRepository).save(session);
        verify(jwtRevokedTokensRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw AuthException when Authorization header does not start with Bearer")
    void logout_invalidHeader_throwsAuthException() {
        CoreLogoutRequest request = new CoreLogoutRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        assertThatThrownBy(() -> authService.logout("Basic invalid-token", request))
                .isInstanceOf(AuthException.class)
                .hasMessage("Authorization token is required");
    }

    @Test
    @DisplayName("Should throw AuthException when Bearer access token is blank")
    void logout_blankAccessToken_throwsAuthException() {
        CoreLogoutRequest request = new CoreLogoutRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        assertThatThrownBy(() -> authService.logout("Bearer    ", request))
                .isInstanceOf(AuthException.class)
                .hasMessage("Access token is empty");
    }

    @Test
    @DisplayName("Should throw AuthException when refresh token belongs to a different staff member")
    void logout_mismatchedStaffToken_throwsAuthException() {
        CoreLogoutRequest request = new CoreLogoutRequest();
        request.setRefreshToken(PLAIN_REFRESH_TOKEN);

        UUID otherStaffId = UUID.randomUUID();
        StaffUsers otherStaff = StaffUsers.builder().staffId(otherStaffId).build();

        String hashedToken = hashToken(PLAIN_REFRESH_TOKEN);
        AuthSession session = AuthSession.builder()
                .staff(otherStaff)
                .refreshTokenHash(hashedToken)
                .build();

        when(jwtService.extractAllClaims(ACCESS_TOKEN)).thenReturn(validClaims);
        when(staffUsersRepository.findById(SAMPLE_STAFF_ID)).thenReturn(Optional.of(sampleStaff));
        when(authSessionsRepository.findByRefreshTokenHash(hashedToken)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> authService.logout(BEARER_HEADER, request))
                .isInstanceOf(AuthException.class)
                .hasMessage("Refresh token does not belong to this staff");
    }
}
