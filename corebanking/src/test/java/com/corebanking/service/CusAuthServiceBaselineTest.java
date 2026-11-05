package com.corebanking.service;

import com.corebanking.dto.CusLoginRequest;
import com.corebanking.dto.CusLoginResponse;
import com.corebanking.dto.CusOtpResendRequest;
import com.corebanking.dto.CusOtpResendResponse;
import com.corebanking.dto.CusOtpVerifyRequest;
import com.corebanking.dto.CusOtpVerifyResponse;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.LoginAttempt;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.DeliveryChannel;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.OtpSubjectType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.CusAccountLockedException;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusEmailException;
import com.corebanking.exception.CusOtpException;
import com.corebanking.exception.CusOtpResendLimitException;
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.repository.CusAccountsRepository;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCredentialsRepository;
import com.corebanking.repository.CusCustomerRepository;
import com.corebanking.repository.CusJwtRevokedTokensRepository;
import com.corebanking.repository.CusLoginAttemptsRepository;
import com.corebanking.repository.CusOtpChallengesRepository;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Plain Jupiter/Mockito baseline: no Spring context, database, SMTP or JWT signing.
 * All credentials, OTPs, hashes and tokens are synthetic fixtures. Save assertions
 * describe calls to mocks, not durable commits, transaction atomicity or locking.
 * Supersession and concurrency security regressions require a separately approved phase.
 */
@ExtendWith(MockitoExtension.class)
class CusAuthServiceBaselineTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-1111-1111-111111111111");
    private static final String CUSTOMER_CODE = "CUS-BASELINE-001";
    private static final String ACCOUNT_NUMBER = "BASELINE-ACCOUNT-001";
    private static final String EMAIL = "baseline.customer@example.test";
    private static final String PASSWORD = "OldPass1!";
    private static final String PASSWORD_HASH = "stored-password-hash";
    private static final String OTP = "123456";
    // The generator produces 100000..999999, so this cannot equal a generated resend code.
    private static final String WRONG_OTP = "000000";
    private static final String OTP_HASH = "stored-otp-hash";
    private static final String GROUP_ID = "22222222-2222-2222-2222-222222222222";
    private static final String NEW_PASSWORD = "NewPass1!";
    private static final String PIN = "246810";
    private static final String ACCESS_TOKEN = "mock-access-token";
    private static final String REFRESH_TOKEN = "mock-refresh-token";
    private static final String REFRESH_HASH = "mock-refresh-hash";

    @Mock private CusCustomerRepository customerRepository;
    @Mock private CusAccountsRepository accountsRepository;
    @Mock private CusCredentialsRepository credentialsRepository;
    @Mock private CusLoginAttemptsRepository loginAttemptsRepository;
    @Mock private CusOtpChallengesRepository otpChallengesRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private CusAuthSessionsRepository authSessionsRepository;
    @Mock private CusJwtService cusJwtService;
    @Mock private CusSessionService cusSessionService;
    @Mock private CusJwtRevokedTokensRepository jwtRevokedTokensRepository;
    @Mock private CusEmailService cusEmailService;
    @Mock private CusAuditLogsRepository auditLogsRepository;
    @Mock private EntityManager entityManager;

    private CusAuthService service;

    private Customers customer;
    private CustomerCredentials credentials;
    private OtpChallenge challenge;
    private OtpChallenge originalLoginChallenge;
    private long nextOtpId;
    private int nextOtpHash;

    @BeforeEach
    void setUpFixtures() {
        service = new CusAuthService(customerRepository, accountsRepository, credentialsRepository,
                new CusCustomerLoginAttemptService(loginAttemptsRepository), otpChallengesRepository,
                passwordEncoder, authSessionsRepository, cusJwtService, cusSessionService,
                jwtRevokedTokensRepository, cusEmailService, auditLogsRepository, null, null, null);
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
        customer = Customers.builder()
                .customerId(CUSTOMER_ID)
                .customerCode(CUSTOMER_CODE)
                .customerType(CustomerType.PERSONAL)
                .email(EMAIL)
                .status(CustomerStatus.ACTIVE)
                .build();
        credentials = CustomerCredentials.builder()
                .customerId(CUSTOMER_ID)
                .customer(customer)
                .passwordHash(PASSWORD_HASH)
                .mustChangePassword(false)
                .transactionPinHash("existing-pin-hash")
                .tokenVersion(1L)
                .build();
        LocalDateTime now = LocalDateTime.now();
        challenge = OtpChallenge.builder()
                .otpId(10L)
                .subjectType(OtpSubjectType.CUSTOMER)
                .customer(customer)
                .purpose(OtpPurpose.LOGIN)
                .deliveryChannel(DeliveryChannel.EMAIL)
                .otpHash(OTP_HASH)
                .destinationMasked("ba****@example.test")
                .challengeGroupId(GROUP_ID)
                .status(OtpStatus.ACTIVE)
                .attemptCount(0)
                .maxAttempts(5)
                .resendNo(0)
                .maxResendAttempts(5)
                .lastSentAt(now)
                .expiresAt(now.plusMinutes(5))
                .build();
        originalLoginChallenge = challenge;
        nextOtpId = 100;
    }

    @Test
    void validCustomerCodeAndPasswordCreateEmailOtpWithoutIssuingTokens() {
        stubLoginLookup(CUSTOMER_CODE);
        stubSuccessfulPasswordAndOtpCreation();
        LocalDateTime before = LocalDateTime.now();

        CusLoginResponse response = service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD));

        assertTrue(response.isSuccess());
        assertTrue(response.isOtpRequired());
        assertEquals("OTP has been sent to your registered email.", response.getMessage());
        assertEquals(challenge.getChallengeGroupId(), response.getChallengeGroupId());
        assertEquals("ba****@example.test", response.getMaskedEmail());
        assertDoesNotThrow(() -> UUID.fromString(response.getChallengeGroupId()));
        assertFreshOtp(challenge, 0);
        assertBetween(challenge.getLastSentAt(), before, LocalDateTime.now());
        verify(credentialsRepository).save(credentials);
        verify(otpChallengesRepository).save(challenge);
        verify(otpChallengesRepository).findByCustomerAndSubjectTypeAndPurposeAndStatus(
                customer, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, OtpStatus.ACTIVE);
        assertGeneratedOtpDelivered();
        assertAuditAction("OTP_SENT");
        verifyNoInteractions(accountsRepository, loginAttemptsRepository);
        assertNoTokensOrSessions();
    }

    @Test
    void validAccountNumberUsesTheOwningCustomersCredentials() {
        Accounts account = Accounts.builder().accountNumber(ACCOUNT_NUMBER).customer(customer).build();
        when(customerRepository.findByCustomerCode(ACCOUNT_NUMBER)).thenReturn(Optional.empty());
        when(accountsRepository.findByAccountNumber(ACCOUNT_NUMBER)).thenReturn(Optional.of(account));
        stubCredentialLock();
        stubSuccessfulPasswordAndOtpCreation();

        CusLoginResponse response = service.authenticateCredentials(loginRequest(ACCOUNT_NUMBER, PASSWORD));

        assertTrue(response.isSuccess());
        assertSame(customer, challenge.getCustomer());
        verify(accountsRepository).findByAccountNumber(ACCOUNT_NUMBER);
        verify(credentialsRepository).findByCustomerIdForUpdate(CUSTOMER_ID);
        verify(credentialsRepository).save(credentials);
        assertGeneratedOtpDelivered();
        assertNoTokensOrSessions();
    }

    @Test
    void incorrectPasswordIncrementsFailureCountAndRecordsFailedAttempt() {
        stubLoginLookup(CUSTOMER_CODE);
        when(passwordEncoder.matches("incorrect", PASSWORD_HASH)).thenReturn(false);

        CusAuthenticationException error = assertThrows(CusAuthenticationException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, "incorrect")));

        assertEquals("Invalid Password.", error.getMessage());
        assertEquals(1, credentials.getFailedLoginCount());
        assertNull(credentials.getLockedUntil());
        verify(credentialsRepository).save(credentials);
        LoginAttempt attempt = capturedAttempt();
        assertFalse(attempt.isSuccess());
        assertEquals("INVALID_PASSWORD", attempt.getFailureReason());
        assertEquals(CUSTOMER_CODE, attempt.getLoginIdentifier());
        assertEquals(SessionSubjectType.CUSTOMER, attempt.getActorType());
        assertSame(customer, attempt.getCustomer());
        verifyNoInteractions(otpChallengesRepository, cusEmailService);
        assertNoTokensOrSessions();
    }

    @Test
    void fiveSequentialIncorrectPasswordsRequestCountsOneThroughFiveAndFifteenMinuteLock() {
        stubLoginLookup(CUSTOMER_CODE);
        when(passwordEncoder.matches("incorrect", PASSWORD_HASH)).thenReturn(false);
        List<Integer> savedCounts = new ArrayList<>();
        when(credentialsRepository.save(any(CustomerCredentials.class))).thenAnswer(invocation -> {
            CustomerCredentials saved = invocation.getArgument(0);
            savedCounts.add(saved.getFailedLoginCount());
            return saved;
        });
        LocalDateTime before = LocalDateTime.now();

        for (int attempt = 1; attempt <= 4; attempt++) {
            assertThrows(CusAuthenticationException.class,
                    () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, "incorrect")));
            assertEquals(attempt, credentials.getFailedLoginCount());
            assertNull(credentials.getLockedUntil());
        }
        assertThrows(CusAccountLockedException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, "incorrect")));

        assertEquals(List.of(1, 2, 3, 4, 5), savedCounts);
        assertBetween(credentials.getLockedUntil(), before.plusMinutes(15),
                LocalDateTime.now().plusMinutes(15));
        ArgumentCaptor<LoginAttempt> attempts = ArgumentCaptor.forClass(LoginAttempt.class);
        verify(loginAttemptsRepository, times(5)).save(attempts.capture());
        assertEquals(List.of("INVALID_PASSWORD", "INVALID_PASSWORD", "INVALID_PASSWORD",
                        "INVALID_PASSWORD", "ACCOUNT_LOCKED"),
                attempts.getAllValues().stream().map(LoginAttempt::getFailureReason).toList());
        assertTrue(attempts.getAllValues().stream().noneMatch(LoginAttempt::isSuccess));
        verifyNoInteractions(otpChallengesRepository, cusEmailService);
    }

    @Test
    void activeLockRejectsLoginBeforeCheckingEvenACorrectPassword() {
        stubLoginLookup(CUSTOMER_CODE);
        credentials.setFailedLoginCount(5);
        LocalDateTime deadline = LocalDateTime.now().plusMinutes(15);
        credentials.setLockedUntil(deadline);

        assertThrows(CusAccountLockedException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD)));

        assertEquals(5, credentials.getFailedLoginCount());
        assertEquals(deadline, credentials.getLockedUntil());
        assertEquals("ACCOUNT_LOCKED", capturedAttempt().getFailureReason());
        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, otpChallengesRepository, cusEmailService);
        assertNoTokensOrSessions();
    }

    @Test
    void expiredLockAllowsCorrectPasswordAndClearsTheLock() {
        stubLoginLookup(CUSTOMER_CODE);
        stubSuccessfulPasswordAndOtpCreation();
        credentials.setFailedLoginCount(5);
        credentials.setLockedUntil(LocalDateTime.now().minusSeconds(1));

        assertTrue(service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD)).isSuccess());

        assertEquals(0, credentials.getFailedLoginCount());
        assertNull(credentials.getLockedUntil());
        verify(credentialsRepository, times(2)).save(credentials);
        assertNoTokensOrSessions();
    }

    @Test
    void successfulPasswordResetsPreviousFailuresBeforeOtpVerification() {
        stubLoginLookup(CUSTOMER_CODE);
        stubSuccessfulPasswordAndOtpCreation();
        credentials.setFailedLoginCount(3);

        service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD));

        assertEquals(0, credentials.getFailedLoginCount());
        assertNull(credentials.getLockedUntil());
        assertNull(credentials.getLastLoginAt());
        verify(credentialsRepository).save(credentials);
        verifyNoInteractions(loginAttemptsRepository);
        assertNoTokensOrSessions();
    }

    @Test
    void unknownCustomerRecordsInvalidIdentifierWithoutCreatingOtp() {
        when(customerRepository.findByCustomerCode(CUSTOMER_CODE)).thenReturn(Optional.empty());
        when(accountsRepository.findByAccountNumber(CUSTOMER_CODE)).thenReturn(Optional.empty());

        assertThrows(CusAuthenticationException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD)));

        LoginAttempt attempt = capturedAttempt();
        assertFalse(attempt.isSuccess());
        assertEquals("INVALID_IDENTIFIER", attempt.getFailureReason());
        assertEquals(CUSTOMER_CODE, attempt.getLoginIdentifier());
        assertNull(attempt.getCustomer());
        verifyNoInteractions(credentialsRepository, passwordEncoder, otpChallengesRepository, cusEmailService);
    }

    @Test
    void inactiveCustomerIsRejectedBeforeCredentialsAreLoaded() {
        customer.setStatus(CustomerStatus.INACTIVE);
        when(customerRepository.findByCustomerCode(CUSTOMER_CODE)).thenReturn(Optional.of(customer));

        CusAuthenticationException error = assertThrows(CusAuthenticationException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD)));

        assertEquals("Customer account is not active.", error.getMessage());
        verifyNoInteractions(credentialsRepository, passwordEncoder, otpChallengesRepository, cusEmailService);
    }

    @Test
    void missingCredentialsRejectLoginWithoutSendingOtp() {
        when(customerRepository.findByCustomerCode(CUSTOMER_CODE)).thenReturn(Optional.of(customer));
        when(credentialsRepository.findByCustomerIdForUpdate(CUSTOMER_ID)).thenReturn(Optional.empty());

        assertThrows(CusAuthenticationException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD)));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, otpChallengesRepository, cusEmailService);
    }

    @Test
    void loginEmailFailureRequestsExpirationOfTheNewChallenge() {
        stubLoginLookup(CUSTOMER_CODE);
        stubSuccessfulPasswordAndOtpCreation();
        doThrow(new MailSendException("Synthetic delivery failure"))
                .when(cusEmailService).sendLoginOtp(eq(EMAIL), anyString());

        assertThrows(CusEmailException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD)));

        assertEquals(OtpStatus.EXPIRED, challenge.getStatus());
        assertEquals(UpdatedByType.SYSTEM, challenge.getUpdatedByType());
        assertNull(challenge.getUpdatedById());
        verify(otpChallengesRepository, times(2)).save(challenge);
        assertAuditAction("OTP_SEND_FAILED");
        assertNoTokensOrSessions();
    }

    @Test
    void correctOtpConsumesChallengeAndReturnsMockTokensForReturningCustomer() {
        stubChallengeLookup();
        stubCredentialsLookup();
        stubTokenIssuance();
        when(passwordEncoder.matches(OTP, OTP_HASH)).thenReturn(true);
        LocalDateTime before = LocalDateTime.now();

        CusOtpVerifyResponse response = service.verifyLoginOtp(verifyRequest(OTP));

        assertTrue(response.isSuccess());
        assertFalse(response.isFirstLoginSetupRequired());
        assertFalse(response.isPasswordChangeRequired());
        assertFalse(response.isPinSetupRequired());
        assertEquals(ACCESS_TOKEN, response.getAccessToken());
        assertEquals(REFRESH_TOKEN, response.getRefreshToken());
        assertEquals(OtpStatus.CONSUMED, challenge.getStatus());
        assertBetween(challenge.getConsumedAt(), before, LocalDateTime.now());
        assertEquals(0, challenge.getAttemptCount());
        assertEquals(UpdatedByType.CUSTOMER, challenge.getUpdatedByType());
        assertEquals(CUSTOMER_ID, challenge.getUpdatedById());
        verify(otpChallengesRepository).save(challenge);
        assertMockSessionIssued();
        assertAuditAction("OTP_VERIFIED");
        verifyNoInteractions(cusEmailService);
    }

    @Test
    void incorrectOtpRequestsAnIncrementWithoutConsumingOrIssuingTokens() {
        stubChallengeLookup();
        when(passwordEncoder.matches(WRONG_OTP, OTP_HASH)).thenReturn(false);

        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(WRONG_OTP)));

        assertEquals(1, challenge.getAttemptCount());
        assertEquals(OtpStatus.ACTIVE, challenge.getStatus());
        assertNull(challenge.getConsumedAt());
        verify(otpChallengesRepository).save(challenge);
        assertAuditAction("OTP_VERIFY_FAILED");
        assertNoTokensOrSessions();
    }

    @Test
    void fiveSequentialIncorrectOtpsBlockTheOtpAndRejectFurtherChecks() {
        stubChallengeLookup();
        when(passwordEncoder.matches(WRONG_OTP, OTP_HASH)).thenReturn(false);
        List<Integer> savedCounts = new ArrayList<>();
        when(otpChallengesRepository.save(any(OtpChallenge.class))).thenAnswer(invocation -> {
            OtpChallenge saved = invocation.getArgument(0);
            savedCounts.add(saved.getAttemptCount());
            return saved;
        });

        for (int attempt = 1; attempt <= 5; attempt++) {
            assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(WRONG_OTP)));
            assertEquals(attempt, challenge.getAttemptCount());
            assertEquals(attempt == 5 ? OtpStatus.BLOCKED : OtpStatus.ACTIVE, challenge.getStatus());
        }
        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(WRONG_OTP)));

        assertEquals(List.of(1, 2, 3, 4, 5), savedCounts);
        verify(passwordEncoder, times(5)).matches(WRONG_OTP, OTP_HASH);
        assertNull(challenge.getConsumedAt());
        assertAuditAction("OTP_BLOCKED");
        assertNoTokensOrSessions();
    }

    @Test
    void expiredActiveOtpIsMarkedExpiredWithoutCheckingItsHash() {
        stubChallengeLookup();
        challenge.setExpiresAt(LocalDateTime.now().minusSeconds(1));

        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(OTP)));

        assertEquals(OtpStatus.EXPIRED, challenge.getStatus());
        assertEquals(UpdatedByType.SYSTEM, challenge.getUpdatedByType());
        assertNull(challenge.getUpdatedById());
        assertEquals(0, challenge.getAttemptCount());
        verify(otpChallengesRepository).save(challenge);
        verifyNoInteractions(passwordEncoder);
        assertNoTokensOrSessions();
    }

    @Test
    void blockedOtpCannotBeVerified() {
        stubChallengeLookup();
        challenge.setStatus(OtpStatus.BLOCKED);
        challenge.setAttemptCount(5);

        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(OTP)));

        verify(otpChallengesRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
        assertNoTokensOrSessions();
    }

    @Test
    void activeOtpAlreadyAtAttemptLimitIsBlockedBeforeHashChecking() {
        stubChallengeLookup();
        challenge.setAttemptCount(5);

        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(OTP)));

        assertEquals(OtpStatus.BLOCKED, challenge.getStatus());
        verify(otpChallengesRepository).save(challenge);
        verifyNoInteractions(passwordEncoder);
        assertNoTokensOrSessions();
    }

    @Test
    void consumedOtpCannotBeVerifiedAgain() {
        stubChallengeLookup();
        markChallengeConsumed();

        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(OTP)));

        verify(otpChallengesRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
        assertNoTokensOrSessions();
    }

    @Test
    void activeOtpResendCreatesFreshRecordAndInvalidatesItsPredecessor() {
        stubResend();
        OtpChallenge previous = challenge;
        previous.setAttemptCount(3);

        CusOtpResendResponse response = service.resendLoginOtp(resendRequest());

        assertTrue(response.isSuccess());
        assertEquals(GROUP_ID, response.getChallengeGroupId());
        assertEquals(1, response.getResendNo());
        assertEquals(OtpStatus.EXPIRED, previous.getStatus());
        assertNotSame(previous, challenge);
        assertNotEquals(previous.getOtpId(), challenge.getOtpId());
        assertNotEquals(previous.getOtpHash(), challenge.getOtpHash());
        assertEquals(GROUP_ID, challenge.getChallengeGroupId());
        assertFreshOtp(challenge, 1);
        assertGeneratedOtpDelivered();
        assertAuditAction("OTP_RESENT");
        assertNoTokensOrSessions();
    }

    @Test
    void blockedOtpMayBeResentWithAFreshFiveAttemptBudget() {
        stubResend();
        OtpChallenge previous = challenge;
        previous.setStatus(OtpStatus.BLOCKED);
        previous.setAttemptCount(5);
        previous.setResendNo(2);

        assertEquals(3, service.resendLoginOtp(resendRequest()).getResendNo());

        assertNotSame(previous, challenge);
        assertNotEquals(OtpStatus.ACTIVE, previous.getStatus());
        assertEquals(5, previous.getAttemptCount());
        assertFreshOtp(challenge, 3);
        assertEquals(GROUP_ID, challenge.getChallengeGroupId());
        assertNoTokensOrSessions();
    }

    @Test
    void fiveSequentialResendsKeepTheGroupAndIncrementWithoutResettingTheCounter() {
        stubResend();
        List<OtpChallenge> predecessors = new ArrayList<>();

        for (int resend = 1; resend <= 5; resend++) {
            OtpChallenge previous = challenge;
            predecessors.add(previous);
            CusOtpResendResponse response = service.resendLoginOtp(resendRequest());
            assertEquals(resend, response.getResendNo());
            assertEquals(GROUP_ID, response.getChallengeGroupId());
            assertFreshOtp(challenge, resend);
            assertNotSame(previous, challenge);
            assertNotEquals(previous.getOtpHash(), challenge.getOtpHash());
        }

        assertTrue(predecessors.stream().allMatch(row -> row.getStatus() == OtpStatus.EXPIRED));
        assertEquals(5, challenge.getResendNo());
        verify(cusEmailService, times(5)).sendLoginOtp(eq(EMAIL), anyString());
        assertNoTokensOrSessions();
    }

    @Test
    void sixthResendIsRejectedBeforeAnyWriteHashOrEmail() {
        stubChallengeLookup();
        challenge.setResendNo(5);

        assertThrows(CusOtpResendLimitException.class, () -> service.resendLoginOtp(resendRequest()));

        assertEquals(5, challenge.getResendNo());
        assertEquals(OtpStatus.ACTIVE, challenge.getStatus());
        verify(otpChallengesRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, cusEmailService);
        assertNoTokensOrSessions();
    }

    @Test
    void fifthReplacementRemainsVerifiableAfterFourIncorrectAttempts() {
        stubResend();
        for (int resend = 1; resend <= 5; resend++) {
            service.resendLoginOtp(resendRequest());
        }
        ArgumentCaptor<String> deliveries = ArgumentCaptor.forClass(String.class);
        verify(cusEmailService, times(5)).sendLoginOtp(eq(EMAIL), deliveries.capture());
        String finalOtp = deliveries.getAllValues().getLast();
        when(passwordEncoder.matches(WRONG_OTP, challenge.getOtpHash())).thenReturn(false);
        for (int attempt = 1; attempt <= 4; attempt++) {
            assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(WRONG_OTP)));
        }
        assertEquals(OtpStatus.ACTIVE, challenge.getStatus());
        assertEquals(4, challenge.getAttemptCount());
        credentials.setMustChangePassword(true);
        credentials.setTransactionPinHash(null);
        stubCredentialsLookup();
        when(passwordEncoder.matches(finalOtp, challenge.getOtpHash())).thenReturn(true);

        CusOtpVerifyResponse response = service.verifyLoginOtp(verifyRequest(finalOtp));

        assertTrue(response.isSuccess());
        assertEquals(5, challenge.getResendNo());
        assertEquals(4, challenge.getAttemptCount());
        assertEquals(OtpStatus.CONSUMED, challenge.getStatus());
        assertNoTokensOrSessions();
    }

    @Test
    void resendEmailFailureRequestsExpirationOfTheReplacement() {
        stubResend();
        OtpChallenge previous = challenge;
        doThrow(new MailSendException("Synthetic delivery failure"))
                .when(cusEmailService).sendLoginOtp(eq(EMAIL), anyString());

        assertThrows(CusEmailException.class, () -> service.resendLoginOtp(resendRequest()));

        assertNotSame(previous, challenge);
        assertEquals(OtpStatus.EXPIRED, previous.getStatus());
        assertEquals(OtpStatus.EXPIRED, challenge.getStatus());
        assertEquals(1, challenge.getResendNo());
        assertEquals(UpdatedByType.SYSTEM, challenge.getUpdatedByType());
        assertNull(challenge.getUpdatedById());
        verify(otpChallengesRepository, times(2)).save(challenge);
        assertAuditAction("OTP_RESEND_FAILED");
        assertNoTokensOrSessions();
    }

    @Test
    void consumedOtpCannotBeResent() {
        stubChallengeLookup();
        markChallengeConsumed();

        assertThrows(CusOtpException.class, () -> service.resendLoginOtp(resendRequest()));

        verify(otpChallengesRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, cusEmailService);
        assertNoTokensOrSessions();
    }

    @Test
    void firstLoginOtpReturnsBothSetupFlagsAndWithholdsTokens() {
        credentials.setMustChangePassword(true);
        credentials.setTransactionPinHash(null);

        assertSetupFlags(verifyOtpForSetup(), true, true);
    }

    @Test
    void firstLoginOtpCanRequireOnlyPinSetup() {
        credentials.setMustChangePassword(false);
        credentials.setTransactionPinHash(" ");

        assertSetupFlags(verifyOtpForSetup(), false, true);
    }

    @Test
    void firstLoginOtpCanRequireOnlyPasswordChange() {
        credentials.setMustChangePassword(true);

        assertSetupFlags(verifyOtpForSetup(), true, false);
    }

    @Test
    void temporaryPasswordChangeUpdatesHashAndFlagWithoutInvalidatingThePinSetupBinding() {
        stubConsumedBinding();
        credentials.setMustChangePassword(true);
        when(passwordEncoder.matches(NEW_PASSWORD, PASSWORD_HASH)).thenReturn(false);
        when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn("new-password-hash");
        LocalDateTime before = LocalDateTime.now();

        service.changeFirstLoginPassword(GROUP_ID, NEW_PASSWORD, NEW_PASSWORD);

        assertEquals("new-password-hash", credentials.getPasswordHash());
        assertFalse(credentials.isMustChangePassword());
        assertBetween(credentials.getPasswordChangedAt(), before, LocalDateTime.now());
        assertEquals(OtpStatus.CONSUMED, challenge.getStatus());
        verify(credentialsRepository).save(credentials);
        verify(otpChallengesRepository, never()).save(any());
        assertAuditAction("FIRST_LOGIN_PASSWORD_CHANGED");
        assertNoTokensOrSessions();
    }

    @Test
    void passwordChangeRequiresAVerifiedConsumedBinding() {
        stubChallengeLookup();

        assertThrows(CusOtpException.class,
                () -> service.changeFirstLoginPassword(GROUP_ID, NEW_PASSWORD, NEW_PASSWORD));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
        assertNoTokensOrSessions();
    }

    @Test
    void passwordChangeRejectsAnExpiredTenMinuteSetupWindow() {
        stubChallengeLookup();
        markChallengeConsumed();
        challenge.setConsumedAt(LocalDateTime.now().minusMinutes(11));

        assertThrows(CusSessionExpiredException.class,
                () -> service.changeFirstLoginPassword(GROUP_ID, NEW_PASSWORD, NEW_PASSWORD));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
        assertNoTokensOrSessions();
    }

    @Test
    void passwordChangeRejectsAWeakPasswordWithoutWritingCredentials() {
        stubConsumedBinding();
        credentials.setMustChangePassword(true);
        when(passwordEncoder.matches("weak", PASSWORD_HASH)).thenReturn(false);

        assertThrows(CusValidationException.class,
                () -> service.changeFirstLoginPassword(GROUP_ID, "weak", "weak"));

        assertEquals(PASSWORD_HASH, credentials.getPasswordHash());
        assertTrue(credentials.isMustChangePassword());
        verify(credentialsRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    void passwordChangeRejectsReusingTheTemporaryPassword() {
        stubConsumedBinding();
        credentials.setMustChangePassword(true);
        when(passwordEncoder.matches(PASSWORD, PASSWORD_HASH)).thenReturn(true);

        assertThrows(CusValidationException.class,
                () -> service.changeFirstLoginPassword(GROUP_ID, PASSWORD, PASSWORD));

        verify(credentialsRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(anyString());
    }

    @Test
    void pinSetupHashesPinResetsPinLockAndReturnsMockTokens() {
        stubConsumedBinding();
        credentials.setTransactionPinHash(null);
        credentials.setFailedPinAttemptCount(3);
        credentials.setPinLockedUntil(LocalDateTime.now().plusMinutes(15));
        when(passwordEncoder.encode(PIN)).thenReturn("new-pin-hash");
        stubTokenIssuance();
        LocalDateTime before = LocalDateTime.now();

        CusTokenResponse response = service.setupTransactionPin(GROUP_ID, PIN, PIN);

        assertTrue(response.isSuccess());
        assertEquals(ACCESS_TOKEN, response.getAccessToken());
        assertEquals(REFRESH_TOKEN, response.getRefreshToken());
        assertEquals("new-pin-hash", credentials.getTransactionPinHash());
        assertEquals(0, credentials.getFailedPinAttemptCount());
        assertNull(credentials.getPinLockedUntil());
        assertBetween(credentials.getPinChangedAt(), before, LocalDateTime.now());
        verify(passwordEncoder).encode(PIN);
        verify(credentialsRepository, times(2)).save(credentials);
        assertMockSessionIssued();
    }

    @Test
    void pinSetupRequiresTemporaryPasswordChangeFirst() {
        stubConsumedBinding();
        credentials.setMustChangePassword(true);
        credentials.setTransactionPinHash(null);

        assertThrows(CusValidationException.class, () -> service.setupTransactionPin(GROUP_ID, PIN, PIN));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
        assertNoTokensOrSessions();
    }

    @Test
    void pinSetupCannotOverwriteAnExistingPin() {
        stubConsumedBinding();

        assertThrows(CusValidationException.class, () -> service.setupTransactionPin(GROUP_ID, PIN, PIN));

        assertEquals("existing-pin-hash", credentials.getTransactionPinHash());
        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
        assertNoTokensOrSessions();
    }

    @Test
    void pinSetupRejectsANonSixDigitPinBeforeReadingRepositories() {
        assertThrows(CusValidationException.class,
                () -> service.setupTransactionPin(GROUP_ID, "12345", "12345"));

        verifyNoInteractions(otpChallengesRepository, credentialsRepository, passwordEncoder);
        assertNoTokensOrSessions();
    }

    @Test
    void extractedWriterPreservesFailedPasswordFieldsAndSavesAfterCredentialUpdate() {
        stubLoginLookup(CUSTOMER_CODE);
        when(passwordEncoder.matches("incorrect", PASSWORD_HASH)).thenReturn(false);

        assertThrows(CusAuthenticationException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, "incorrect")));

        LoginAttempt attempt = capturedAttempt();
        assertAttemptFields(attempt, CUSTOMER_CODE, customer, false, "INVALID_PASSWORD");
        var order = inOrder(credentialsRepository, loginAttemptsRepository);
        order.verify(credentialsRepository).findByCustomerIdForUpdate(CUSTOMER_ID);
        order.verify(credentialsRepository).save(credentials);
        order.verify(loginAttemptsRepository).save(same(attempt));
        order.verifyNoMoreInteractions();
        assertNoTokensOrSessions();
    }

    @Test
    void extractedWriterPreservesUnknownCustomerFieldsAndLookupBeforeHistoryWrite() {
        when(customerRepository.findByCustomerCode(CUSTOMER_CODE)).thenReturn(Optional.empty());
        when(accountsRepository.findByAccountNumber(CUSTOMER_CODE)).thenReturn(Optional.empty());

        assertThrows(CusAuthenticationException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD)));

        LoginAttempt attempt = capturedAttempt();
        assertAttemptFields(attempt, CUSTOMER_CODE, null, false, "INVALID_IDENTIFIER");
        var order = inOrder(customerRepository, accountsRepository, loginAttemptsRepository);
        order.verify(customerRepository).findByCustomerCode(CUSTOMER_CODE);
        order.verify(accountsRepository).findByAccountNumber(CUSTOMER_CODE);
        order.verify(loginAttemptsRepository).save(same(attempt));
        order.verifyNoMoreInteractions();
        verifyNoInteractions(credentialsRepository, otpChallengesRepository, cusEmailService);
    }

    @Test
    void extractedWriterRecordsSuccessOnlyAfterOtpSessionAuditAndLastLoginWrites() {
        stubChallengeLookup();
        stubCredentialsLookup();
        stubTokenIssuance();
        when(passwordEncoder.matches(OTP, OTP_HASH)).thenReturn(true);

        assertTrue(service.verifyLoginOtp(verifyRequest(OTP)).isSuccess());

        LoginAttempt attempt = capturedAttempt();
        assertAttemptFields(attempt, CUSTOMER_CODE, customer, true, null);
        assertCompletedLoginWriteOrder(attempt);
        assertNotNull(credentials.getLastLoginAt());
    }

    @Test
    void accountNumberPasswordFailureRecordsEnteredIdentifierAndCustomerOwnership() {
        when(customerRepository.findByCustomerCode(ACCOUNT_NUMBER)).thenReturn(Optional.empty());
        when(accountsRepository.findByAccountNumber(ACCOUNT_NUMBER)).thenReturn(Optional.of(
                Accounts.builder().accountNumber(ACCOUNT_NUMBER).customer(customer).build()));
        stubCredentialLock();
        when(passwordEncoder.matches("incorrect", PASSWORD_HASH)).thenReturn(false);

        assertThrows(CusAuthenticationException.class,
                () -> service.authenticateCredentials(loginRequest("  " + ACCOUNT_NUMBER + "  ", "incorrect")));

        assertAttemptFields(capturedAttempt(), ACCOUNT_NUMBER, customer, false, "INVALID_PASSWORD");
        verify(credentialsRepository).save(credentials);
        assertNoTokensOrSessions();
    }

    @Test
    void accountNumberLoginRecordsCanonicalCustomerCodeOnlyAfterOtpCompletion() {
        when(customerRepository.findByCustomerCode(ACCOUNT_NUMBER)).thenReturn(Optional.empty());
        when(accountsRepository.findByAccountNumber(ACCOUNT_NUMBER)).thenReturn(Optional.of(
                Accounts.builder().accountNumber(ACCOUNT_NUMBER).customer(customer).build()));
        stubCredentialLock();
        stubSuccessfulPasswordAndOtpCreation();

        CusLoginResponse login = service.authenticateCredentials(loginRequest(ACCOUNT_NUMBER, PASSWORD));

        verifyNoInteractions(loginAttemptsRepository);
        assertNull(credentials.getLastLoginAt());
        String group = login.getChallengeGroupId();
        when(otpChallengesRepository.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                group, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(challenge));
        when(otpChallengesRepository.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                group, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(challenge));
        stubCredentialsLookup();
        stubTokenIssuance();
        when(passwordEncoder.matches(OTP, challenge.getOtpHash())).thenReturn(true);
        CusOtpVerifyRequest request = new CusOtpVerifyRequest();
        request.setChallengeGroupId(group);
        request.setOtp(OTP);

        assertTrue(service.verifyLoginOtp(request).isSuccess());

        assertAttemptFields(capturedAttempt(), CUSTOMER_CODE, customer, true, null);
        verify(authSessionsRepository).save(any(AuthSession.class));
    }

    @Test
    void failedPasswordHistorySaveFailurePropagatesTheSameRepositoryException() {
        stubLoginLookup(CUSTOMER_CODE);
        when(passwordEncoder.matches("incorrect", PASSWORD_HASH)).thenReturn(false);
        var failure = new DataAccessResourceFailureException("Synthetic history failure");
        when(loginAttemptsRepository.save(any(LoginAttempt.class))).thenThrow(failure);

        assertSame(failure, assertThrows(DataAccessResourceFailureException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, "incorrect"))));

        assertEquals(1, credentials.getFailedLoginCount());
        var order = inOrder(credentialsRepository, loginAttemptsRepository);
        order.verify(credentialsRepository).save(credentials);
        order.verify(loginAttemptsRepository).save(any(LoginAttempt.class));
        verifyNoInteractions(otpChallengesRepository, cusEmailService);
        assertNoTokensOrSessions();
    }

    @Test
    void unknownCustomerHistorySaveFailurePropagatesWithoutBeingSwallowed() {
        when(customerRepository.findByCustomerCode(CUSTOMER_CODE)).thenReturn(Optional.empty());
        when(accountsRepository.findByAccountNumber(CUSTOMER_CODE)).thenReturn(Optional.empty());
        var failure = new DataAccessResourceFailureException("Synthetic history failure");
        when(loginAttemptsRepository.save(any(LoginAttempt.class))).thenThrow(failure);

        assertSame(failure, assertThrows(DataAccessResourceFailureException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD))));

        assertAttemptFields(capturedAttempt(), CUSTOMER_CODE, null, false, "INVALID_IDENTIFIER");
        verifyNoInteractions(credentialsRepository, passwordEncoder, otpChallengesRepository, cusEmailService);
    }

    @Test
    void successfulHistorySaveFailurePropagatesAfterSessionWritesWithoutReturningTokens() {
        stubChallengeLookup();
        stubCredentialsLookup();
        stubTokenIssuance();
        when(passwordEncoder.matches(OTP, OTP_HASH)).thenReturn(true);
        var failure = new DataAccessResourceFailureException("Synthetic history failure");
        when(loginAttemptsRepository.save(any(LoginAttempt.class))).thenThrow(failure);

        assertSame(failure, assertThrows(DataAccessResourceFailureException.class,
                () -> service.verifyLoginOtp(verifyRequest(OTP))));

        LoginAttempt attempt = capturedAttempt();
        assertAttemptFields(attempt, CUSTOMER_CODE, customer, true, null);
        assertCompletedLoginWriteOrder(attempt);
        // Mock writes/order do not establish a real database rollback.
    }

    @Test
    void passwordStageEmailFailureDoesNotRecordPrematureSuccessfulHistory() {
        stubLoginLookup(CUSTOMER_CODE);
        stubSuccessfulPasswordAndOtpCreation();
        doThrow(new MailSendException("Synthetic delivery failure"))
                .when(cusEmailService).sendLoginOtp(eq(EMAIL), anyString());

        assertThrows(CusEmailException.class,
                () -> service.authenticateCredentials(loginRequest(CUSTOMER_CODE, PASSWORD)));

        verifyNoInteractions(loginAttemptsRepository);
        assertNull(credentials.getLastLoginAt());
        assertEquals(OtpStatus.EXPIRED, challenge.getStatus());
        assertNoTokensOrSessions();
    }

    @Test
    void firstLoginRecordsSuccessOnlyAfterPasswordAndPinSetupComplete() {
        credentials.setMustChangePassword(true);
        credentials.setTransactionPinHash(null);
        stubChallengeLookup();
        stubCredentialsLookup();
        when(passwordEncoder.matches(OTP, OTP_HASH)).thenReturn(true);

        CusOtpVerifyResponse verified = service.verifyLoginOtp(verifyRequest(OTP));

        assertTrue(verified.isPasswordChangeRequired());
        assertTrue(verified.isPinSetupRequired());
        verifyNoInteractions(loginAttemptsRepository);
        assertNoTokensOrSessions();
        when(passwordEncoder.matches(NEW_PASSWORD, PASSWORD_HASH)).thenReturn(false);
        when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn("new-password-hash");

        service.changeFirstLoginPassword(GROUP_ID, NEW_PASSWORD, NEW_PASSWORD);

        verifyNoInteractions(loginAttemptsRepository);
        assertNoTokensOrSessions();
        when(passwordEncoder.encode(PIN)).thenReturn("new-pin-hash");
        stubTokenIssuance();

        assertTrue(service.setupTransactionPin(GROUP_ID, PIN, PIN).isSuccess());

        assertAttemptFields(capturedAttempt(), CUSTOMER_CODE, customer, true, null);
        verify(authSessionsRepository).save(any(AuthSession.class));
        assertNotNull(credentials.getLastLoginAt());
    }

    private void assertAttemptFields(LoginAttempt attempt, String identifier, Customers owner,
                                     boolean success, String reason) {
        assertEquals(SessionSubjectType.CUSTOMER, attempt.getActorType());
        assertEquals(identifier, attempt.getLoginIdentifier());
        assertSame(owner, attempt.getCustomer());
        assertEquals(success, attempt.isSuccess());
        assertEquals(reason, attempt.getFailureReason());
        assertNull(attempt.getCorporateUser());
        assertNull(attempt.getStaff());
        assertNull(attempt.getIpAddress());
        assertNull(attempt.getUserAgent());
        assertNull(attempt.getUpdatedByType());
        assertNull(attempt.getUpdatedById());
        assertNull(attempt.getLoginAttemptId());
        // Entity callbacks, not the service, populate timestamps on real persistence.
        assertNull(attempt.getAttemptedAt());
        assertNull(attempt.getUpdatedAt());
    }

    private void assertCompletedLoginWriteOrder(LoginAttempt attempt) {
        var order = inOrder(otpChallengesRepository, authSessionsRepository, auditLogsRepository,
                credentialsRepository, loginAttemptsRepository);
        order.verify(otpChallengesRepository).save(challenge);
        order.verify(auditLogsRepository).save(argThat(audit -> "OTP_VERIFIED".equals(audit.getActionType())));
        order.verify(authSessionsRepository).save(any(AuthSession.class));
        order.verify(auditLogsRepository).save(argThat(audit -> "AUTH_SESSION_CREATED".equals(audit.getActionType())));
        order.verify(credentialsRepository).save(credentials);
        order.verify(loginAttemptsRepository).save(same(attempt));
        order.verifyNoMoreInteractions();
    }

    private void stubLoginLookup(String identifier) {
        when(customerRepository.findByCustomerCode(identifier)).thenReturn(Optional.of(customer));
        stubCredentialLock();
    }

    private void stubCredentialLock() {
        when(credentialsRepository.findByCustomerIdForUpdate(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
    }

    private void stubCredentialsLookup() {
        when(credentialsRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
    }

    private void stubSuccessfulPasswordAndOtpCreation() {
        when(passwordEncoder.matches(PASSWORD, PASSWORD_HASH)).thenReturn(true);
        stubOriginalLoginLookup();
        when(otpChallengesRepository.findByCustomerAndSubjectTypeAndPurposeAndStatus(
                customer, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, OtpStatus.ACTIVE))
                .thenReturn(List.of());
        stubNewOtpWrites();
    }

    private void stubChallengeLookup() {
        stubCredentialLock();
        stubOriginalLoginLookup();
        when(otpChallengesRepository.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                GROUP_ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN))
                .thenAnswer(invocation -> Optional.of(challenge));
        when(otpChallengesRepository.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                GROUP_ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN))
                .thenAnswer(invocation -> Optional.of(challenge));
    }

    private void stubOriginalLoginLookup() {
        when(otpChallengesRepository
                .findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(
                        CUSTOMER_ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0))
                .thenAnswer(invocation -> Optional.of(originalLoginChallenge));
    }

    private void stubResend() {
        stubChallengeLookup();
        stubNewOtpWrites();
    }

    private void stubNewOtpWrites() {
        when(passwordEncoder.encode(anyString())).thenAnswer(invocation -> "encoded-otp-" + ++nextOtpHash);
        // Minimal single-threaded fixture storage; it does not emulate database locking or commits.
        when(otpChallengesRepository.save(any(OtpChallenge.class))).thenAnswer(invocation -> {
            OtpChallenge saved = invocation.getArgument(0);
            if (saved.getOtpId() == null) {
                saved.setOtpId(++nextOtpId);
            }
            challenge = saved;
            if (saved.getResendNo() == 0) {
                originalLoginChallenge = saved;
            }
            return saved;
        });
    }

    private void stubConsumedBinding() {
        stubChallengeLookup();
        stubCredentialsLookup();
        markChallengeConsumed();
    }

    private void markChallengeConsumed() {
        challenge.setStatus(OtpStatus.CONSUMED);
        challenge.setConsumedAt(LocalDateTime.now());
    }

    private void stubTokenIssuance() {
        when(cusJwtService.generateAccessToken(eq(CUSTOMER_ID), anyString(), eq(1L)))
                .thenReturn(ACCESS_TOKEN);
        when(cusJwtService.generateRefreshToken(eq(CUSTOMER_ID), anyString(), eq(1L), any(Date.class)))
                .thenReturn(REFRESH_TOKEN);
        when(cusSessionService.hashRefreshToken(REFRESH_TOKEN)).thenReturn(REFRESH_HASH);
    }

    private CusOtpVerifyResponse verifyOtpForSetup() {
        stubChallengeLookup();
        stubCredentialsLookup();
        when(passwordEncoder.matches(OTP, OTP_HASH)).thenReturn(true);
        return service.verifyLoginOtp(verifyRequest(OTP));
    }

    private void assertSetupFlags(CusOtpVerifyResponse response, boolean passwordChange, boolean pinSetup) {
        assertTrue(response.isSuccess());
        assertTrue(response.isFirstLoginSetupRequired());
        assertEquals(passwordChange, response.isPasswordChangeRequired());
        assertEquals(pinSetup, response.isPinSetupRequired());
        assertNull(response.getAccessToken());
        assertNull(response.getRefreshToken());
        assertEquals(OtpStatus.CONSUMED, challenge.getStatus());
        verify(otpChallengesRepository).save(challenge);
        verify(credentialsRepository, never()).save(any());
        assertNoTokensOrSessions();
    }

    private void assertFreshOtp(OtpChallenge otp, int resendNo) {
        assertSame(customer, otp.getCustomer());
        assertNull(otp.getCorporateUser());
        assertEquals(OtpSubjectType.CUSTOMER, otp.getSubjectType());
        assertEquals(OtpPurpose.LOGIN, otp.getPurpose());
        assertEquals(DeliveryChannel.EMAIL, otp.getDeliveryChannel());
        assertEquals(OtpStatus.ACTIVE, otp.getStatus());
        assertEquals(0, otp.getAttemptCount());
        assertEquals(5, otp.getMaxAttempts());
        assertEquals(resendNo, otp.getResendNo());
        assertEquals(5, otp.getMaxResendAttempts());
        assertEquals(otp.getLastSentAt().plusMinutes(5), otp.getExpiresAt());
        assertEquals("encoded-otp-" + nextOtpHash, otp.getOtpHash());
        assertEquals(UpdatedByType.CUSTOMER, otp.getUpdatedByType());
        assertEquals(CUSTOMER_ID, otp.getUpdatedById());
    }

    private void assertGeneratedOtpDelivered() {
        ArgumentCaptor<String> rawOtp = ArgumentCaptor.forClass(String.class);
        verify(passwordEncoder).encode(rawOtp.capture());
        assertTrue(rawOtp.getValue().matches("[1-9]\\d{5}"));
        assertNotEquals(rawOtp.getValue(), challenge.getOtpHash());
        verify(cusEmailService).sendLoginOtp(EMAIL, rawOtp.getValue());
    }

    private void assertMockSessionIssued() {
        ArgumentCaptor<AuthSession> sessions = ArgumentCaptor.forClass(AuthSession.class);
        verify(authSessionsRepository).save(sessions.capture());
        AuthSession session = sessions.getValue();
        assertSame(customer, session.getCustomer());
        assertNull(session.getCorporateUser());
        assertNull(session.getStaff());
        assertEquals(SessionSubjectType.CUSTOMER, session.getSubjectType());
        assertEquals(REFRESH_HASH, session.getRefreshTokenHash());
        assertEquals(1L, session.getTokenVersionAtIssue());
        assertEquals(session.getIssuedAt().plusHours(24), session.getRefreshExpiresAt());
        assertEquals(session.getIssuedAt(), session.getLastSeenAt());
        assertEquals(session.getIssuedAt(), credentials.getLastLoginAt());
        assertEquals(5, session.getIdleTimeoutMinutes());
        assertDoesNotThrow(() -> UUID.fromString(session.getSessionUuid()));
        verify(cusJwtService).generateAccessToken(CUSTOMER_ID, session.getSessionUuid(), 1L);
        verify(cusJwtService).generateRefreshToken(CUSTOMER_ID, session.getSessionUuid(), 1L,
                Date.from(session.getRefreshExpiresAt().atZone(ZoneId.systemDefault()).toInstant()));
        LoginAttempt attempt = capturedAttempt();
        assertTrue(attempt.isSuccess());
        assertSame(customer, attempt.getCustomer());
        assertEquals(CUSTOMER_CODE, attempt.getLoginIdentifier());
    }

    private LoginAttempt capturedAttempt() {
        ArgumentCaptor<LoginAttempt> attempts = ArgumentCaptor.forClass(LoginAttempt.class);
        verify(loginAttemptsRepository).save(attempts.capture());
        return attempts.getValue();
    }

    private void assertAuditAction(String action) {
        ArgumentCaptor<AuditLogs> audits = ArgumentCaptor.forClass(AuditLogs.class);
        verify(auditLogsRepository, atLeastOnce()).save(audits.capture());
        assertTrue(audits.getAllValues().stream().anyMatch(audit -> action.equals(audit.getActionType())));
    }

    private void assertNoTokensOrSessions() {
        verifyNoInteractions(cusJwtService, cusSessionService, authSessionsRepository);
    }

    private static void assertBetween(LocalDateTime actual, LocalDateTime earliest, LocalDateTime latest) {
        assertNotNull(actual);
        assertFalse(actual.isBefore(earliest));
        assertFalse(actual.isAfter(latest));
    }

    private static CusLoginRequest loginRequest(String identifier, String password) {
        CusLoginRequest request = new CusLoginRequest();
        request.setLoginIdentifier(identifier);
        request.setPassword(password);
        return request;
    }

    private static CusOtpVerifyRequest verifyRequest(String rawOtp) {
        CusOtpVerifyRequest request = new CusOtpVerifyRequest();
        request.setChallengeGroupId(GROUP_ID);
        request.setOtp(rawOtp);
        return request;
    }

    private static CusOtpResendRequest resendRequest() {
        CusOtpResendRequest request = new CusOtpResendRequest();
        request.setChallengeGroupId(GROUP_ID);
        return request;
    }
}
