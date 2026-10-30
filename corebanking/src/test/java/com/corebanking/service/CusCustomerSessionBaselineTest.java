package com.corebanking.service;

import com.corebanking.dto.CusOtpVerifyRequest;
import com.corebanking.dto.CusLoginRequest;
import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.LoginAttempt;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.OtpSubjectType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.repository.CusAccountsRepository;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCorporateCredentialRepository;
import com.corebanking.repository.CusCredentialsRepository;
import com.corebanking.repository.CusCustomerRepository;
import com.corebanking.repository.CusJwtRevokedTokensRepository;
import com.corebanking.repository.CusLoginAttemptsRepository;
import com.corebanking.repository.CusOtpChallengesRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.MockedStatic;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionAttribute;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Plain Mockito characterization, with a fixed LocalDateTime clock. JWT parsing
 * and issuance are mocked; Claims are unsigned data containers, not real tokens.
 * The real Customer session validator runs against mocked repository results.
 * Conditional-update results and reloaded rows are explicitly arranged database
 * outcomes: they do not prove JPQL execution, transactions or concurrent safety.
 * No Spring context, database, persistent sessions, SMTP or Corporate execution.
 */
@ExtendWith(MockitoExtension.class)
class CusCustomerSessionBaselineTest {

    private static final LocalDateTime NOW = LocalDateTime.of(2030, 1, 2, 12, 0);
    private static final UUID CUSTOMER_ID = UUID.fromString("cccccccc-cccc-cccc-cccc-cccccccccccc");
    private static final String LOGIN_GROUP = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    private static final String LOGIN_OTP = "123456";
    private static final String LOGIN_OTP_HASH = "synthetic-login-otp-hash";
    private static final String SETUP_PIN = "246810";
    private static final String SETUP_PIN_HASH = "synthetic-setup-pin-hash";
    private static final String SID = "dddddddd-dddd-dddd-dddd-dddddddddddd";
    private static final String ACCESS = "fixture-access";
    private static final String NEXT_ACCESS = "fixture-access-next";
    private static final String OLD_REFRESH = "fixture-refresh-old";
    private static final String NEW_REFRESH = "fixture-refresh-new";
    private static final String NEXT_REFRESH = "fixture-refresh-next";
    private static final String AUTHORIZATION = "Bearer " + ACCESS;
    private static final String OLD_HASH = "f7a621603a17f47a345c2a6e29ac9be70dc860f4904fa9370caf4800a2c7ff3c";
    private static final String NEW_HASH = "1f0e8cf99c1ac98aa4bd4b8349d3c39d5acbee906f5b2e7aaf335108a3169d58";
    private static final String NEXT_HASH = "240ed8a5a40c552345939f3895bfc6dee9b610df2ac5a78ed83fc001648b2f0b";

    @Mock private CusCustomerRepository customerRepository;
    @Mock private CusAccountsRepository accountsRepository;
    @Mock private CusCredentialsRepository credentialsRepository;
    @Mock private CusLoginAttemptsRepository loginAttemptsRepository;
    @Mock private CusOtpChallengesRepository otpChallengesRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private CusAuthSessionsRepository authSessionsRepository;
    @Mock private CusJwtService cusJwtService;
    @Mock private CusSessionService sessionDelegate;
    @Mock private CusJwtRevokedTokensRepository jwtRevokedTokensRepository;
    @Mock private CusEmailService cusEmailService;
    @Mock private CusAuditLogsRepository auditLogsRepository;
    @Mock private CusCorporateCredentialRepository corporateCredentialRepository;
    @Mock private EntityManager entityManager;
    @Mock private CusCustomerPasswordResetService passwordResetService;
    @Mock private CusCustomerPinResetService pinResetService;
    @InjectMocks private CusCustomerSessionService customerSessionService;
    private CusAuthService authService;
    private CusCustomerLoginAttemptService loginAttemptWriter;
    private CusCustomerSessionIssuanceService sessionIssuanceService;

    private CusSessionService sessionService;
    private Customers customer;
    private CustomerCredentials credentials;
    private AuthSession session;
    private Claims accessClaims;
    private Claims refreshClaims;
    private MockedStatic<LocalDateTime> fixedTime;

    @BeforeEach
    void fixtures() {
        loginAttemptWriter = new CusCustomerLoginAttemptService(loginAttemptsRepository);
        sessionIssuanceService = new CusCustomerSessionIssuanceService(authSessionsRepository,
                credentialsRepository, auditLogsRepository, cusJwtService, sessionDelegate, loginAttemptWriter);
        authService = authFacade(customerSessionService);
        sessionService = new CusSessionService(authSessionsRepository, credentialsRepository,
                auditLogsRepository, corporateCredentialRepository);
        ReflectionTestUtils.setField(authService, "entityManager", entityManager);
        CusSessionActivityTestSupport.wire(sessionService, authSessionsRepository, () -> session);
        customer = Customers.builder().customerId(CUSTOMER_ID).customerCode("CUS-SESSION-001")
                .customerType(CustomerType.PERSONAL).status(CustomerStatus.ACTIVE).build();
        credentials = CustomerCredentials.builder().customerId(CUSTOMER_ID).customer(customer)
                .passwordHash("synthetic-password-hash").transactionPinHash("synthetic-pin-hash")
                .mustChangePassword(false).tokenVersion(7L).build();
        session = sessionFixture();
        accessClaims = claims("ACCESS");
        refreshClaims = claims("REFRESH");
        fixedTime = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS);
        fixedTime.when(LocalDateTime::now).thenReturn(NOW);
    }

    @AfterEach
    void closeClockAndEnsureNoCorporateOrEmailExecution() {
        try {
            verifyNoInteractions(corporateCredentialRepository, cusEmailService);
        } finally {
            if (fixedTime != null) {
                fixedTime.close();
            }
        }
    }

    @Test
    void refreshRotatesExpectedHashAndReturnsNewTokensWithoutCreatingSession() {
        prepareRefresh(1);

        CusTokenResponse response = authService.refreshToken(refreshRequest(OLD_REFRESH));

        assertTrue(response.isSuccess());
        assertTrue(ACCESS.equals(response.getAccessToken()), "Return the generated access token");
        assertTrue(NEW_REFRESH.equals(response.getRefreshToken()), "Return the generated refresh token");
        verify(cusJwtService).generateAccessToken(CUSTOMER_ID, SID, 7L);
        verify(cusJwtService).generateRefreshToken(CUSTOMER_ID, SID, 7L, date(session.getIssuedAt().plusHours(24)));
        verify(authSessionsRepository).rotateRefreshTokenIfMatch(SID, OLD_HASH, NEW_HASH,
                session.getIssuedAt().plusHours(24), NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID);
        assertAudit("TOKEN_REFRESHED", ActorType.CUSTOMER);
        assertNoSessionCreation();
        var order = inOrder(cusJwtService, sessionDelegate, authSessionsRepository, auditLogsRepository);
        order.verify(cusJwtService).getClaims(OLD_REFRESH);
        order.verify(sessionDelegate).validateRefreshSession(refreshClaims, OLD_REFRESH);
        order.verify(cusJwtService).generateAccessToken(CUSTOMER_ID, SID, 7L);
        order.verify(cusJwtService).generateRefreshToken(CUSTOMER_ID, SID, 7L,
                date(session.getIssuedAt().plusHours(24)));
        order.verify(sessionDelegate).hashRefreshToken(OLD_REFRESH);
        order.verify(sessionDelegate).hashRefreshToken(NEW_REFRESH);
        order.verify(authSessionsRepository).rotateRefreshTokenIfMatch(SID, OLD_HASH, NEW_HASH,
                session.getIssuedAt().plusHours(24), NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID);
        order.verify(auditLogsRepository).save(any());
    }

    @Test
    void refreshKeepsAnEarlierStoredDeadline() {
        session.setRefreshExpiresAt(NOW.plusHours(1));
        prepareRefresh(1);

        authService.refreshToken(refreshRequest(OLD_REFRESH));

        verify(cusJwtService).generateRefreshToken(CUSTOMER_ID, SID, 7L, date(NOW.plusHours(1)));
        verify(authSessionsRepository).rotateRefreshTokenIfMatch(SID, OLD_HASH, NEW_HASH,
                NOW.plusHours(1), NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID);
        assertNoSessionCreation();
    }

    @Test
    void refreshCapsExtendedStoredExpiryAtOriginalIssuancePlusTwentyFourHours() {
        session.setRefreshExpiresAt(NOW.plusDays(3));
        prepareRefresh(1);

        authService.refreshToken(refreshRequest(OLD_REFRESH));

        verify(authSessionsRepository).rotateRefreshTokenIfMatch(SID, OLD_HASH, NEW_HASH,
                NOW.minusHours(2).plusHours(24), NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID);
        assertEquals(NOW.minusHours(2), session.getIssuedAt());
        assertNoSessionCreation();
    }

    @Test
    void refreshTrimsTheInputBeforeParsingValidationAndHashing() {
        prepareRefresh(1);

        authService.refreshToken(refreshRequest(" " + OLD_REFRESH + " "));

        verify(cusJwtService).getClaims(OLD_REFRESH);
        verify(sessionDelegate).validateRefreshSession(refreshClaims, OLD_REFRESH);
        verify(sessionDelegate).hashRefreshToken(OLD_REFRESH);
        assertNoSessionCreation();
    }

    @Test
    void refreshRequiresANonBlankRequestBeforeParsing() {
        assertThrows(CusAuthenticationException.class, () -> authService.refreshToken(null));
        assertThrows(CusAuthenticationException.class, () -> authService.refreshToken(refreshRequest(null)));
        assertThrows(CusAuthenticationException.class, () -> authService.refreshToken(refreshRequest(" ")));
        verifyNoInteractions(cusJwtService, sessionDelegate, authSessionsRepository, auditLogsRepository);
    }

    @Test
    void invalidRefreshJwtDoesNotReachSessionValidationOrPersistence() {
        when(cusJwtService.getClaims(OLD_REFRESH)).thenThrow(new JwtException("Synthetic invalid signature"));

        assertThrows(JwtException.class, () -> authService.refreshToken(refreshRequest(OLD_REFRESH)));

        verifyNoInteractions(sessionDelegate, authSessionsRepository, auditLogsRepository);
    }

    @Test
    void expiredRefreshJwtDoesNotReachSessionValidationOrPersistence() {
        when(cusJwtService.getClaims(OLD_REFRESH))
                .thenThrow(new ExpiredJwtException(Jwts.header(), refreshClaims, "Synthetic expired JWT"));

        assertThrows(ExpiredJwtException.class, () -> authService.refreshToken(refreshRequest(OLD_REFRESH)));

        verifyNoInteractions(sessionDelegate, authSessionsRepository, auditLogsRepository);
    }

    @Test
    void refreshPropagatesSessionRejectionBeforeIssuingTokens() {
        when(cusJwtService.getClaims(OLD_REFRESH)).thenReturn(refreshClaims);
        when(sessionDelegate.validateRefreshSession(refreshClaims, OLD_REFRESH))
                .thenThrow(new CusAuthenticationException("Synthetic rejected session"));

        assertThrows(CusAuthenticationException.class, () -> authService.refreshToken(refreshRequest(OLD_REFRESH)));

        verify(cusJwtService, never()).generateAccessToken(any(), any(), anyLong());
        verifyNoInteractions(authSessionsRepository, credentialsRepository, auditLogsRepository);
    }

    @Test
    void refreshRejectsAValidatedSessionWithoutCustomerIdentity() {
        when(cusJwtService.getClaims(OLD_REFRESH)).thenReturn(refreshClaims);
        session.setCustomer(null);
        when(sessionDelegate.validateRefreshSession(refreshClaims, OLD_REFRESH)).thenReturn(session);

        assertThrows(CusAuthenticationException.class, () -> authService.refreshToken(refreshRequest(OLD_REFRESH)));

        verifyNoInteractions(credentialsRepository, authSessionsRepository, auditLogsRepository);
    }

    @Test
    void refreshRejectsMissingCredentialsBeforeIssuingTokens() {
        when(cusJwtService.getClaims(OLD_REFRESH)).thenReturn(refreshClaims);
        when(sessionDelegate.validateRefreshSession(refreshClaims, OLD_REFRESH)).thenReturn(session);
        when(credentialsRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

        assertThrows(CusAuthenticationException.class, () -> authService.refreshToken(refreshRequest(OLD_REFRESH)));

        verify(cusJwtService, never()).generateAccessToken(any(), any(), anyLong());
        verifyNoInteractions(authSessionsRepository, auditLogsRepository);
    }

    @Test
    void lostConditionalRefreshUpdateDoesNotReturnTokensOrWriteSuccessAudit() {
        prepareRefresh(0);

        assertThrows(CusAuthenticationException.class, () -> authService.refreshToken(refreshRequest(OLD_REFRESH)));

        verifyNoInteractions(auditLogsRepository);
        assertNoSessionCreation();
    }

    @Test
    void refreshUpdateFailurePropagatesWithoutSuccessAuditOrSessionCreation() {
        prepareRefreshTokens();
        when(authSessionsRepository.rotateRefreshTokenIfMatch(eq(SID), eq(OLD_HASH), eq(NEW_HASH),
                any(LocalDateTime.class), eq(NOW), eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID)))
                .thenThrow(new DataAccessResourceFailureException("Synthetic rotation failure"));

        assertThrows(DataAccessResourceFailureException.class,
                () -> authService.refreshToken(refreshRequest(OLD_REFRESH)));

        verifyNoInteractions(auditLogsRepository);
        assertNoSessionCreation();
    }

    @Test
    void refreshAuditFailurePropagatesAfterConditionalUpdate() {
        prepareRefresh(1);
        when(auditLogsRepository.save(any())).thenThrow(new DataAccessResourceFailureException("Synthetic audit failure"));

        assertThrows(DataAccessResourceFailureException.class,
                () -> authService.refreshToken(refreshRequest(OLD_REFRESH)));

        verify(authSessionsRepository).rotateRefreshTokenIfMatch(SID, OLD_HASH, NEW_HASH,
                session.getIssuedAt().plusHours(24), NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID);
        assertNoSessionCreation();
        // Actual rollback of that update requires a database transaction test.
    }

    @Test
    void oldRefreshIsRejectedAfterRotationAndReloadedLatestRefreshCanRotateAgain() {
        AuthSession rotated = sessionFixture();
        rotated.setRefreshTokenHash(NEW_HASH);
        rotated.setLastSeenAt(NOW);
        // Explicit reload results model the DB after bulk update/clear. The
        // update mock does not mutate the formerly managed session instance.
        when(authSessionsRepository.findBySessionUuid(SID))
                .thenReturn(Optional.of(session), Optional.of(rotated), Optional.of(rotated));
        stubCredentials();
        when(cusJwtService.getClaims(OLD_REFRESH)).thenReturn(refreshClaims);
        when(cusJwtService.getClaims(NEW_REFRESH)).thenReturn(refreshClaims);
        when(sessionDelegate.validateRefreshSession(eq(refreshClaims), anyString()))
                .thenAnswer(invocation -> sessionService.validateRefreshSession(refreshClaims, invocation.getArgument(1)));
        when(cusJwtService.generateAccessToken(CUSTOMER_ID, SID, 7L)).thenReturn(ACCESS, NEXT_ACCESS);
        when(cusJwtService.generateRefreshToken(eq(CUSTOMER_ID), eq(SID), eq(7L), any(Date.class)))
                .thenReturn(NEW_REFRESH, NEXT_REFRESH);
        when(sessionDelegate.hashRefreshToken(anyString()))
                .thenAnswer(invocation -> sessionService.hashRefreshToken(invocation.getArgument(0)));
        when(authSessionsRepository.rotateRefreshTokenIfMatch(SID, OLD_HASH, NEW_HASH,
                session.getRefreshExpiresAt(), NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID)).thenReturn(1);
        when(authSessionsRepository.rotateRefreshTokenIfMatch(SID, NEW_HASH, NEXT_HASH,
                session.getRefreshExpiresAt(), NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID)).thenReturn(1);

        assertTrue(authService.refreshToken(refreshRequest(OLD_REFRESH)).isSuccess());
        assertThrows(CusAuthenticationException.class, () -> authService.refreshToken(refreshRequest(OLD_REFRESH)));
        CusTokenResponse latest = authService.refreshToken(refreshRequest(NEW_REFRESH));

        assertTrue(NEXT_REFRESH.equals(latest.getRefreshToken()), "Latest valid refresh must rotate");
        verify(cusJwtService, times(2)).generateAccessToken(CUSTOMER_ID, SID, 7L);
        verify(authSessionsRepository, times(2)).rotateRefreshTokenIfMatch(eq(SID), anyString(), anyString(),
                eq(session.getRefreshExpiresAt()), eq(NOW), eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID));
        verify(auditLogsRepository, times(2)).save(any());
        assertEquals(NOW.minusHours(2), rotated.getIssuedAt());
        assertNoSessionCreation();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void validCustomerSessionPreservesIdentityAndLifetime(String path) {
        stubSessionLookup();
        stubCredentials();
        LocalDateTime initialActivity = session.getLastSeenAt();

        assertSame(session, validate(path, pathClaims(path)));

        assertSame(customer, session.getCustomer());
        assertEquals(SessionSubjectType.CUSTOMER, session.getSubjectType());
        assertEquals(NOW.minusHours(2), session.getIssuedAt());
        assertEquals(NOW.plusHours(22), session.getRefreshExpiresAt());
        assertEquals(5, session.getIdleTimeoutMinutes());
        if (path.equals("ACCESS")) {
            assertEquals(NOW, session.getLastSeenAt());
            assertEquals(UpdatedByType.CUSTOMER, session.getUpdatedByType());
            assertEquals(CUSTOMER_ID, session.getUpdatedById());
            verify(authSessionsRepository).touchIfValid(SID, SessionSubjectType.CUSTOMER, CUSTOMER_ID, 7L, UpdatedByType.CUSTOMER, NOW);
            verify(authSessionsRepository, never()).save(any());
        } else {
            assertEquals(initialActivity, session.getLastSeenAt());
            verify(authSessionsRepository, never()).save(any());
        }
        verifyNoInteractions(auditLogsRepository);
        assertNoRevoke();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void sessionValidationRequiresClaims(String path) {
        assertThrows(CusAuthenticationException.class, () -> validate(path, null));
        verifyNoInteractions(authSessionsRepository, credentialsRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void malformedOrMissingCustomerSubjectIsRejectedBeforeLookup(String path) {
        Claims claims = pathClaims(path);
        for (String invalid : new String[]{null, "", "not-a-uuid"}) {
            claims.setSubject(invalid);
            assertThrows(CusAuthenticationException.class, () -> validate(path, claims));
        }
        verifyNoInteractions(authSessionsRepository, credentialsRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void missingSessionIdIsRejectedBeforeLookup(String path) {
        Claims claims = pathClaims(path);
        claims.remove("sid");
        assertThrows(CusAuthenticationException.class, () -> validate(path, claims));
        verifyNoInteractions(authSessionsRepository, credentialsRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void customerValidationRejectsStaffCorporateAndMissingSubjectTypes(String path) {
        Claims claims = pathClaims(path);
        for (String subjectType : new String[]{"STAFF", "CORPORATE_USER", null}) {
            claims.put("subjectType", subjectType);
            assertThrows(CusAuthenticationException.class, () -> validate(path, claims));
        }
        verifyNoInteractions(authSessionsRepository, credentialsRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void sessionValidationRequiresTheCorrectTokenType(String path) {
        Claims claims = pathClaims(path);
        claims.put("tokenType", path.equals("REFRESH") ? "ACCESS" : "REFRESH");
        assertThrows(CusAuthenticationException.class, () -> validate(path, claims));
        verifyNoInteractions(authSessionsRepository, credentialsRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void sessionValidationRequiresNumericTokenVersion(String path) {
        Claims claims = pathClaims(path);
        claims.remove("tokenVersion");
        assertThrows(CusAuthenticationException.class, () -> validate(path, claims));
        claims.put("tokenVersion", "not-numeric");
        assertThrows(CusAuthenticationException.class, () -> validate(path, claims));
        verifyNoInteractions(authSessionsRepository, credentialsRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void missingSessionIsRejected(String path) {
        when(authSessionsRepository.findBySessionUuid(SID)).thenReturn(Optional.empty());
        assertThrows(CusAuthenticationException.class, () -> validate(path, pathClaims(path)));
        verifyNoInteractions(credentialsRepository);
        assertNoRevoke();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void sessionLookupFailurePropagatesWithoutActivityWrite(String path) {
        when(authSessionsRepository.findBySessionUuid(SID))
                .thenThrow(new DataAccessResourceFailureException("Synthetic session lookup failure"));
        assertThrows(DataAccessResourceFailureException.class, () -> validate(path, pathClaims(path)));
        verify(authSessionsRepository, never()).save(any());
        verifyNoInteractions(auditLogsRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void customerValidationRejectsANonCustomerSession(String path) {
        stubSessionLookup();
        session.setSubjectType(SessionSubjectType.CORPORATE_USER);
        assertThrows(CusAuthenticationException.class, () -> validate(path, pathClaims(path)));
        verifyNoInteractions(credentialsRepository);
        verify(authSessionsRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void sessionMustHaveACustomerWithAnId(String path) {
        stubSessionLookup();
        session.setCustomer(null);
        assertThrows(CusAuthenticationException.class, () -> validate(path, pathClaims(path)));
        session.setCustomer(Customers.builder().build());
        assertThrows(CusAuthenticationException.class, () -> validate(path, pathClaims(path)));
        verifyNoInteractions(credentialsRepository);
        verify(authSessionsRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void customerSubjectMustMatchSessionOwner(String path) {
        stubSessionLookup();
        Claims claims = pathClaims(path);
        claims.setSubject("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");
        assertThrows(CusAuthenticationException.class, () -> validate(path, claims));
        verifyNoInteractions(credentialsRepository);
        verify(authSessionsRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void inactiveCustomerCannotValidateSession(String path) {
        stubSessionLookup();
        customer.setStatus(CustomerStatus.INACTIVE);
        assertThrows(CusAuthenticationException.class, () -> validate(path, pathClaims(path)));
        verifyNoInteractions(credentialsRepository);
        verify(authSessionsRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void revokedSessionIsRejectedWithoutAnotherRevocationWrite(String path) {
        stubSessionLookup();
        session.setRevokedAt(NOW.minusMinutes(1));
        assertThrows(CusAuthenticationException.class, () -> validate(path, pathClaims(path)));
        assertNoRevoke();
        verify(authSessionsRepository, never()).save(any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void missingIssuanceRequestsSystemRevocation(String path) {
        stubSessionLookup();
        session.setIssuedAt(null);
        expectExpiry(path, "INVALID_SESSION_ISSUANCE");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void absoluteExpiryAtTwentyFourHoursRevokesEvenWithLaterRefreshExpiry(String path) {
        stubSessionLookup();
        session.setIssuedAt(NOW.minusHours(24));
        session.setRefreshExpiresAt(NOW.plusDays(1));
        expectExpiry(path, "SESSION_EXPIRED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void refreshExpiryAtNowRequestsRevocation(String path) {
        stubSessionLookup();
        session.setRefreshExpiresAt(NOW);
        expectExpiry(path, "SESSION_EXPIRED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void missingRefreshExpiryRequestsRevocation(String path) {
        stubSessionLookup();
        session.setRefreshExpiresAt(null);
        expectExpiry(path, "SESSION_EXPIRED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void missingActivityRequestsRevocation(String path) {
        stubSessionLookup();
        session.setLastSeenAt(null);
        expectExpiry(path, "INVALID_SESSION_ACTIVITY");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void exactFiveMinuteIdleBoundaryRequestsRevocation(String path) {
        stubSessionLookup();
        session.setLastSeenAt(NOW.minusMinutes(5));
        expectExpiry(path, "IDLE_TIMEOUT");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void beyondFiveMinuteIdleBoundaryRequestsRevocation(String path) {
        stubSessionLookup();
        session.setLastSeenAt(NOW.minusMinutes(5).minusNanos(1));
        expectExpiry(path, "IDLE_TIMEOUT");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void justBeforeIdleDeadlineStillValidates(String path) {
        stubSessionLookup();
        stubCredentials();
        session.setLastSeenAt(NOW.minusMinutes(5).plusNanos(1));
        assertSame(session, validate(path, pathClaims(path)));
        assertNoRevoke();
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void jwtVersionMustMatchVersionAtSessionIssue(String path) {
        stubSessionLookup();
        session.setTokenVersionAtIssue(6L);
        assertThrows(CusAuthenticationException.class, () -> validate(path, pathClaims(path)));
        verify(authSessionsRepository, never()).save(any());
        verifyNoInteractions(credentialsRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void changedCredentialVersionRequestsSystemRevocation(String path) {
        stubSessionLookup();
        stubCredentials();
        credentials.setTokenVersion(8L);
        expectExpiry(path, "TOKEN_VERSION_CHANGED");
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACCESS", "REFRESH", "LOGOUT"})
    void missingCurrentCredentialsFailsWithoutGrantingSession(String path) {
        stubSessionLookup();
        when(credentialsRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());
        assertThrows(IllegalStateException.class, () -> validate(path, pathClaims(path)));
        verify(authSessionsRepository, never()).save(any());
    }

    @Test
    void refreshValidatorRejectsMissingRawTokenBeforeSessionLookup() {
        for (String raw : new String[]{null, "", " "}) {
            assertThrows(CusAuthenticationException.class,
                    () -> sessionService.validateRefreshSession(refreshClaims, raw));
        }
        verifyNoInteractions(authSessionsRepository, credentialsRepository);
    }

    @Test
    void refreshValidatorRejectsAbsentOrBlankStoredHash() {
        stubSessionLookup();
        stubCredentials();
        for (String stored : new String[]{null, "", " "}) {
            session.setRefreshTokenHash(stored);
            assertThrows(CusAuthenticationException.class,
                    () -> sessionService.validateRefreshSession(refreshClaims, OLD_REFRESH));
        }
        verify(authSessionsRepository, never()).save(any());
    }

    @Test
    void refreshValidatorRejectsAnOldHashAndAcceptsTheCurrentHash() {
        stubSessionLookup();
        stubCredentials();
        session.setRefreshTokenHash(NEW_HASH);

        assertThrows(CusAuthenticationException.class,
                () -> sessionService.validateRefreshSession(refreshClaims, OLD_REFRESH));
        assertSame(session, sessionService.validateRefreshSession(refreshClaims, NEW_REFRESH));

        verify(authSessionsRepository, never()).save(any());
        assertEquals(NOW.minusMinutes(1), session.getLastSeenAt());
    }

    @Test
    void refreshHashUsesSha256KnownVectorAndNeverReturnsPlaintext() {
        assertEquals("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
                sessionService.hashRefreshToken("abc"));
        assertEquals(OLD_HASH, sessionService.hashRefreshToken(OLD_REFRESH));
        assertEquals(NEW_HASH, sessionService.hashRefreshToken(NEW_REFRESH));
        assertFalse(OLD_REFRESH.equals(sessionService.hashRefreshToken(OLD_REFRESH)));
        verifyNoInteractions(authSessionsRepository);
    }

    @Test
    void refreshHashRejectsBlankInput() {
        assertThrows(CusAuthenticationException.class, () -> sessionService.hashRefreshToken(null));
        assertThrows(CusAuthenticationException.class, () -> sessionService.hashRefreshToken(" "));
        verifyNoInteractions(authSessionsRepository);
    }

    @Test
    void accessActivityWriteFailurePropagatesWithoutDirtyingTheSession() {
        stubSessionLookup();
        stubCredentials();
        LocalDateTime previous = session.getLastSeenAt();
        doThrow(new DataAccessResourceFailureException("Synthetic activity write failure"))
                .when(authSessionsRepository).touchIfValid(SID, SessionSubjectType.CUSTOMER, CUSTOMER_ID, 7L, UpdatedByType.CUSTOMER, NOW);

        assertThrows(DataAccessResourceFailureException.class, () -> sessionService.validateAccessSession(accessClaims));
        assertEquals(previous, session.getLastSeenAt());
        verify(authSessionsRepository, never()).save(any());
    }

    @Test
    void zeroChangedRowsAcceptsOnlyAnAlreadyCurrentValidActivityState() {
        stubSessionLookup(); stubCredentials();
        session.setLastSeenAt(NOW); session.setUpdatedAt(NOW);
        session.setUpdatedByType(UpdatedByType.CUSTOMER); session.setUpdatedById(CUSTOMER_ID);
        doReturn(0).when(authSessionsRepository).touchIfValid(SID, SessionSubjectType.CUSTOMER, CUSTOMER_ID, 7L, UpdatedByType.CUSTOMER, NOW);
        assertSame(session, sessionService.validateAccessSession(accessClaims));
        assertNull(session.getRevokedAt());
        verify(authSessionsRepository, never()).save(any());
        verifyNoInteractions(auditLogsRepository);
    }

    @Test
    void unexplainedZeroActivityRowsFailClosedWithoutAnEntitySave() {
        stubSessionLookup(); stubCredentials();
        LocalDateTime previous = session.getLastSeenAt();
        doReturn(0).when(authSessionsRepository).touchIfValid(SID, SessionSubjectType.CUSTOMER, CUSTOMER_ID, 7L, UpdatedByType.CUSTOMER, NOW);
        assertThrows(CusAuthenticationException.class, () -> sessionService.validateAccessSession(accessClaims));
        assertEquals(previous, session.getLastSeenAt());
        verify(authSessionsRepository, never()).save(any());
    }

    @Test
    void logoutRevokesSessionWithTimestampAndWritesCustomerTokenRevocationAndAudit() {
        prepareLogout(1);

        authService.logout(AUTHORIZATION);

        verify(authSessionsRepository).revokeIfActive(SID, "USER_LOGOUT", NOW,
                UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW);
        ArgumentCaptor<JwtRevokedTokens> tokens = ArgumentCaptor.forClass(JwtRevokedTokens.class);
        verify(jwtRevokedTokensRepository).save(tokens.capture());
        JwtRevokedTokens token = tokens.getValue();
        assertEquals(accessClaims.getId(), token.getJti());
        assertEquals(SessionSubjectType.CUSTOMER, token.getSubjectType());
        assertSame(customer, token.getCustomer());
        assertNull(token.getCorporateUser());
        assertNull(token.getStaff());
        assertEquals("USER_LOGOUT", token.getReason());
        assertEquals(NOW.plusMinutes(30), token.getTokenExpiresAt());
        assertEquals(UpdatedByType.CUSTOMER, token.getUpdatedByType());
        assertEquals(CUSTOMER_ID, token.getUpdatedById());
        // revokedAt on JwtRevokedTokens is a @PrePersist callback, not executed by this mock.
        assertAudit("CUSTOMER_LOGOUT", ActorType.CUSTOMER);
        assertNoSessionCreation();
        assertEquals(NOW.minusMinutes(1), session.getLastSeenAt());
        var order = inOrder(authSessionsRepository, jwtRevokedTokensRepository, auditLogsRepository);
        order.verify(authSessionsRepository).findBySessionUuid(SID);
        order.verify(authSessionsRepository).revokeIfActive(SID, "USER_LOGOUT", NOW,
                UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW);
        order.verify(jwtRevokedTokensRepository).existsByJti(accessClaims.getId());
        order.verify(jwtRevokedTokensRepository).save(any());
        order.verify(auditLogsRepository).save(any());
    }

    @Test
    void logoutDoesNotDuplicateAnExistingJtiRevocation() {
        prepareLogout(1);
        when(jwtRevokedTokensRepository.existsByJti(accessClaims.getId())).thenReturn(true);

        authService.logout(AUTHORIZATION);

        verify(jwtRevokedTokensRepository, never()).save(any());
        assertAudit("CUSTOMER_LOGOUT", ActorType.CUSTOMER);
        assertNoSessionCreation();
    }

    @Test
    void logoutLosingConditionalRevokeDoesNotDuplicateTokenRecordOrAudit() {
        prepareLogout(0);

        authService.logout(AUTHORIZATION);

        verifyNoInteractions(jwtRevokedTokensRepository, auditLogsRepository);
        assertNoSessionCreation();
    }

    @Test
    void logoutReplayAndRefreshAfterLogoutRejectTheReloadedRevokedSession() {
        prepareLogout(1);
        AuthSession revoked = sessionFixture();
        revoked.setRevokedAt(NOW);
        revoked.setRevokeReason("USER_LOGOUT");
        when(authSessionsRepository.findBySessionUuid(SID))
                .thenReturn(Optional.of(session), Optional.of(revoked), Optional.of(revoked));

        authService.logout(AUTHORIZATION);
        assertThrows(CusAuthenticationException.class, () -> authService.logout(AUTHORIZATION));
        assertThrows(CusAuthenticationException.class,
                () -> sessionService.validateRefreshSession(refreshClaims, OLD_REFRESH));

        verify(authSessionsRepository).revokeIfActive(SID, "USER_LOGOUT", NOW,
                UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW);
        verify(jwtRevokedTokensRepository).save(any());
        verify(auditLogsRepository).save(any());
        assertNoSessionCreation();
    }

    @Test
    void logoutRejectsMissingOrNonBearerHeader() {
        for (String header : new String[]{null, "", "Basic fixture"}) {
            assertThrows(CusAuthenticationException.class, () -> authService.logout(header));
        }
        verifyNoInteractions(cusJwtService, sessionDelegate, authSessionsRepository, jwtRevokedTokensRepository);
    }

    @Test
    void logoutEmptyBearerValueIsRejectedByJwtParser() {
        when(cusJwtService.getClaims("")).thenThrow(new IllegalArgumentException("Synthetic empty token"));
        assertThrows(IllegalArgumentException.class, () -> authService.logout("Bearer "));
        verifyNoInteractions(sessionDelegate, authSessionsRepository, jwtRevokedTokensRepository);
    }

    @Test
    void logoutInvalidJwtDoesNotRevokeAnySession() {
        when(cusJwtService.getClaims(ACCESS)).thenThrow(new JwtException("Synthetic malformed JWT"));
        assertThrows(JwtException.class, () -> authService.logout(AUTHORIZATION));
        verifyNoInteractions(sessionDelegate, authSessionsRepository, jwtRevokedTokensRepository);
    }

    @Test
    void logoutExpiredJwtDoesNotReachSessionValidation() {
        when(cusJwtService.getClaims(ACCESS))
                .thenThrow(new ExpiredJwtException(Jwts.header(), accessClaims, "Synthetic JWT expiry"));
        assertThrows(ExpiredJwtException.class, () -> authService.logout(AUTHORIZATION));
        verifyNoInteractions(sessionDelegate, authSessionsRepository, jwtRevokedTokensRepository);
    }

    @Test
    void logoutRequiresAccessTokenTypeAndNonBlankJti() {
        when(cusJwtService.getClaims(ACCESS)).thenReturn(accessClaims);
        accessClaims.put("tokenType", "REFRESH");
        assertThrows(CusAuthenticationException.class, () -> authService.logout(AUTHORIZATION));
        accessClaims.put("tokenType", "ACCESS");
        accessClaims.remove("jti");
        assertThrows(CusAuthenticationException.class, () -> authService.logout(AUTHORIZATION));
        accessClaims.setId(" ");
        assertThrows(CusAuthenticationException.class, () -> authService.logout(AUTHORIZATION));
        verifyNoInteractions(sessionDelegate, authSessionsRepository, jwtRevokedTokensRepository);
    }

    @Test
    void logoutRejectsForeignCustomerThroughTheRealSessionValidator() {
        wireLogoutValidator();
        stubSessionLookup();
        accessClaims.setSubject("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee");

        assertThrows(CusAuthenticationException.class, () -> authService.logout(AUTHORIZATION));

        assertNoRevoke();
        verifyNoInteractions(jwtRevokedTokensRepository, auditLogsRepository);
    }

    @Test
    void logoutRejectsWrongSubjectTypeBeforeLookingUpSession() {
        wireLogoutValidator();
        accessClaims.put("subjectType", "CORPORATE_USER");

        assertThrows(CusAuthenticationException.class, () -> authService.logout(AUTHORIZATION));

        verifyNoInteractions(authSessionsRepository, jwtRevokedTokensRepository, auditLogsRepository);
    }

    @Test
    void logoutOfExpiredSessionRequestsSystemRevocationAndReportsExpiry() {
        wireLogoutValidator();
        stubSessionLookup();
        session.setRefreshExpiresAt(NOW);
        stubSystemRevoke("SESSION_EXPIRED", 1);

        assertThrows(CusSessionExpiredException.class, () -> authService.logout(AUTHORIZATION));

        verifySystemRevoke("SESSION_EXPIRED");
        assertAudit("SESSION_REVOKED", ActorType.SYSTEM);
        verifyNoInteractions(jwtRevokedTokensRepository);
        assertNoSessionCreation();
    }

    @Test
    void logoutRevokeFailurePropagatesBeforeTokenRevocationOrAudit() {
        prepareLogout(1);
        when(authSessionsRepository.revokeIfActive(SID, "USER_LOGOUT", NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW))
                .thenThrow(new DataAccessResourceFailureException("Synthetic revocation failure"));

        assertThrows(DataAccessResourceFailureException.class, () -> authService.logout(AUTHORIZATION));

        verifyNoInteractions(jwtRevokedTokensRepository, auditLogsRepository);
    }

    @Test
    void logoutTokenRevocationSaveFailurePropagatesBeforeSuccessAudit() {
        prepareLogout(1);
        when(jwtRevokedTokensRepository.save(any()))
                .thenThrow(new DataAccessResourceFailureException("Synthetic revoked-token write failure"));

        assertThrows(DataAccessResourceFailureException.class, () -> authService.logout(AUTHORIZATION));

        verify(authSessionsRepository).revokeIfActive(SID, "USER_LOGOUT", NOW,
                UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW);
        verifyNoInteractions(auditLogsRepository);
    }

    @Test
    void explicitActorRevocationReturnsRowCountOutcomeWithActorAndTimestamp() {
        when(authSessionsRepository.revokeIfActive(SID, "USER_LOGOUT", NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW))
                .thenReturn(1, 0);

        assertTrue(sessionService.revokeSession(session, "USER_LOGOUT", UpdatedByType.CUSTOMER, CUSTOMER_ID));
        assertFalse(sessionService.revokeSession(session, "USER_LOGOUT", UpdatedByType.CUSTOMER, CUSTOMER_ID));

        verify(authSessionsRepository, times(2)).revokeIfActive(SID, "USER_LOGOUT", NOW,
                UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW);
        verifyNoInteractions(auditLogsRepository);
        assertNoSessionCreation();
    }

    @Test
    void systemRevocationAuditsOnlyTheWinningConditionalUpdate() {
        stubSystemRevoke("TEST_REVOCATION", 1);
        when(authSessionsRepository.revokeIfActive(SID, "TEST_REVOCATION", NOW, UpdatedByType.SYSTEM, null, NOW))
                .thenReturn(1, 0);

        sessionService.revokeSession(session, "TEST_REVOCATION");
        sessionService.revokeSession(session, "TEST_REVOCATION");

        verify(auditLogsRepository).save(any());
        assertAudit("SESSION_REVOKED", ActorType.SYSTEM);
        verify(authSessionsRepository, times(2)).revokeIfActive(SID, "TEST_REVOCATION", NOW,
                UpdatedByType.SYSTEM, null, NOW);
    }

    @Test
    void revocationIgnoresMissingSessionIdentity() {
        sessionService.revokeSession(null, "TEST_REVOCATION");
        assertFalse(sessionService.revokeSession(null, "TEST_REVOCATION", UpdatedByType.CUSTOMER, CUSTOMER_ID));
        session.setSessionUuid(null);
        sessionService.revokeSession(session, "TEST_REVOCATION");
        assertFalse(sessionService.revokeSession(session, "TEST_REVOCATION", UpdatedByType.CUSTOMER, CUSTOMER_ID));
        verifyNoInteractions(authSessionsRepository, auditLogsRepository);
    }

    @Test
    void revokeAllCustomerSessionsForwardsOwnerReasonTimestampsAndReturnsCount() {
        when(authSessionsRepository.revokeAllActiveCustomerSessions(CUSTOMER_ID, "PASSWORD_RESET", NOW,
                UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW)).thenReturn(3);

        assertEquals(3, sessionService.revokeAllActiveCustomerSessions(CUSTOMER_ID, "PASSWORD_RESET",
                UpdatedByType.CUSTOMER, CUSTOMER_ID));

        verify(authSessionsRepository).revokeAllActiveCustomerSessions(CUSTOMER_ID, "PASSWORD_RESET", NOW,
                UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW);
    }

    @Test
    void revokeAllCustomerSessionsRequiresOwnerId() {
        assertThrows(IllegalArgumentException.class, () -> sessionService.revokeAllActiveCustomerSessions(
                null, "PASSWORD_RESET", UpdatedByType.CUSTOMER, CUSTOMER_ID));
        verifyNoInteractions(authSessionsRepository);
    }

    @Test
    void successfulLoginOtpCreatesFreshCustomerSessionWithFixedLifetimeAndHashedRefresh() {
        String group = "ffffffff-ffff-ffff-ffff-ffffffffffff";
        OtpChallenge otp = OtpChallenge.builder().otpId(10L).customer(customer)
                .subjectType(OtpSubjectType.CUSTOMER).purpose(OtpPurpose.LOGIN).challengeGroupId(group)
                .status(OtpStatus.ACTIVE).otpHash("synthetic-otp-hash").expiresAt(NOW.plusMinutes(5))
                .attemptCount(0).maxAttempts(5).resendNo(0).build();
        when(otpChallengesRepository.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                group, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(otp));
        when(credentialsRepository.findByCustomerIdForUpdate(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
        when(otpChallengesRepository
                .findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(
                        CUSTOMER_ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0)).thenReturn(Optional.of(otp));
        when(otpChallengesRepository.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                group, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(otp));
        stubCredentials();
        when(passwordEncoder.matches("123456", "synthetic-otp-hash")).thenReturn(true);
        when(cusJwtService.generateAccessToken(eq(CUSTOMER_ID), anyString(), eq(7L))).thenReturn(ACCESS);
        when(cusJwtService.generateRefreshToken(eq(CUSTOMER_ID), anyString(), eq(7L), eq(date(NOW.plusHours(24)))))
                .thenReturn(NEW_REFRESH);
        when(sessionDelegate.hashRefreshToken(NEW_REFRESH)).thenReturn(NEW_HASH);
        CusOtpVerifyRequest request = new CusOtpVerifyRequest();
        request.setChallengeGroupId(group);
        request.setOtp("123456");

        assertTrue(authService.verifyLoginOtp(request).isSuccess());

        ArgumentCaptor<AuthSession> stored = ArgumentCaptor.forClass(AuthSession.class);
        verify(authSessionsRepository).save(stored.capture());
        AuthSession created = stored.getValue();
        assertEquals(SessionSubjectType.CUSTOMER, created.getSubjectType());
        assertSame(customer, created.getCustomer());
        assertNull(created.getCorporateUser());
        assertNull(created.getStaff());
        assertDoesNotThrow(() -> UUID.fromString(created.getSessionUuid()));
        assertNotEquals(SID, created.getSessionUuid());
        assertEquals(NEW_HASH, created.getRefreshTokenHash());
        assertFalse(NEW_REFRESH.equals(created.getRefreshTokenHash()));
        assertEquals(NOW, created.getIssuedAt());
        assertEquals(NOW, created.getLastSeenAt());
        assertEquals(NOW.plusHours(24), created.getRefreshExpiresAt());
        assertEquals(5, created.getIdleTimeoutMinutes());
        assertEquals(7L, created.getTokenVersionAtIssue());
        assertEquals(UpdatedByType.CUSTOMER, created.getUpdatedByType());
        assertEquals(CUSTOMER_ID, created.getUpdatedById());
        assertEquals(NOW, credentials.getLastLoginAt());
        assertEquals(OtpStatus.CONSUMED, otp.getStatus());
        assertAudit("AUTH_SESSION_CREATED", ActorType.CUSTOMER);
    }

    @ParameterizedTest
    @ValueSource(strings = {"validateAccessSession", "validateAccessSessionForLogout"})
    void accessValidationTransactionMetadataPreservesExpiryRevocation(String name) throws Exception {
        assertExpiryTransaction(CusSessionService.class, name, Claims.class);
    }

    @Test
    void refreshValidationTransactionMetadataPreservesExpiryRevocation() throws Exception {
        assertExpiryTransaction(CusSessionService.class, "validateRefreshSession", Claims.class, String.class);
    }

    @Test
    void refreshAndLogoutOrchestrationMetadataPreservesExpiryAndRollsBackDataFailures() throws Exception {
        assertExpiryTransaction(CusAuthService.class, "refreshToken", CusRefreshTokenRequest.class);
        assertExpiryTransaction(CusAuthService.class, "logout", String.class);
    }

    @Test
    void revocationMetadataUsesRequiredWriteTransactions() throws Exception {
        for (TransactionAttribute tx : List.of(
                transaction(CusSessionService.class, "revokeSession", AuthSession.class, String.class),
                transaction(CusSessionService.class, "revokeSession", AuthSession.class, String.class,
                        UpdatedByType.class, UUID.class),
                transaction(CusSessionService.class, "revokeAllActiveCustomerSessions", UUID.class, String.class,
                        UpdatedByType.class, UUID.class))) {
            assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, tx.getPropagationBehavior());
            assertFalse(tx.isReadOnly());
            assertTrue(tx.rollbackOn(new DataAccessResourceFailureException("Synthetic database failure")));
        }
    }

    @Test
    void refreshFacadeDelegatesTheSameRequestAndResponseAndPropagatesFailure() {
        CusCustomerSessionService delegate = mock(CusCustomerSessionService.class);
        CusAuthService facade = authFacade(delegate);
        CusRefreshTokenRequest request = refreshRequest(OLD_REFRESH);
        CusTokenResponse response = new CusTokenResponse(true, "refreshed", NEXT_ACCESS, NEW_REFRESH);
        when(delegate.refreshToken(same(request))).thenReturn(response);

        assertSame(response, facade.refreshToken(request));

        CusSessionExpiredException failure = new CusSessionExpiredException("Synthetic session expiry");
        when(delegate.refreshToken(same(request))).thenThrow(failure);
        assertSame(failure, assertThrows(CusSessionExpiredException.class, () -> facade.refreshToken(request)));
        verify(delegate, times(2)).refreshToken(same(request));
        verifyNoMoreInteractions(delegate);
        assertNoFacadeSessionWork();
    }

    @Test
    void logoutFacadeDelegatesTheSameHeaderAndPropagatesFailure() {
        CusCustomerSessionService delegate = mock(CusCustomerSessionService.class);
        CusAuthService facade = authFacade(delegate);

        assertDoesNotThrow(() -> facade.logout(AUTHORIZATION));

        CusSessionExpiredException failure = new CusSessionExpiredException("Synthetic session expiry");
        doThrow(failure).when(delegate).logout(same(AUTHORIZATION));
        assertSame(failure, assertThrows(CusSessionExpiredException.class, () -> facade.logout(AUTHORIZATION)));
        verify(delegate, times(2)).logout(same(AUTHORIZATION));
        verifyNoMoreInteractions(delegate);
        assertNoFacadeSessionWork();
    }

    @Test
    void extractedSessionSignaturesTransactionsAndSpringConstructorPreserveTheFacadeContract() throws Exception {
        String[] names = {"refreshToken", "logout"};
        Class<?>[] parameters = {CusRefreshTokenRequest.class, String.class};
        Class<?>[] returns = {CusTokenResponse.class, void.class};
        for (int i = 0; i < names.length; i++) {
            var facadeMethod = CusAuthService.class.getMethod(names[i], parameters[i]);
            var extractedMethod = CusCustomerSessionService.class.getMethod(names[i], parameters[i]);
            assertEquals(returns[i], facadeMethod.getReturnType());
            assertEquals(returns[i], extractedMethod.getReturnType());
            assertArrayEquals(facadeMethod.getExceptionTypes(), extractedMethod.getExceptionTypes());
            assertExpiryTransaction(CusCustomerSessionService.class, names[i], parameters[i]);
            TransactionAttribute facade = transaction(CusAuthService.class, names[i], parameters[i]);
            TransactionAttribute extracted = transaction(CusCustomerSessionService.class, names[i], parameters[i]);
            assertEquals(facade.getPropagationBehavior(), extracted.getPropagationBehavior());
            assertEquals(facade.isReadOnly(), extracted.isReadOnly());
            assertEquals(facade.getIsolationLevel(), extracted.getIsolationLevel());
            assertEquals(facade.getTimeout(), extracted.getTimeout());
            for (Throwable failure : List.of(new CusSessionExpiredException("Synthetic session expiry"),
                    new CusAuthenticationException("Synthetic rejection"), new JwtException("Synthetic invalid JWT"),
                    new DataAccessResourceFailureException("Synthetic database failure"),
                    new IllegalStateException("Synthetic internal failure"), new Exception("Synthetic checked failure"))) {
                assertEquals(facade.rollbackOn(failure), extracted.rollbackOn(failure));
            }
        }
        var springConstructors = Arrays.stream(CusAuthService.class.getConstructors())
                .filter(c -> c.isAnnotationPresent(Autowired.class)).toList();
        assertEquals(1, springConstructors.size());
        var springConstructor = springConstructors.getFirst();
        assertTrue(springConstructor.getAnnotation(Autowired.class).required());
        assertEquals(16, springConstructor.getParameterCount());
        assertEquals(CusCustomerSessionIssuanceService.class, springConstructor.getParameterTypes()[15]);
        assertSame(sessionIssuanceService,
                ReflectionTestUtils.getField(authService, "customerSessionIssuanceService"));
        assertEquals(CusCustomerLoginAttemptService.class, springConstructor.getParameterTypes()[3]);
        Object writer = ReflectionTestUtils.getField(authService, "customerLoginAttemptService");
        assertInstanceOf(CusCustomerLoginAttemptService.class, writer);
        assertSame(loginAttemptsRepository, ReflectionTestUtils.getField(writer, "loginAttemptsRepository"));
        assertEquals(CusCustomerSessionService.class, springConstructor.getParameterTypes()[14]);
        assertSame(customerSessionService, ReflectionTestUtils.getField(authService, "customerSessionService"));
        assertSame(cusJwtService, ReflectionTestUtils.getField(customerSessionService, "cusJwtService"));
        assertSame(sessionDelegate, ReflectionTestUtils.getField(customerSessionService, "cusSessionService"));
        // Constructor/transaction metadata does not prove database commits or concurrency.
    }

    @Test
    void existingDirectConstructionSignatureStillPerformsRealRefreshOrchestration() {
        prepareRefresh(1);

        CusTokenResponse response = legacyAuthFacade().refreshToken(refreshRequest(OLD_REFRESH));

        assertTrue(response.isSuccess());
        assertEquals(ACCESS, response.getAccessToken());
        assertEquals(NEW_REFRESH, response.getRefreshToken());
        verify(authSessionsRepository).rotateRefreshTokenIfMatch(SID, OLD_HASH, NEW_HASH,
                session.getIssuedAt().plusHours(24), NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID);
        assertAudit("TOKEN_REFRESHED", ActorType.CUSTOMER);
        assertNoSessionCreation();
    }

    @Test
    void existingDirectConstructionSignatureStillPerformsRealLogoutOrchestration() {
        prepareLogout(1);

        legacyAuthFacade().logout(AUTHORIZATION);

        verify(authSessionsRepository).revokeIfActive(SID, "USER_LOGOUT", NOW,
                UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW);
        verify(jwtRevokedTokensRepository).save(any(JwtRevokedTokens.class));
        assertAudit("CUSTOMER_LOGOUT", ActorType.CUSTOMER);
        assertNoSessionCreation();
    }

    @Test
    void fourteenArgumentConstructorUsesRealWriterAndTheSuppliedHistoryRepository() {
        assertDirectFacadeRecordsUnknownCustomer(legacyAuthFacade());
    }

    @Test
    void fifteenArgumentConstructorPreservesSessionDelegateAndExecutesRealWriter() {
        CusAuthService facade = new CusAuthService(customerRepository, accountsRepository, credentialsRepository,
                loginAttemptsRepository, otpChallengesRepository, passwordEncoder, authSessionsRepository,
                cusJwtService, sessionDelegate, jwtRevokedTokensRepository, cusEmailService,
                auditLogsRepository, passwordResetService, pinResetService, customerSessionService);

        assertSame(customerSessionService, ReflectionTestUtils.getField(facade, "customerSessionService"));
        assertDirectFacadeRecordsUnknownCustomer(facade);
    }

    private void assertDirectFacadeRecordsUnknownCustomer(CusAuthService facade) {
        Object writer = ReflectionTestUtils.getField(facade, "customerLoginAttemptService");
        assertInstanceOf(CusCustomerLoginAttemptService.class, writer);
        assertFalse(mockingDetails(writer).isMock());
        assertSame(loginAttemptsRepository, ReflectionTestUtils.getField(writer, "loginAttemptsRepository"));
        String identifier = "UNKNOWN-CONSTRUCTOR-CUSTOMER";
        when(customerRepository.findByCustomerCode(identifier)).thenReturn(Optional.empty());
        when(accountsRepository.findByAccountNumber(identifier)).thenReturn(Optional.empty());
        CusLoginRequest request = new CusLoginRequest();
        request.setLoginIdentifier(identifier);
        request.setPassword("synthetic-password");

        assertThrows(CusAuthenticationException.class, () -> facade.authenticateCredentials(request));

        ArgumentCaptor<LoginAttempt> stored = ArgumentCaptor.forClass(LoginAttempt.class);
        verify(loginAttemptsRepository).save(stored.capture());
        assertEquals(identifier, stored.getValue().getLoginIdentifier());
        assertEquals(SessionSubjectType.CUSTOMER, stored.getValue().getActorType());
        assertFalse(stored.getValue().isSuccess());
        assertEquals("INVALID_IDENTIFIER", stored.getValue().getFailureReason());
        assertNull(stored.getValue().getCustomer());
        assertNull(stored.getValue().getCorporateUser());
        assertNull(stored.getValue().getStaff());
        verifyNoInteractions(credentialsRepository, otpChallengesRepository, passwordEncoder,
                authSessionsRepository, cusJwtService, sessionDelegate, auditLogsRepository);
    }

    @ParameterizedTest
    @ValueSource(strings = {"OTP", "PIN"})
    void realIssuerPreservesSessionFieldsAuditHistoryAndOperationOrder(String path) {
        OtpChallenge otp = prepareIssuance(path);
        stubIssuanceTokens(otp, path);

        completeIssuance(authService, path);

        ArgumentCaptor<AuthSession> sessions = ArgumentCaptor.forClass(AuthSession.class);
        verify(authSessionsRepository).save(sessions.capture());
        AuthSession created = sessions.getValue();
        assertIssuedSessionFields(created);
        ArgumentCaptor<AuditLogs> audits = ArgumentCaptor.forClass(AuditLogs.class);
        verify(auditLogsRepository, times(path.equals("OTP") ? 2 : 1)).save(audits.capture());
        AuditLogs audit = audits.getAllValues().stream()
                .filter(row -> "AUTH_SESSION_CREATED".equals(row.getActionType())).findFirst().orElseThrow();
        assertEquals(ActorType.CUSTOMER, audit.getActorType());
        assertSame(customer, audit.getActorCustomer());
        assertNull(audit.getActorStaff());
        assertNull(audit.getActorCorporateUser());
        assertEquals("AUTH_SESSION", audit.getEntityType());
        assertEquals(created.getSessionUuid(), audit.getEntityId());
        assertNull(audit.getOldValues());
        assertEquals("{\"status\":\"ACTIVE\",\"idleTimeoutMinutes\":5}", audit.getNewValues());
        assertNull(audit.getActionCategory());
        assertNull(audit.getDescription());
        assertNull(audit.getRequestUrl());
        assertNull(audit.getTransaction());
        assertNull(audit.getIpAddress());
        assertNull(audit.getUserAgent());
        assertNull(audit.getRequestId());
        ArgumentCaptor<LoginAttempt> attempts = ArgumentCaptor.forClass(LoginAttempt.class);
        verify(loginAttemptsRepository).save(attempts.capture());
        LoginAttempt attempt = attempts.getValue();
        assertEquals(SessionSubjectType.CUSTOMER, attempt.getActorType());
        assertSame(customer, attempt.getCustomer());
        assertEquals(customer.getCustomerCode(), attempt.getLoginIdentifier());
        assertTrue(attempt.isSuccess());
        assertNull(attempt.getFailureReason());
        assertNull(attempt.getCorporateUser());
        assertNull(attempt.getStaff());
        assertEquals(NOW, credentials.getLastLoginAt());
        assertEquals(2, credentials.getFailedLoginCount());
        assertEquals(7L, credentials.getTokenVersion());
        assertEquals(OtpStatus.CONSUMED, otp.getStatus());
        assertEquals(path.equals("OTP") ? NOW : NOW.minusMinutes(1), otp.getConsumedAt());

        var order = inOrder(otpChallengesRepository, passwordEncoder, cusJwtService, sessionDelegate,
                authSessionsRepository, auditLogsRepository, credentialsRepository, loginAttemptsRepository);
        if (path.equals("OTP")) {
            order.verify(otpChallengesRepository).save(same(otp));
            order.verify(auditLogsRepository).save(argThat(row -> "OTP_VERIFIED".equals(row.getActionType())));
        } else {
            order.verify(passwordEncoder).encode(SETUP_PIN);
            order.verify(credentialsRepository).save(same(credentials));
            assertEquals(SETUP_PIN_HASH, credentials.getTransactionPinHash());
            assertEquals(NOW, credentials.getPinChangedAt());
            assertEquals(0, credentials.getFailedPinAttemptCount());
            assertNull(credentials.getPinLockedUntil());
            verify(otpChallengesRepository, never()).save(any());
        }
        order.verify(cusJwtService).generateAccessToken(CUSTOMER_ID, created.getSessionUuid(), 7L);
        order.verify(cusJwtService).generateRefreshToken(CUSTOMER_ID, created.getSessionUuid(), 7L,
                date(NOW.plusHours(24)));
        order.verify(sessionDelegate).hashRefreshToken(NEW_REFRESH);
        order.verify(authSessionsRepository).save(same(created));
        order.verify(auditLogsRepository).save(same(audit));
        order.verify(credentialsRepository).save(same(credentials));
        order.verify(loginAttemptsRepository).save(same(attempt));
        order.verifyNoMoreInteractions();
        verify(entityManager).clear();
        verify(credentialsRepository).findById(CUSTOMER_ID);
        verifyNoMoreInteractions(cusJwtService, sessionDelegate);
        assertRealIssuerDependencies(authService);
    }

    @ParameterizedTest
    @MethodSource("issuanceFailureCases")
    void issuerFailuresPropagateWithoutLaterSuccessWrites(String path, String stage) {
        prepareIssuance(path);
        List<String> stages = List.of("ACCESS", "REFRESH", "HASH", "SESSION", "AUDIT", "CREDENTIAL", "HISTORY");
        int position = stages.indexOf(stage);
        RuntimeException failure = switch (stage) {
            case "ACCESS", "REFRESH" -> new JwtException("Synthetic issuance failure");
            case "HASH" -> new IllegalStateException("Synthetic hashing failure");
            default -> new DataAccessResourceFailureException("Synthetic issuance persistence failure");
        };
        if (position == 0) {
            when(cusJwtService.generateAccessToken(eq(CUSTOMER_ID), anyString(), eq(7L))).thenThrow(failure);
        } else {
            when(cusJwtService.generateAccessToken(eq(CUSTOMER_ID), anyString(), eq(7L))).thenReturn(ACCESS);
        }
        if (position >= 1) {
            var stub = when(cusJwtService.generateRefreshToken(eq(CUSTOMER_ID), anyString(), eq(7L),
                    eq(date(NOW.plusHours(24)))));
            if (position == 1) stub.thenThrow(failure);
            else stub.thenReturn(NEW_REFRESH);
        }
        if (position >= 2) {
            var stub = when(sessionDelegate.hashRefreshToken(NEW_REFRESH));
            if (position == 2) stub.thenThrow(failure);
            else stub.thenReturn(NEW_HASH);
        }
        switch (stage) {
            case "SESSION" -> when(authSessionsRepository.save(any(AuthSession.class))).thenThrow(failure);
            case "AUDIT" -> when(auditLogsRepository.save(any(AuditLogs.class))).thenAnswer(invocation -> {
                AuditLogs row = invocation.getArgument(0);
                if ("AUTH_SESSION_CREATED".equals(row.getActionType())) throw failure;
                return row;
            });
            case "CREDENTIAL" -> {
                if (path.equals("PIN")) {
                    when(credentialsRepository.save(same(credentials))).thenReturn(credentials).thenThrow(failure);
                } else {
                    when(credentialsRepository.save(same(credentials))).thenThrow(failure);
                }
            }
            case "HISTORY" -> when(loginAttemptsRepository.save(any(LoginAttempt.class))).thenThrow(failure);
            default -> { }
        }

        assertSame(failure, assertThrows(RuntimeException.class, () -> completeIssuance(authService, path)));

        verify(cusJwtService).generateAccessToken(eq(CUSTOMER_ID), anyString(), eq(7L));
        verify(cusJwtService, times(position >= 1 ? 1 : 0)).generateRefreshToken(
                eq(CUSTOMER_ID), anyString(), eq(7L), eq(date(NOW.plusHours(24))));
        verify(sessionDelegate, times(position >= 2 ? 1 : 0)).hashRefreshToken(NEW_REFRESH);
        verify(authSessionsRepository, times(position >= 3 ? 1 : 0)).save(any(AuthSession.class));
        verify(auditLogsRepository, times(position >= 4 ? 1 : 0)).save(argThat(row -> row != null
                && "AUTH_SESSION_CREATED".equals(row.getActionType())));
        int credentialWrites = (path.equals("PIN") ? 1 : 0) + (position >= 5 ? 1 : 0);
        verify(credentialsRepository, times(credentialWrites)).save(same(credentials));
        verify(loginAttemptsRepository, times(position >= 6 ? 1 : 0)).save(any(LoginAttempt.class));
        assertEquals(position >= 5 ? NOW : NOW.minusDays(1), credentials.getLastLoginAt());
        assertEquals(7L, credentials.getTokenVersion());
        verify(entityManager).clear();
        // These are mock interactions and in-memory mutations, not database commits/rollbacks.
    }

    private static Stream<Arguments> issuanceFailureCases() {
        return Stream.of("OTP", "PIN").flatMap(path -> Stream.of(
                "ACCESS", "REFRESH", "HASH", "SESSION", "AUDIT", "CREDENTIAL", "HISTORY")
                .map(stage -> Arguments.of(path, stage)));
    }

    @ParameterizedTest
    @MethodSource("issuanceConstructorCases")
    void allThreeExistingConstructorsExecuteRealIssuerWithTheSameDependencies(String constructor, String path) {
        CusAuthService facade = switch (constructor) {
            case "REPOSITORY_14" -> legacyAuthFacade();
            case "REPOSITORY_15" -> new CusAuthService(customerRepository, accountsRepository, credentialsRepository,
                    loginAttemptsRepository, otpChallengesRepository, passwordEncoder, authSessionsRepository,
                    cusJwtService, sessionDelegate, jwtRevokedTokensRepository, cusEmailService,
                    auditLogsRepository, passwordResetService, pinResetService, customerSessionService);
            case "WRITER_15" -> new CusAuthService(customerRepository, accountsRepository, credentialsRepository,
                    loginAttemptWriter, otpChallengesRepository, passwordEncoder, authSessionsRepository,
                    cusJwtService, sessionDelegate, jwtRevokedTokensRepository, cusEmailService,
                    auditLogsRepository, passwordResetService, pinResetService, customerSessionService);
            default -> throw new IllegalArgumentException("Unknown constructor fixture");
        };
        ReflectionTestUtils.setField(facade, "entityManager", entityManager);
        assertRealIssuerDependencies(facade);
        if (constructor.equals("WRITER_15")) {
            assertSame(loginAttemptWriter, ReflectionTestUtils.getField(facade, "customerLoginAttemptService"));
        }
        if (!constructor.equals("REPOSITORY_14")) {
            assertSame(customerSessionService, ReflectionTestUtils.getField(facade, "customerSessionService"));
        }
        OtpChallenge otp = prepareIssuance(path);
        stubIssuanceTokens(otp, path);

        completeIssuance(facade, path);

        verify(authSessionsRepository).save(any(AuthSession.class));
        verify(loginAttemptsRepository).save(argThat(attempt -> attempt.isSuccess()
                && attempt.getActorType() == SessionSubjectType.CUSTOMER && attempt.getCustomer() == customer
                && customer.getCustomerCode().equals(attempt.getLoginIdentifier())));
        assertEquals(NOW, credentials.getLastLoginAt());
    }

    private static Stream<Arguments> issuanceConstructorCases() {
        return Stream.of("REPOSITORY_14", "REPOSITORY_15", "WRITER_15")
                .flatMap(constructor -> Stream.of("OTP", "PIN").map(path -> Arguments.of(constructor, path)));
    }

    @Test
    void issuerAddsNoTransactionBoundaryAndFacadeRetainsIssuanceRollbackRules() throws Exception {
        var method = CusCustomerSessionIssuanceService.class.getMethod(
                "createAuthenticatedSession", Customers.class, CustomerCredentials.class);
        assertEquals(CusTokenResponse.class, method.getReturnType());
        assertNull(new AnnotationTransactionAttributeSource().getTransactionAttribute(
                method, CusCustomerSessionIssuanceService.class));
        assertFalse(CusCustomerSessionIssuanceService.class.isAnnotationPresent(
                org.springframework.transaction.annotation.Transactional.class));
        assertFalse(method.isAnnotationPresent(org.springframework.scheduling.annotation.Async.class));
        assertFalse(CusCustomerSessionIssuanceService.class.isAnnotationPresent(
                org.springframework.scheduling.annotation.Async.class));
        TransactionAttribute otp = transaction(CusAuthService.class, "verifyLoginOtp", CusOtpVerifyRequest.class);
        TransactionAttribute pin = transaction(CusAuthService.class, "setupTransactionPin",
                String.class, String.class, String.class);
        assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, otp.getPropagationBehavior());
        assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, pin.getPropagationBehavior());
        assertFalse(otp.isReadOnly());
        assertFalse(pin.isReadOnly());
        assertFalse(otp.rollbackOn(new com.corebanking.exception.CusOtpException("Synthetic OTP rejection")));
        for (RuntimeException failure : List.of(new JwtException("Synthetic JWT failure"),
                new DataAccessResourceFailureException("Synthetic persistence failure"),
                new IllegalStateException("Synthetic internal failure"))) {
            assertTrue(otp.rollbackOn(failure));
            assertTrue(pin.rollbackOn(failure));
        }
    }

    @Test
    void firstLoginOtpWithOutstandingSetupDoesNotReachTheRealIssuer() {
        OtpChallenge otp = prepareIssuance("OTP");
        credentials.setMustChangePassword(true);
        credentials.setTransactionPinHash(null);
        CusOtpVerifyRequest request = new CusOtpVerifyRequest();
        request.setChallengeGroupId(LOGIN_GROUP);
        request.setOtp(LOGIN_OTP);

        var response = authService.verifyLoginOtp(request);

        assertTrue(response.isSuccess());
        assertTrue(response.isPasswordChangeRequired());
        assertTrue(response.isPinSetupRequired());
        assertNull(response.getAccessToken());
        assertNull(response.getRefreshToken());
        assertEquals(OtpStatus.CONSUMED, otp.getStatus());
        assertEquals(NOW.minusDays(1), credentials.getLastLoginAt());
        verifyNoInteractions(cusJwtService, sessionDelegate, authSessionsRepository, loginAttemptsRepository);
    }

    private OtpChallenge prepareIssuance(String path) {
        boolean pinSetup = path.equals("PIN");
        credentials.setLastLoginAt(NOW.minusDays(1));
        credentials.setFailedLoginCount(2);
        if (pinSetup) {
            credentials.setTransactionPinHash(null);
            credentials.setFailedPinAttemptCount(3);
            credentials.setPinLockedUntil(NOW.plusMinutes(15));
        }
        OtpChallenge otp = OtpChallenge.builder().otpId(10L).customer(customer)
                .subjectType(OtpSubjectType.CUSTOMER).purpose(OtpPurpose.LOGIN).challengeGroupId(LOGIN_GROUP)
                .status(pinSetup ? OtpStatus.CONSUMED : OtpStatus.ACTIVE)
                .consumedAt(pinSetup ? NOW.minusMinutes(1) : null)
                .otpHash(LOGIN_OTP_HASH).expiresAt(NOW.plusMinutes(5))
                .attemptCount(0).maxAttempts(5).resendNo(0).build();
        when(otpChallengesRepository.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                LOGIN_GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(otp));
        when(credentialsRepository.findByCustomerIdForUpdate(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
        when(otpChallengesRepository
                .findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(
                        CUSTOMER_ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0)).thenReturn(Optional.of(otp));
        when(otpChallengesRepository.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                LOGIN_GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(otp));
        stubCredentials();
        if (pinSetup) when(passwordEncoder.encode(SETUP_PIN)).thenReturn(SETUP_PIN_HASH);
        else when(passwordEncoder.matches(LOGIN_OTP, LOGIN_OTP_HASH)).thenReturn(true);
        return otp;
    }

    private void stubIssuanceTokens(OtpChallenge otp, String path) {
        when(cusJwtService.generateAccessToken(eq(CUSTOMER_ID), anyString(), eq(7L))).thenAnswer(invocation -> {
            assertEquals(OtpStatus.CONSUMED, otp.getStatus());
            assertEquals(NOW.minusDays(1), credentials.getLastLoginAt());
            if (path.equals("PIN")) assertEquals(SETUP_PIN_HASH, credentials.getTransactionPinHash());
            return ACCESS;
        });
        when(cusJwtService.generateRefreshToken(eq(CUSTOMER_ID), anyString(), eq(7L),
                eq(date(NOW.plusHours(24))))).thenReturn(NEW_REFRESH);
        when(sessionDelegate.hashRefreshToken(NEW_REFRESH)).thenReturn(NEW_HASH);
    }

    private void completeIssuance(CusAuthService facade, String path) {
        if (path.equals("OTP")) {
            CusOtpVerifyRequest request = new CusOtpVerifyRequest();
            request.setChallengeGroupId(LOGIN_GROUP);
            request.setOtp(LOGIN_OTP);
            var response = facade.verifyLoginOtp(request);
            assertTrue(response.isSuccess());
            assertEquals("OTP verified successfully.", response.getMessage());
            assertFalse(response.isFirstLoginSetupRequired());
            assertFalse(response.isPasswordChangeRequired());
            assertFalse(response.isPinSetupRequired());
            assertEquals(ACCESS, response.getAccessToken());
            assertEquals(NEW_REFRESH, response.getRefreshToken());
        } else {
            CusTokenResponse response = facade.setupTransactionPin(LOGIN_GROUP, SETUP_PIN, SETUP_PIN);
            assertTrue(response.isSuccess());
            assertEquals("Login successful.", response.getMessage());
            assertEquals(ACCESS, response.getAccessToken());
            assertEquals(NEW_REFRESH, response.getRefreshToken());
        }
    }

    private void assertIssuedSessionFields(AuthSession created) {
        assertEquals(SessionSubjectType.CUSTOMER, created.getSubjectType());
        assertSame(customer, created.getCustomer());
        assertNull(created.getCorporateUser());
        assertNull(created.getStaff());
        assertDoesNotThrow(() -> UUID.fromString(created.getSessionUuid()));
        assertNotEquals(SID, created.getSessionUuid());
        assertEquals(NEW_HASH, created.getRefreshTokenHash());
        assertNotEquals(NEW_REFRESH, created.getRefreshTokenHash());
        assertEquals(7L, created.getTokenVersionAtIssue());
        assertEquals(NOW, created.getIssuedAt());
        assertEquals(NOW, created.getLastSeenAt());
        assertEquals(NOW.plusHours(24), created.getRefreshExpiresAt());
        assertEquals(5, created.getIdleTimeoutMinutes());
        assertEquals(UpdatedByType.CUSTOMER, created.getUpdatedByType());
        assertEquals(CUSTOMER_ID, created.getUpdatedById());
        assertNull(created.getRevokedAt());
        assertNull(created.getRevokeReason());
        assertNull(created.getIpAddress());
        assertNull(created.getUserAgent());
    }

    private void assertRealIssuerDependencies(CusAuthService facade) {
        Object issuer = ReflectionTestUtils.getField(facade, "customerSessionIssuanceService");
        Object writer = ReflectionTestUtils.getField(facade, "customerLoginAttemptService");
        assertInstanceOf(CusCustomerSessionIssuanceService.class, issuer);
        assertFalse(mockingDetails(issuer).isMock());
        assertInstanceOf(CusCustomerLoginAttemptService.class, writer);
        assertFalse(mockingDetails(writer).isMock());
        assertSame(authSessionsRepository, ReflectionTestUtils.getField(issuer, "authSessionsRepository"));
        assertSame(credentialsRepository, ReflectionTestUtils.getField(issuer, "credentialsRepository"));
        assertSame(auditLogsRepository, ReflectionTestUtils.getField(issuer, "auditLogsRepository"));
        assertSame(cusJwtService, ReflectionTestUtils.getField(issuer, "cusJwtService"));
        assertSame(sessionDelegate, ReflectionTestUtils.getField(issuer, "cusSessionService"));
        assertSame(writer, ReflectionTestUtils.getField(issuer, "customerLoginAttemptService"));
        assertSame(loginAttemptsRepository, ReflectionTestUtils.getField(writer, "loginAttemptsRepository"));
    }

    private CusAuthService authFacade(CusCustomerSessionService delegate) {
        CusAuthService facade = new CusAuthService(customerRepository, accountsRepository, credentialsRepository,
                loginAttemptWriter, otpChallengesRepository, passwordEncoder, authSessionsRepository,
                cusJwtService, sessionDelegate, jwtRevokedTokensRepository, cusEmailService,
                auditLogsRepository, passwordResetService, pinResetService, delegate, sessionIssuanceService);
        assertSame(loginAttemptWriter, ReflectionTestUtils.getField(facade, "customerLoginAttemptService"));
        assertSame(sessionIssuanceService, ReflectionTestUtils.getField(facade, "customerSessionIssuanceService"));
        return facade;
    }

    private CusAuthService legacyAuthFacade() {
        return new CusAuthService(customerRepository, accountsRepository, credentialsRepository,
                loginAttemptsRepository, otpChallengesRepository, passwordEncoder, authSessionsRepository,
                cusJwtService, sessionDelegate, jwtRevokedTokensRepository, cusEmailService,
                auditLogsRepository, passwordResetService, pinResetService);
    }

    private void assertNoFacadeSessionWork() {
        verifyNoInteractions(customerRepository, accountsRepository, credentialsRepository, loginAttemptsRepository,
                otpChallengesRepository, passwordEncoder, authSessionsRepository, cusJwtService, sessionDelegate,
                jwtRevokedTokensRepository, cusEmailService, auditLogsRepository, passwordResetService, pinResetService);
    }

    private AuthSession sessionFixture() {
        return AuthSession.builder().sessionUuid(SID).sessionId(UUID.randomUUID())
                .subjectType(SessionSubjectType.CUSTOMER).customer(customer)
                .refreshTokenHash(OLD_HASH).tokenVersionAtIssue(7L).issuedAt(NOW.minusHours(2))
                .lastSeenAt(NOW.minusMinutes(1)).refreshExpiresAt(NOW.plusHours(22)).idleTimeoutMinutes(5).build();
    }

    private Claims claims(String tokenType) {
        Claims claims = Jwts.claims();
        claims.setSubject(CUSTOMER_ID.toString());
        claims.put("sid", SID);
        claims.put("subjectType", "CUSTOMER");
        claims.put("tokenType", tokenType);
        claims.put("tokenVersion", 7L);
        claims.setId("fixture-jti-" + tokenType);
        claims.setExpiration(date(NOW.plusMinutes(30)));
        return claims;
    }

    private Claims pathClaims(String path) {
        return path.equals("REFRESH") ? refreshClaims : accessClaims;
    }

    private AuthSession validate(String path, Claims claims) {
        return switch (path) {
            case "ACCESS" -> sessionService.validateAccessSession(claims);
            case "REFRESH" -> sessionService.validateRefreshSession(claims, OLD_REFRESH);
            case "LOGOUT" -> sessionService.validateAccessSessionForLogout(claims);
            default -> throw new IllegalArgumentException("Unknown fixture validation path");
        };
    }

    private void stubSessionLookup() {
        when(authSessionsRepository.findBySessionUuid(SID)).thenReturn(Optional.of(session));
    }

    private void stubCredentials() {
        when(credentialsRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
    }

    private void prepareRefresh(int updatedRows) {
        prepareRefreshTokens();
        LocalDateTime deadline = session.getRefreshExpiresAt().isBefore(session.getIssuedAt().plusHours(24))
                ? session.getRefreshExpiresAt() : session.getIssuedAt().plusHours(24);
        when(authSessionsRepository.rotateRefreshTokenIfMatch(SID, OLD_HASH, NEW_HASH, deadline, NOW,
                UpdatedByType.CUSTOMER, CUSTOMER_ID)).thenReturn(updatedRows);
    }

    private void prepareRefreshTokens() {
        when(cusJwtService.getClaims(OLD_REFRESH)).thenReturn(refreshClaims);
        when(sessionDelegate.validateRefreshSession(refreshClaims, OLD_REFRESH)).thenReturn(session);
        stubCredentials();
        when(cusJwtService.generateAccessToken(CUSTOMER_ID, SID, 7L)).thenReturn(ACCESS);
        LocalDateTime deadline = session.getRefreshExpiresAt().isBefore(session.getIssuedAt().plusHours(24))
                ? session.getRefreshExpiresAt() : session.getIssuedAt().plusHours(24);
        when(cusJwtService.generateRefreshToken(CUSTOMER_ID, SID, 7L, date(deadline))).thenReturn(NEW_REFRESH);
        when(sessionDelegate.hashRefreshToken(OLD_REFRESH)).thenReturn(OLD_HASH);
        when(sessionDelegate.hashRefreshToken(NEW_REFRESH)).thenReturn(NEW_HASH);
    }

    private void wireLogoutValidator() {
        when(cusJwtService.getClaims(ACCESS)).thenReturn(accessClaims);
        when(sessionDelegate.validateAccessSessionForLogout(accessClaims))
                .thenAnswer(invocation -> sessionService.validateAccessSessionForLogout(accessClaims));
    }

    private void prepareLogout(int updatedRows) {
        wireLogoutValidator();
        stubSessionLookup();
        stubCredentials();
        when(sessionDelegate.revokeSession(session, "USER_LOGOUT", UpdatedByType.CUSTOMER, CUSTOMER_ID))
                .thenAnswer(invocation -> sessionService.revokeSession(session, "USER_LOGOUT",
                        UpdatedByType.CUSTOMER, CUSTOMER_ID));
        when(authSessionsRepository.revokeIfActive(SID, "USER_LOGOUT", NOW, UpdatedByType.CUSTOMER, CUSTOMER_ID, NOW))
                .thenReturn(updatedRows);
    }

    private void stubSystemRevoke(String reason, int updatedRows) {
        when(authSessionsRepository.revokeIfActive(SID, reason, NOW, UpdatedByType.SYSTEM, null, NOW))
                .thenReturn(updatedRows);
    }

    private void expectExpiry(String path, String reason) {
        stubSystemRevoke(reason, 1);
        assertThrows(CusSessionExpiredException.class, () -> validate(path, pathClaims(path)));
        verifySystemRevoke(reason);
        assertAudit("SESSION_REVOKED", ActorType.SYSTEM);
        verify(authSessionsRepository, never()).save(any());
    }

    private void verifySystemRevoke(String reason) {
        verify(authSessionsRepository).revokeIfActive(SID, reason, NOW, UpdatedByType.SYSTEM, null, NOW);
    }

    private void assertNoRevoke() {
        verify(authSessionsRepository, never()).revokeIfActive(any(), any(), any(), any(), any(), any());
    }

    private void assertNoSessionCreation() {
        verify(authSessionsRepository, never()).save(any());
        verifyNoInteractions(otpChallengesRepository, loginAttemptsRepository);
    }

    private void assertAudit(String action, ActorType actor) {
        ArgumentCaptor<AuditLogs> audits = ArgumentCaptor.forClass(AuditLogs.class);
        verify(auditLogsRepository, atLeastOnce()).save(audits.capture());
        AuditLogs audit = audits.getAllValues().stream().filter(row -> action.equals(row.getActionType()))
                .findFirst().orElseThrow();
        assertEquals(actor, audit.getActorType());
        assertEquals("AUTH_SESSION", audit.getEntityType());
        if (actor == ActorType.CUSTOMER) {
            assertSame(customer, audit.getActorCustomer());
        } else {
            assertNull(audit.getActorCustomer());
        }
        for (AuditLogs row : audits.getAllValues()) {
            String values = String.valueOf(row.getOldValues()) + String.valueOf(row.getNewValues());
            assertFalse(values.contains(OLD_REFRESH) || values.contains(NEW_REFRESH)
                    || values.contains(ACCESS), "Audit values must not include raw credentials");
        }
    }

    private static CusRefreshTokenRequest refreshRequest(String value) {
        CusRefreshTokenRequest request = new CusRefreshTokenRequest();
        request.setRefreshToken(value);
        return request;
    }

    private static Date date(LocalDateTime value) {
        return Date.from(value.atZone(ZoneId.systemDefault()).toInstant());
    }

    private static TransactionAttribute transaction(Class<?> type, String name, Class<?>... parameters) throws Exception {
        TransactionAttribute tx = new AnnotationTransactionAttributeSource()
                .getTransactionAttribute(type.getMethod(name, parameters), type);
        assertNotNull(tx);
        return tx;
    }

    private static void assertExpiryTransaction(Class<?> type, String name, Class<?>... parameters) throws Exception {
        TransactionAttribute tx = transaction(type, name, parameters);
        assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, tx.getPropagationBehavior());
        assertFalse(tx.isReadOnly());
        assertFalse(tx.rollbackOn(new CusSessionExpiredException("Synthetic session expiry")));
        assertTrue(tx.rollbackOn(new DataAccessResourceFailureException("Synthetic database failure")));
    }
}
