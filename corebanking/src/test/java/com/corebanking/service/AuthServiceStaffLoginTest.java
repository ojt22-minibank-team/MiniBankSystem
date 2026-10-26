package com.corebanking.service;

import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.exception.AuthException;
import com.corebanking.repository.AuthSessionsRepository;
import com.corebanking.repository.JWTRevokedTokensRepository;
import com.corebanking.repository.PermissionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Staff Login Unit Tests - AuthService")
class AuthServiceStaffLoginTest {

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

    @InjectMocks
    private AuthService authService;

    private StaffUsers activeStaff;
    private CoreLoginRequest loginRequest;

    private static final String TEST_USERNAME = "staff_teller";
    private static final String RAW_PASSWORD = "ValidPassword123!";
    private static final String ENCODED_PASSWORD = "$2a$12$hashedPasswordExample";
    private static final UUID STAFF_UUID = UUID.fromString("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee");

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "maxFailedAttempts", 5);
        ReflectionTestUtils.setField(authService, "lockoutDurationMinutes", 15);
        ReflectionTestUtils.setField(authService, "refreshTokenValidityDays", 7);

        activeStaff = StaffUsers.builder()
                .staffId(STAFF_UUID)
                .staffNo("STF-001")
                .username(TEST_USERNAME)
                .fullName("John Staff")
                .email("staff@minibank.com")
                .passwordHash(ENCODED_PASSWORD)
                .mustChangePassword(false)
                .status(StaffUserStatus.ACTIVE)
                .failedLoginCount(0)
                .lockedUntil(null)
                .tokenVersion(1L)
                .build();

        loginRequest = new CoreLoginRequest();
        loginRequest.setUsername(TEST_USERNAME);
        loginRequest.setPassword(RAW_PASSWORD);
    }

    @Nested
    @DisplayName("Successful Staff Login Scenarios")
    class SuccessScenarios {

        @Test
        @DisplayName("Should login successfully with valid credentials and return tokens, roles and permissions")
        void login_Success_WhenCredentialsAreValid() {
            // Arrange
            List<String> mockRoles = List.of("ROLE_TELLER", "ROLE_STAFF");
            List<String> mockPermissions = List.of("ACCOUNT_VIEW", "TRANSACTION_CREATE");
            String mockAccessToken = "mock.access.token";

            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
            when(rolesRepository.findRoleCodesByStaffId(any(byte[].class))).thenReturn(mockRoles);
            when(permissionsRepository.findPermissionCodesByStaffId(any(byte[].class))).thenReturn(mockPermissions);
            when(jwtService.generateToken(eq(STAFF_UUID), eq(TEST_USERNAME), eq(1L), eq(mockRoles), eq(mockPermissions)))
                    .thenReturn(mockAccessToken);

            // Act
            CoreLoginResponse response = authService.login(loginRequest);

            // Assert
            assertNotNull(response);
            assertEquals(mockAccessToken, response.getAccessToken());
            assertNotNull(response.getRefreshToken());
            assertFalse(response.getRefreshToken().isBlank());
            assertEquals(TEST_USERNAME, response.getUsername());
            assertEquals(mockRoles, response.getRoles());
            assertEquals(mockPermissions, response.getPermissions());

            // Verify staff state reset
            assertEquals(0, activeStaff.getFailedLoginCount());
            assertNull(activeStaff.getLockedUntil());
            assertNotNull(activeStaff.getLastLoginAt());
            verify(staffUsersRepository).save(activeStaff);

            // Verify session creation
            ArgumentCaptor<AuthSession> sessionCaptor = ArgumentCaptor.forClass(AuthSession.class);
            verify(authSessionsRepository).save(sessionCaptor.capture());
            AuthSession savedSession = sessionCaptor.getValue();

            assertNotNull(savedSession.getSessionUuid());
            assertEquals(SessionSubjectType.STAFF, savedSession.getSubjectType());
            assertEquals(activeStaff, savedSession.getStaff());
            assertNotNull(savedSession.getRefreshTokenHash());
            assertEquals(1L, savedSession.getTokenVersionAtIssue());
            assertEquals(15, savedSession.getIdleTimeoutMinutes());
            assertTrue(savedSession.getRefreshExpiresAt().isAfter(LocalDateTime.now().plusDays(6)));
        }

        @Test
        @DisplayName("Should successfully login when previous lockout has expired")
        void login_Success_WhenPreviousLockoutHasExpired() {
            // Arrange
            activeStaff.setLockedUntil(LocalDateTime.now().minusMinutes(5));
            activeStaff.setFailedLoginCount(5);

            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
            when(rolesRepository.findRoleCodesByStaffId(any())).thenReturn(List.of("ROLE_STAFF"));
            when(permissionsRepository.findPermissionCodesByStaffId(any())).thenReturn(List.of("READ"));
            when(jwtService.generateToken(any(), any(), anyLong(), any(), any())).thenReturn("mock.token");

            // Act
            CoreLoginResponse response = authService.login(loginRequest);

            // Assert
            assertNotNull(response);
            assertEquals(0, activeStaff.getFailedLoginCount());
            assertNull(activeStaff.getLockedUntil());
            verify(staffUsersRepository).save(activeStaff);
            verify(authSessionsRepository).save(any(AuthSession.class));
        }
    }

    @Nested
    @DisplayName("Failed Staff Login Scenarios - Invalid User or Password")
    class AuthenticationFailureScenarios {

        @Test
        @DisplayName("Should throw AuthException and perform dummy password check when user is not found")
        void login_ThrowsAuthException_WhenUserNotFound() {
            // Arrange
            when(staffUsersRepository.findByUsernameWithLock("unknown_staff")).thenReturn(Optional.empty());
            loginRequest.setUsername("unknown_staff");

            // Act & Assert
            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Invalid username or password", exception.getMessage());

            // Verify dummy hash comparison to prevent timing attacks
            verify(passwordEncoder).matches(eq(RAW_PASSWORD), anyString());
            verify(staffUsersRepository, never()).save(any());
            verify(authSessionsRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should increment failed login count and throw AuthException when password is wrong")
        void login_ThrowsAuthException_AndIncrementsFailedCount_WhenPasswordIsIncorrect() {
            // Arrange
            activeStaff.setFailedLoginCount(2);
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(false);

            // Act & Assert
            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Invalid username or password", exception.getMessage());

            // Verify failedLoginCount incremented to 3 and not locked
            assertEquals(3, activeStaff.getFailedLoginCount());
            assertNull(activeStaff.getLockedUntil());
            verify(staffUsersRepository).save(activeStaff);
            verify(authSessionsRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should lock account when failed login count reaches threshold (5)")
        void login_ThrowsAuthException_AndLocksAccount_WhenFailedCountReachesMax() {
            // Arrange
            activeStaff.setFailedLoginCount(4); // 5th attempt
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(false);

            // Act & Assert
            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Invalid username or password", exception.getMessage());

            // Verify failedLoginCount reached 5 and lockedUntil is set ~15 mins into the future
            assertEquals(5, activeStaff.getFailedLoginCount());
            assertNotNull(activeStaff.getLockedUntil());
            assertTrue(activeStaff.getLockedUntil().isAfter(LocalDateTime.now().plusMinutes(14)));
            verify(staffUsersRepository).save(activeStaff);
        }
    }

    @Nested
    @DisplayName("Account State Constraint Scenarios")
    class AccountStateScenarios {

        @Test
        @DisplayName("Should reject login if account is temporarily locked")
        void login_ThrowsAuthException_WhenAccountIsLocked() {
            // Arrange
            activeStaff.setLockedUntil(LocalDateTime.now().plusMinutes(10));
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));

            // Act & Assert
            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Account is temporarily locked due to too many failed attempts. Please try again later.", exception.getMessage());

            // Password check must not even be executed
            verify(passwordEncoder, never()).matches(anyString(), anyString());
            verify(staffUsersRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should reject login if staff account status is SUSPENDED")
        void login_ThrowsAuthException_WhenAccountIsSuspended() {
            // Arrange
            activeStaff.setStatus(StaffUserStatus.SUSPENDED);
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));

            // Act & Assert
            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Account is not active", exception.getMessage());
            verify(passwordEncoder, never()).matches(anyString(), anyString());
        }

        @Test
        @DisplayName("Should reject login if staff account status is DEACTIVATED")
        void login_ThrowsAuthException_WhenAccountIsDeactivated() {
            // Arrange
            activeStaff.setStatus(StaffUserStatus.DEACTIVATED);
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));

            // Act & Assert
            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Account is not active", exception.getMessage());
            verify(passwordEncoder, never()).matches(anyString(), anyString());
        }

        @Test
        @DisplayName("Should reject login and prompt password setup if mustChangePassword is true")
        void login_ThrowsAuthException_WhenMustChangePasswordIsTrue() {
            // Arrange
            activeStaff.setMustChangePassword(true);
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));

            // Act & Assert
            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Password setup is required. Please use the setup link sent to your email.", exception.getMessage());
            verify(passwordEncoder, never()).matches(anyString(), anyString());
        }
    }
}
