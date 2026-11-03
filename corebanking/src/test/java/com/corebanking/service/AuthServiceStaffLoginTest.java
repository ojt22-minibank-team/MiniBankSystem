package com.corebanking.service;

import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.dto.CoreOtpResendRequest;
import com.corebanking.dto.CoreOtpResendResponse;
import com.corebanking.dto.CoreOtpVerifyRequest;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.DeliveryChannel;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.OtpSubjectType;
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
import java.util.ArrayList;
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

    @Mock
    private SessionRevocationService sessionRevocationService;

    @Mock
    private EmailService emailService;

    @Mock
    private StaffOtpChallengesRepository staffOtpChallengesRepository;

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
    @DisplayName("Step 1: Credentials Check and OTP Dispatch")
    class LoginOtpDispatchScenarios {

        @Test
        @DisplayName("Should validate credentials, issue OTP challenge and send email")
        void login_Success_IssuesOtpChallengeAndSendsEmail() {
            // Arrange
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);
            when(staffOtpChallengesRepository.findByStaffAndSubjectTypeAndPurposeAndStatus(
                    eq(activeStaff), eq(OtpSubjectType.STAFF), eq(OtpPurpose.LOGIN), eq(OtpStatus.ACTIVE)))
                    .thenReturn(new ArrayList<>());
            when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$encodedOtpChallenge");

            // Act
            CoreLoginResponse response = authService.login(loginRequest);

            // Assert
            assertNotNull(response);
            assertTrue(response.isOtpRequired());
            assertNotNull(response.getChallengeGroupId());
            assertEquals("st****@minibank.com", response.getDestinationMasked());
            assertEquals(TEST_USERNAME, response.getUsername());
            assertNull(response.getAccessToken());

            // Verify OTP challenge saved
            ArgumentCaptor<OtpChallenge> challengeCaptor = ArgumentCaptor.forClass(OtpChallenge.class);
            verify(staffOtpChallengesRepository).save(challengeCaptor.capture());
            OtpChallenge savedChallenge = challengeCaptor.getValue();
            assertEquals(OtpSubjectType.STAFF, savedChallenge.getSubjectType());
            assertEquals(activeStaff, savedChallenge.getStaff());
            assertEquals(OtpPurpose.LOGIN, savedChallenge.getPurpose());
            assertEquals(DeliveryChannel.EMAIL, savedChallenge.getDeliveryChannel());
            assertEquals(OtpStatus.ACTIVE, savedChallenge.getStatus());

            // Verify email sent
            verify(emailService).sendStaffLoginOtpEmail(eq("staff@minibank.com"), anyString(), eq(5));
        }

        @Test
        @DisplayName("Should throw AuthException when staff has no email registered")
        void login_ThrowsAuthException_WhenEmailIsMissing() {
            activeStaff.setEmail(null);
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(true);

            AuthException ex = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertTrue(ex.getMessage().contains("No email address registered"));
            verify(emailService, never()).sendStaffLoginOtpEmail(any(), any(), anyInt());
        }
    }

    @Nested
    @DisplayName("Step 2: OTP Verification and Token Issuance")
    class VerifyLoginOtpScenarios {

        private OtpChallenge activeOtpChallenge;
        private static final String CHALLENGE_GROUP_ID = "challenge-grp-12345";
        private static final String RAW_OTP = "123456";
        private static final String ENCODED_OTP = "$2a$10$hashedOtp123456";

        @BeforeEach
        void initChallenge() {
            activeOtpChallenge = OtpChallenge.builder()
                    .otpId(100L)
                    .subjectType(OtpSubjectType.STAFF)
                    .staff(activeStaff)
                    .purpose(OtpPurpose.LOGIN)
                    .otpHash(ENCODED_OTP)
                    .deliveryChannel(DeliveryChannel.EMAIL)
                    .destinationMasked("st****@minibank.com")
                    .attemptCount(0)
                    .maxAttempts(5)
                    .expiresAt(LocalDateTime.now().plusMinutes(5))
                    .status(OtpStatus.ACTIVE)
                    .challengeGroupId(CHALLENGE_GROUP_ID)
                    .resendNo(0)
                    .maxResendAttempts(5)
                    .build();
        }

        @Test
        @DisplayName("Should login successfully when valid OTP is provided")
        void verifyOtp_Success_WhenValid() {
            List<String> mockRoles = List.of("ROLE_TELLER", "ROLE_STAFF");
            List<String> mockPermissions = List.of("ACCOUNT_VIEW", "TRANSACTION_CREATE");
            String mockAccessToken = "mock.access.token";

            when(staffOtpChallengesRepository.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                    CHALLENGE_GROUP_ID, OtpSubjectType.STAFF, OtpPurpose.LOGIN))
                    .thenReturn(Optional.of(activeOtpChallenge));
            when(passwordEncoder.matches(RAW_OTP, ENCODED_OTP)).thenReturn(true);
            when(rolesRepository.findRoleCodesByStaffId(any(byte[].class))).thenReturn(mockRoles);
            when(permissionsRepository.findPermissionCodesByStaffId(any(byte[].class))).thenReturn(mockPermissions);
            when(jwtService.generateToken(eq(STAFF_UUID), eq(TEST_USERNAME), eq(1L), eq(mockRoles), eq(mockPermissions)))
                    .thenReturn(mockAccessToken);

            CoreOtpVerifyRequest request = new CoreOtpVerifyRequest(CHALLENGE_GROUP_ID, RAW_OTP);

            CoreLoginResponse response = authService.verifyLoginOtp(request);

            assertNotNull(response);
            assertFalse(response.isOtpRequired());
            assertEquals(mockAccessToken, response.getAccessToken());
            assertNotNull(response.getRefreshToken());
            assertEquals(TEST_USERNAME, response.getUsername());
            assertEquals(mockRoles, response.getRoles());
            assertEquals(mockPermissions, response.getPermissions());

            // Challenge marked consumed
            assertEquals(OtpStatus.CONSUMED, activeOtpChallenge.getStatus());
            assertNotNull(activeOtpChallenge.getConsumedAt());
            verify(staffOtpChallengesRepository).save(activeOtpChallenge);

            // Staff login count reset & updated
            assertEquals(0, activeStaff.getFailedLoginCount());
            assertNull(activeStaff.getLockedUntil());
            assertNotNull(activeStaff.getLastLoginAt());
            verify(staffUsersRepository).save(activeStaff);

            // AuthSession created
            verify(authSessionsRepository).save(any(AuthSession.class));
        }

        @Test
        @DisplayName("Should increment attempt count and throw AuthException when OTP is incorrect")
        void verifyOtp_ThrowsAuthException_WhenOtpIncorrect() {
            when(staffOtpChallengesRepository.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                    CHALLENGE_GROUP_ID, OtpSubjectType.STAFF, OtpPurpose.LOGIN))
                    .thenReturn(Optional.of(activeOtpChallenge));
            when(passwordEncoder.matches("000000", ENCODED_OTP)).thenReturn(false);

            CoreOtpVerifyRequest request = new CoreOtpVerifyRequest(CHALLENGE_GROUP_ID, "000000");

            AuthException ex = assertThrows(AuthException.class, () -> authService.verifyLoginOtp(request));
            assertTrue(ex.getMessage().contains("Invalid OTP code"));
            assertEquals(1, activeOtpChallenge.getAttemptCount());
            verify(staffOtpChallengesRepository).save(activeOtpChallenge);
            verify(authSessionsRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw AuthException when OTP is expired")
        void verifyOtp_ThrowsAuthException_WhenExpired() {
            activeOtpChallenge.setExpiresAt(LocalDateTime.now().minusMinutes(1));

            when(staffOtpChallengesRepository.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                    CHALLENGE_GROUP_ID, OtpSubjectType.STAFF, OtpPurpose.LOGIN))
                    .thenReturn(Optional.of(activeOtpChallenge));

            CoreOtpVerifyRequest request = new CoreOtpVerifyRequest(CHALLENGE_GROUP_ID, RAW_OTP);

            AuthException ex = assertThrows(AuthException.class, () -> authService.verifyLoginOtp(request));
            assertTrue(ex.getMessage().contains("expired"));
            assertEquals(OtpStatus.EXPIRED, activeOtpChallenge.getStatus());
        }
    }

    @Nested
    @DisplayName("Resend Login OTP Scenarios")
    class ResendLoginOtpScenarios {

        @Test
        @DisplayName("Should expire old OTP and issue a new OTP on resend")
        void resendOtp_Success() {
            OtpChallenge oldOtp = OtpChallenge.builder()
                    .otpId(101L)
                    .subjectType(OtpSubjectType.STAFF)
                    .staff(activeStaff)
                    .purpose(OtpPurpose.LOGIN)
                    .otpHash("$2a$10$oldHash")
                    .destinationMasked("st****@minibank.com")
                    .status(OtpStatus.ACTIVE)
                    .challengeGroupId("grp-resend")
                    .resendNo(0)
                    .maxResendAttempts(5)
                    .maxAttempts(5)
                    .build();

            when(staffOtpChallengesRepository.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                    "grp-resend", OtpSubjectType.STAFF, OtpPurpose.LOGIN))
                    .thenReturn(Optional.of(oldOtp));
            when(passwordEncoder.encode(anyString())).thenReturn("$2a$10$newHash");

            CoreOtpResendRequest request = new CoreOtpResendRequest("grp-resend");
            CoreOtpResendResponse response = authService.resendLoginOtp(request);

            assertTrue(response.isSuccess());
            assertEquals(1, response.getResendNo());
            assertEquals(OtpStatus.EXPIRED, oldOtp.getStatus());
            verify(emailService).sendStaffLoginOtpEmail(eq("staff@minibank.com"), anyString(), eq(5));
        }
    }

    @Nested
    @DisplayName("Failed Staff Login Scenarios - Invalid User or Password")
    class AuthenticationFailureScenarios {

        @Test
        @DisplayName("Should throw AuthException and perform dummy password check when user is not found")
        void login_ThrowsAuthException_WhenUserNotFound() {
            when(staffUsersRepository.findByUsernameWithLock("unknown_staff")).thenReturn(Optional.empty());
            loginRequest.setUsername("unknown_staff");

            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Invalid username or password", exception.getMessage());

            verify(passwordEncoder).matches(eq(RAW_PASSWORD), anyString());
            verify(staffUsersRepository, never()).save(any());
            verify(staffOtpChallengesRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should increment failed login count and throw AuthException when password is wrong")
        void login_ThrowsAuthException_AndIncrementsFailedCount_WhenPasswordIsIncorrect() {
            activeStaff.setFailedLoginCount(2);
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(false);

            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Invalid username or password", exception.getMessage());

            assertEquals(3, activeStaff.getFailedLoginCount());
            assertNull(activeStaff.getLockedUntil());
            verify(staffUsersRepository).save(activeStaff);
            verify(staffOtpChallengesRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should lock account when failed login count reaches threshold (5)")
        void login_ThrowsAuthException_AndLocksAccount_WhenFailedCountReachesMax() {
            activeStaff.setFailedLoginCount(4);
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));
            when(passwordEncoder.matches(RAW_PASSWORD, ENCODED_PASSWORD)).thenReturn(false);

            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Invalid username or password", exception.getMessage());

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
            activeStaff.setLockedUntil(LocalDateTime.now().plusMinutes(10));
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));

            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Account is temporarily locked due to too many failed attempts. Please try again later.", exception.getMessage());

            verify(passwordEncoder, never()).matches(anyString(), anyString());
            verify(staffUsersRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should reject login if staff account status is SUSPENDED")
        void login_ThrowsAuthException_WhenAccountIsSuspended() {
            activeStaff.setStatus(StaffUserStatus.SUSPENDED);
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));

            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Account is not active", exception.getMessage());
            verify(passwordEncoder, never()).matches(anyString(), anyString());
        }

        @Test
        @DisplayName("Should reject login if staff account status is DEACTIVATED")
        void login_ThrowsAuthException_WhenAccountIsDeactivated() {
            activeStaff.setStatus(StaffUserStatus.DEACTIVATED);
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));

            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Account is not active", exception.getMessage());
            verify(passwordEncoder, never()).matches(anyString(), anyString());
        }

        @Test
        @DisplayName("Should reject login and prompt password setup if mustChangePassword is true")
        void login_ThrowsAuthException_WhenMustChangePasswordIsTrue() {
            activeStaff.setMustChangePassword(true);
            when(staffUsersRepository.findByUsernameWithLock(TEST_USERNAME)).thenReturn(Optional.of(activeStaff));

            AuthException exception = assertThrows(AuthException.class, () -> authService.login(loginRequest));
            assertEquals("Password setup is required. Please use the setup link sent to your email.", exception.getMessage());
            verify(passwordEncoder, never()).matches(anyString(), anyString());
        }
    }
}
