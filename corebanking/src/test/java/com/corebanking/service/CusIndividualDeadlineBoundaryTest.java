package com.corebanking.service;

import com.corebanking.dto.*;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.CusAccountLockedException;
import com.corebanking.exception.CusOtpException;
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.repository.*;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.MockedStatic;
import org.mockito.stubbing.Answer;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Deterministic service unit tests at deadline +/- one nanosecond and equality.
 * Real Individual services and ownership checks run against mocked repositories.
 * Session issuance/JWT/email are mocked; successful issuance assertions establish
 * delegation, not durable session creation. Conditional recovery consumption is
 * a single-threaded mock state transition, not SQL, transaction or lock execution.
 * No Boot context, datasource, SMTP, sleeps or application secrets are used.
 */
class CusIndividualDeadlineBoundaryTest {
    private static final LocalDateTime START = LocalDateTime.of(2030, 1, 2, 12, 0);
    private static final UUID ID = UUID.fromString("aaaaaaaa-3333-4333-8333-333333333333");
    private static final String CODE = "CUS-BOUNDARY-001";
    private static final String GROUP = "bbbbbbbb-4444-4444-8444-444444444444";
    private static final String EMAIL = "boundary@example.test";
    private static final String PASSWORD = "OldPass1!";
    private static final String NEW_PASSWORD = "NewPass1!";
    private static final String PASSWORD_HASH = "synthetic-original-password-hash";
    private static final String PIN_HASH = "synthetic-original-pin-hash";
    private static final String OTP_HASH = "synthetic-boundary-otp-hash";
    private static final String OTP = "012345";
    private static final String PIN = "246810";
    private static final String ACCESS = "synthetic-boundary-access";
    private static final String REFRESH = "synthetic-boundary-refresh";

    private final AtomicReference<LocalDateTime> now = new AtomicReference<>(START);
    private MockedStatic<LocalDateTime> clock;
    private CusCustomerRepository customers;
    private CusCredentialsRepository credentials;
    private CusOtpChallengesRepository otps;
    private CusAuditLogsRepository audits;
    private CusLoginAttemptsRepository attempts;
    private CusAuthSessionsRepository sessions;
    private CusJwtRevokedTokensRepository revoked;
    private PasswordEncoder encoder;
    private CusEmailService email;
    private CusJwtService jwt;
    private CusSessionService sessionValidator;
    private CusCustomerSessionIssuanceService issuer;
    private EntityManager em;
    private CusAuthService auth;
    private Customers customer;
    private CustomerCredentials credential;
    private OtpChallenge challenge;

    @BeforeEach
    void isolatedFixturesAndClock() {
        customers = mock(CusCustomerRepository.class);
        var accounts = mock(CusAccountsRepository.class);
        credentials = mock(CusCredentialsRepository.class);
        otps = mock(CusOtpChallengesRepository.class);
        audits = mock(CusAuditLogsRepository.class);
        attempts = mock(CusLoginAttemptsRepository.class);
        sessions = mock(CusAuthSessionsRepository.class);
        revoked = mock(CusJwtRevokedTokensRepository.class);
        encoder = mock(PasswordEncoder.class);
        email = mock(CusEmailService.class);
        jwt = mock(CusJwtService.class);
        sessionValidator = mock(CusSessionService.class);
        issuer = mock(CusCustomerSessionIssuanceService.class);
        em = mock(EntityManager.class);
        var passwordReset = new CusCustomerPasswordResetService(customers, accounts, credentials,
                otps, encoder, sessionValidator, email, audits);
        var pinReset = new CusCustomerPinResetService(credentials, otps, encoder, jwt,
                sessionValidator, email, audits);
        ReflectionTestUtils.setField(passwordReset, "entityManager", em);
        ReflectionTestUtils.setField(pinReset, "entityManager", em);
        auth = new CusAuthService(customers, accounts, credentials,
                new CusCustomerLoginAttemptService(attempts), otps, encoder, sessions, jwt,
                sessionValidator, revoked, email, audits, passwordReset, pinReset,
                mock(CusCustomerSessionService.class), issuer);
        ReflectionTestUtils.setField(auth, "entityManager", em);
        customer = Customers.builder().customerId(ID).customerCode(CODE).email(EMAIL)
                .customerType(CustomerType.PERSONAL).status(CustomerStatus.ACTIVE).build();
        credential = CustomerCredentials.builder().customerId(ID).customer(customer)
                .passwordHash(PASSWORD_HASH).transactionPinHash(PIN_HASH).mustChangePassword(false)
                .tokenVersion(7L).failedLoginCount(0).failedPinAttemptCount(3)
                .pinLockedUntil(START.plusMinutes(15)).build();
        clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS);
        clock.when(LocalDateTime::now).thenAnswer(call -> now.get());
    }

    @AfterEach
    void closeClockAndVerifyNoDirectTokenOrSessionPersistence() {
        try {
            verifyNoInteractions(sessions, revoked);
            verify(jwt, never()).generateAccessToken(any(), anyString(), anyLong());
            verify(jwt, never()).generateRefreshToken(any(), anyString(), anyLong());
            verify(jwt, never()).generateRefreshToken(any(), anyString(), anyLong(), any(Date.class));
        } finally {
            clock.close();
        }
    }

    @ParameterizedTest(name = "offset={0}ns unlocked={1}")
    @CsvSource({"-1,false", "0,true", "1,true"})
    void passwordLockoutAtFifteenMinutesUsesStrictFutureComparison(long offset, boolean unlocked) {
        LocalDateTime deadline = START.plusMinutes(15);
        now.set(deadline.plusNanos(offset));
        credential.setFailedLoginCount(5);
        credential.setLockedUntil(deadline);
        when(customers.findByCustomerCode(CODE)).thenReturn(Optional.of(customer));
        wireCredentialOwner();
        when(encoder.matches(PASSWORD, PASSWORD_HASH)).thenReturn(true);
        when(encoder.encode(anyString())).thenReturn(OTP_HASH);
        when(otps.findByCustomerAndSubjectTypeAndPurposeAndStatus(
                customer, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, OtpStatus.ACTIVE)).thenReturn(List.of());
        when(otps.save(any(OtpChallenge.class))).thenAnswer(call -> {
            OtpChallenge row = call.getArgument(0);
            row.setOtpId(20L);
            challenge = row;
            return row;
        });
        var request = new CusLoginRequest();
        request.setLoginIdentifier(CODE);
        request.setPassword(PASSWORD);

        if (unlocked) {
            var result = auth.authenticateCredentials(request);
            assertTrue(result.isSuccess());
            assertTrue(result.isOtpRequired());
            assertEquals(0, credential.getFailedLoginCount());
            assertNull(credential.getLockedUntil());
            verify(credentials, times(2)).save(credential); // clear expired lock, then successful password
            verify(encoder).matches(PASSWORD, PASSWORD_HASH);
            verify(email).sendLoginOtp(eq(EMAIL), matches("[1-9]\\d{5}"));
            assertEquals(now.get().plusMinutes(5), challenge.getExpiresAt());
            verify(audits).save(argThat(a -> "OTP_SENT".equals(a.getActionType())));
            verifyNoInteractions(attempts);
        } else {
            assertThrowsExactly(CusAccountLockedException.class, () -> auth.authenticateCredentials(request));
            assertEquals(5, credential.getFailedLoginCount());
            assertEquals(deadline, credential.getLockedUntil());
            verify(credentials, never()).save(any());
            verify(attempts).save(argThat(a -> !a.isSuccess() && "ACCOUNT_LOCKED".equals(a.getFailureReason())));
            verifyNoInteractions(encoder, otps, email, audits);
        }
        assertEquals(deadline.plusNanos(offset), LocalDateTime.now());
        assertEquals(PASSWORD_HASH, credential.getPasswordHash());
        assertEquals(PIN_HASH, credential.getTransactionPinHash());
        assertEquals(7L, credential.getTokenVersion());
        verifyNoInteractions(issuer);
    }

    @ParameterizedTest(name = "offset={0}ns valid={1}")
    @CsvSource({"-1,true", "0,false", "1,false"})
    void loginOtpExpiresAtFiveMinutes(long offset, boolean valid) {
        seedChallenge(OtpPurpose.LOGIN, OtpStatus.ACTIVE);
        wireLoginChallenge();
        LocalDateTime deadline = START.plusMinutes(5);
        now.set(deadline.plusNanos(offset));
        List<Object> originalCredentials = credentialState();
        when(encoder.matches(OTP, OTP_HASH)).thenReturn(true);
        stubIssuance();
        var request = new CusOtpVerifyRequest();
        request.setChallengeGroupId(GROUP);
        request.setOtp(OTP);

        if (valid) {
            var result = auth.verifyLoginOtp(request);
            assertTrue(result.isSuccess());
            assertFalse(result.isFirstLoginSetupRequired());
            assertEquals(ACCESS, result.getAccessToken());
            assertEquals(REFRESH, result.getRefreshToken());
            assertEquals(OtpStatus.CONSUMED, challenge.getStatus());
            assertEquals(now.get(), challenge.getConsumedAt());
            verify(encoder).matches(OTP, OTP_HASH);
            verify(issuer).createAuthenticatedSession(customer, credential, CusSessionClientMetadata.EMPTY);
            verify(audits).save(argThat(a -> "OTP_VERIFIED".equals(a.getActionType())));
        } else {
            var failure = assertThrowsExactly(CusOtpException.class, () -> auth.verifyLoginOtp(request));
            assertEquals("OTP has expired.", failure.getMessage());
            assertEquals(OtpStatus.EXPIRED, challenge.getStatus());
            assertNull(challenge.getConsumedAt());
            assertEquals(UpdatedByType.SYSTEM, challenge.getUpdatedByType());
            verify(audits).save(argThat(a -> "OTP_EXPIRED".equals(a.getActionType()) && a.getActorType() == ActorType.SYSTEM));
            verifyNoInteractions(encoder, issuer);
            verify(credentials, never()).findById(any());
        }
        verify(otps).save(challenge);
        assertEquals(2, writeCalls(), "Only OTP state and its audit may be written");
        assertEquals(0, challenge.getAttemptCount());
        assertEquals(deadline, challenge.getExpiresAt());
        assertEquals(originalCredentials, credentialState());
        verify(credentials, never()).save(any());
        assertReplayAddsNoWritesOrIssuance(() -> auth.verifyLoginOtp(request));
    }

    @ParameterizedTest(name = "{0} offset={1}ns valid={2}")
    @CsvSource({"PASSWORD_RESET,-1,true", "PASSWORD_RESET,0,false", "PASSWORD_RESET,1,false",
            "PIN_RESET,-1,true", "PIN_RESET,0,false", "PIN_RESET,1,false"})
    void recoveryOtpExpiresAtFiveMinutes(OtpPurpose purpose, long offset, boolean valid) {
        seedChallenge(purpose, OtpStatus.ACTIVE);
        wireRecoveryChallenge(purpose);
        LocalDateTime deadline = START.plusMinutes(5);
        now.set(deadline.plusNanos(offset));
        List<Object> originalCredentials = credentialState();
        when(encoder.matches(OTP, OTP_HASH)).thenReturn(true);

        if (valid) {
            String authority = verifyRecovery(purpose);
            assertNotEquals(GROUP, authority);
            assertEquals(authority, challenge.getChallengeGroupId());
            assertEquals(OtpStatus.CONSUMED, challenge.getStatus());
            assertEquals(now.get(), challenge.getConsumedAt());
            verify(encoder).matches(OTP, OTP_HASH);
            assertEquals(1, consumptionCalls());
            verify(otps, never()).save(any());
            verify(audits).save(argThat(a -> (purpose + "_OTP_VERIFIED").equals(a.getActionType())));
        } else {
            var failure = assertThrowsExactly(CusOtpException.class, () -> verifyRecovery(purpose));
            assertTrue(failure.getMessage().toLowerCase(Locale.ROOT).contains("expired"));
            assertEquals(OtpStatus.EXPIRED, challenge.getStatus());
            assertNull(challenge.getConsumedAt());
            assertEquals(GROUP, challenge.getChallengeGroupId());
            assertEquals(UpdatedByType.SYSTEM, challenge.getUpdatedByType());
            assertEquals(0, consumptionCalls());
            verify(otps).save(challenge);
            verify(audits).save(argThat(a -> (purpose + "_OTP_EXPIRED").equals(a.getActionType())
                    && a.getActorType() == ActorType.SYSTEM));
            verifyNoInteractions(encoder);
        }
        assertEquals(2, writeCalls(), "Only OTP consumption/expiry and its audit may be written");
        assertEquals(0, challenge.getAttemptCount());
        assertEquals(deadline, challenge.getExpiresAt());
        assertEquals(originalCredentials, credentialState());
        verify(credentials, never()).save(any());
        verifyNoInteractions(issuer);
        assertReplayAddsNoWritesOrIssuance(() -> verifyRecovery(purpose));
    }

    @ParameterizedTest(name = "{0} offset={1}ns authorized={2}")
    @CsvSource({"PASSWORD,-1,true", "PASSWORD,0,true", "PASSWORD,1,false",
            "PIN,-1,true", "PIN,0,true", "PIN,1,false"})
    void firstLoginSetupAuthorizationAcceptsEqualityAtTenMinutes(String operation, long offset, boolean authorized) {
        seedChallenge(OtpPurpose.LOGIN, OtpStatus.CONSUMED);
        wireLoginChallenge();
        boolean password = operation.equals("PASSWORD");
        credential.setMustChangePassword(password);
        credential.setTransactionPinHash(null);
        LocalDateTime deadline = START.plusMinutes(10);
        now.set(deadline.plusNanos(offset));
        List<Object> originalCredentials = credentialState();
        // The verified authorization window is separate from the original OTP's expiry.
        assertTrue(challenge.getExpiresAt().isBefore(now.get()));
        when(encoder.encode(password ? NEW_PASSWORD : PIN)).thenReturn(password ? "synthetic-new-password-hash" : "synthetic-new-pin-hash");
        stubIssuance();

        if (!authorized) {
            var failure = assertThrowsExactly(CusSessionExpiredException.class, () -> completeSetup(password));
            assertEquals("First-login setup session has expired. Please login again.", failure.getMessage());
            assertEquals(originalCredentials, credentialState());
            verify(credentials, never()).save(any());
            verify(credentials, never()).findById(any());
            verifyNoInteractions(encoder, audits, issuer);
        } else {
            CusTokenResponse response = completeSetup(password);
            verify(credentials).save(credential);
            assertFalse(credential.isMustChangePassword());
            assertEquals(7L, credential.getTokenVersion());
            if (password) {
                assertNull(response);
                assertEquals("synthetic-new-password-hash", credential.getPasswordHash());
                assertEquals(now.get(), credential.getPasswordChangedAt());
                assertNull(credential.getTransactionPinHash());
                verify(audits).save(argThat(a -> "FIRST_LOGIN_PASSWORD_CHANGED".equals(a.getActionType())));
                verifyNoInteractions(issuer);
            } else {
                assertTrue(response.isSuccess());
                assertEquals(ACCESS, response.getAccessToken());
                assertEquals(REFRESH, response.getRefreshToken());
                assertEquals(PASSWORD_HASH, credential.getPasswordHash());
                assertEquals("synthetic-new-pin-hash", credential.getTransactionPinHash());
                assertEquals(now.get(), credential.getPinChangedAt());
                assertEquals(0, credential.getFailedPinAttemptCount());
                assertNull(credential.getPinLockedUntil());
                verify(issuer).createAuthenticatedSession(customer, credential, CusSessionClientMetadata.EMPTY);
            }
        }
        assertEquals(deadline.plusNanos(offset), LocalDateTime.now());
        assertEquals(OtpStatus.CONSUMED, challenge.getStatus());
        assertEquals(START, challenge.getConsumedAt());
        assertEquals(GROUP, challenge.getChallengeGroupId());
        verify(credentials).findByCustomerIdForUpdate(ID);
        verify(otps, never()).save(any());
    }

    private CusTokenResponse completeSetup(boolean password) {
        if (password) {
            auth.changeFirstLoginPassword(GROUP, NEW_PASSWORD, NEW_PASSWORD);
            return null;
        }
        return auth.setupTransactionPin(GROUP, PIN, PIN);
    }

    private void wireCredentialOwner() {
        when(credentials.findByCustomerIdForUpdate(ID)).thenReturn(Optional.of(credential));
        when(credentials.findById(ID)).thenReturn(Optional.of(credential));
    }

    private void seedChallenge(OtpPurpose purpose, OtpStatus status) {
        challenge = OtpChallenge.builder().otpId(10L).customer(customer).subjectType(OtpSubjectType.CUSTOMER)
                .purpose(purpose).challengeGroupId(GROUP).status(status).otpHash(OTP_HASH)
                .consumedAt(status == OtpStatus.CONSUMED ? START : null).lastSentAt(START)
                .expiresAt(START.plusMinutes(5)).maxAttempts(5).attemptCount(0)
                .maxResendAttempts(5).resendNo(0).build();
    }

    private void wireLoginChallenge() {
        wireCredentialOwner();
        when(otps.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(challenge));
        when(otps.findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(
                ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0)).thenReturn(Optional.of(challenge));
        when(otps.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(challenge));
    }

    private void wireRecoveryChallenge(OtpPurpose purpose) {
        wireCredentialOwner();
        when(em.find(Customers.class, ID, LockModeType.PESSIMISTIC_READ)).thenReturn(customer);
        when(em.find(CustomerCredentials.class, ID, LockModeType.PESSIMISTIC_WRITE)).thenReturn(credential);
        when(em.find(OtpChallenge.class, 10L, LockModeType.PESSIMISTIC_WRITE)).thenReturn(challenge);
        when(otps.findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(GROUP, purpose)).thenAnswer(call ->
                GROUP.equals(challenge.getChallengeGroupId()) ? Optional.of(challenge) : Optional.empty());
        when(otps.findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(ID, OtpSubjectType.CUSTOMER, purpose))
                .thenReturn(Optional.of(challenge));
        Claims claims = Jwts.claims();
        claims.setSubject(ID.toString());
        claims.put("tokenType", "ACCESS");
        when(jwt.getClaims(ACCESS)).thenReturn(claims);
        when(sessionValidator.validateAccessSession(claims)).thenReturn(AuthSession.builder()
                .customer(customer).subjectType(SessionSubjectType.CUSTOMER).build());
        Answer<Integer> consume = call -> {
            if (challenge.getStatus() != OtpStatus.ACTIVE
                    || !Objects.equals(challenge.getChallengeGroupId(), call.getArgument(1))
                    || !challenge.getExpiresAt().isAfter(call.getArgument(10))) return 0;
            challenge.setStatus(OtpStatus.CONSUMED);
            challenge.setChallengeGroupId(call.getArgument(5));
            challenge.setConsumedAt(call.getArgument(6));
            return 1;
        };
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            when(otps.consumePasswordResetOtpIfActive(eq(10L), eq(GROUP), eq(purpose), eq(OtpStatus.ACTIVE),
                    eq(OtpStatus.CONSUMED), anyString(), any(LocalDateTime.class), any(LocalDateTime.class),
                    eq(UpdatedByType.CUSTOMER), eq(ID), any(LocalDateTime.class))).thenAnswer(consume);
        } else {
            when(otps.consumePinResetOtpIfActive(eq(10L), eq(GROUP), eq(purpose), eq(OtpStatus.ACTIVE),
                    eq(OtpStatus.CONSUMED), anyString(), any(LocalDateTime.class), any(LocalDateTime.class),
                    eq(UpdatedByType.CUSTOMER), eq(ID), any(LocalDateTime.class))).thenAnswer(consume);
        }
    }

    private String verifyRecovery(OtpPurpose purpose) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            return auth.verifyPasswordResetOtp(new CusPasswordResetOtpVerifyRequest(GROUP, OTP)).getChallengeGroupId();
        }
        var request = new CusPinResetOtpVerifyRequest();
        request.setChallengeGroupId(GROUP);
        request.setOtp(OTP);
        return auth.verifyPinResetOtp("Bearer " + ACCESS, request).getVerifiedChallengeGroupId();
    }

    private void stubIssuance() {
        when(issuer.createAuthenticatedSession(customer, credential, CusSessionClientMetadata.EMPTY))
                .thenReturn(new CusTokenResponse(true, "Synthetic boundary login", ACCESS, REFRESH));
    }

    private long consumptionCalls() {
        return mockingDetails(otps).getInvocations().stream()
                .filter(i -> i.getMethod().getName().startsWith("consume")).count();
    }

    private long writeCalls() {
        return Stream.of(credentials, otps, audits, attempts).flatMap(m -> mockingDetails(m).getInvocations().stream())
                .filter(i -> Set.of("save", "saveAll", "saveAndFlush", "consumePasswordResetOtpIfActive",
                        "consumePinResetOtpIfActive").contains(i.getMethod().getName())).count();
    }

    private List<Object> credentialState() {
        return Arrays.asList(credential.getPasswordHash(), credential.getTransactionPinHash(), credential.getTokenVersion(),
                credential.isMustChangePassword(), credential.getFailedLoginCount(), credential.getLockedUntil(),
                credential.getFailedPinAttemptCount(), credential.getPinLockedUntil(), credential.getLastLoginAt(),
                credential.getPasswordChangedAt(), credential.getPinChangedAt());
    }

    private void assertReplayAddsNoWritesOrIssuance(Executable replay) {
        long writes = writeCalls();
        int issued = mockingDetails(issuer).getInvocations().size();
        int secretChecks = mockingDetails(encoder).getInvocations().size();
        List<Object> beforeCredentials = credentialState();
        var status = challenge.getStatus();
        var consumed = challenge.getConsumedAt();
        var group = challenge.getChallengeGroupId();
        assertThrowsExactly(CusOtpException.class, replay);
        assertEquals(writes, writeCalls());
        assertEquals(issued, mockingDetails(issuer).getInvocations().size());
        assertEquals(secretChecks, mockingDetails(encoder).getInvocations().size());
        assertEquals(beforeCredentials, credentialState());
        assertEquals(status, challenge.getStatus());
        assertEquals(consumed, challenge.getConsumedAt());
        assertEquals(group, challenge.getChallengeGroupId());
    }
}
