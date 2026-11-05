package com.corebanking.service;

import com.corebanking.dto.CusLoginRequest;
import com.corebanking.dto.CusLoginResponse;
import com.corebanking.dto.CusOtpResendRequest;
import com.corebanking.dto.CusOtpResendResponse;
import com.corebanking.dto.CusOtpVerifyRequest;
import com.corebanking.dto.CusOtpVerifyResponse;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.entity.Accounts;
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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionAttribute;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Single-threaded service regressions with synthetic in-memory mock fixtures.
 * No Spring context, database, SMTP or JWT signing. Repository call order and
 * transaction metadata are checked; real commits, rollbacks, isolation and
 * concurrent exclusion still require an isolated database integration suite.
 */
@ExtendWith(MockitoExtension.class)
class CusCustomerLoginSecurityRegressionTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("33333333-3333-3333-3333-333333333333");
    private static final String CODE = "CUS-REGRESSION-001";
    private static final String ACCOUNT = "REGRESSION-ACCOUNT-001";
    private static final String EMAIL = "regression.customer@example.test";
    private static final String PASSWORD = "OldPass1!";
    private static final String NEW_PASSWORD = "NewPass1!";
    private static final String PASSWORD_HASH = "synthetic-password-hash";
    private static final String PIN = "246810";
    private static final String OTP = "123456";
    private static final String WRONG_OTP = "000000";
    private static final String GROUP_A = "44444444-4444-4444-4444-444444444444";
    private static final String GROUP_B = "55555555-5555-5555-5555-555555555555";

    @Mock private CusCustomerRepository customerRepository;
    @Mock private CusAccountsRepository accountsRepository;
    @Mock private CusCredentialsRepository credentialsRepository;
    @Mock private CusLoginAttemptsRepository loginAttemptsRepository;
    @Mock private CusOtpChallengesRepository otpChallengesRepository;
    @Mock private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;
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
    private final List<OtpChallenge> rows = new ArrayList<>();
    private long nextId;
    private int nextHash;

    @BeforeEach
    void setUp() {
        service = new CusAuthService(customerRepository, accountsRepository, credentialsRepository,
                new CusCustomerLoginAttemptService(loginAttemptsRepository), otpChallengesRepository,
                passwordEncoder, authSessionsRepository, cusJwtService, cusSessionService,
                jwtRevokedTokensRepository, cusEmailService, auditLogsRepository, null, null, null);
        ReflectionTestUtils.setField(service, "entityManager", entityManager);
        customer = Customers.builder().customerId(CUSTOMER_ID).customerCode(CODE)
                .customerType(CustomerType.PERSONAL).status(CustomerStatus.ACTIVE).email(EMAIL).build();
        credentials = CustomerCredentials.builder().customerId(CUSTOMER_ID).customer(customer)
                .passwordHash(PASSWORD_HASH).mustChangePassword(true).transactionPinHash(null).build();
        rows.clear();
        nextId = 100;
    }

    @Test
    void loginAThenLoginBLeavesOnlyTheNewOriginalGroupActive() {
        stubLoginState();

        CusLoginResponse a = login();
        CusLoginResponse b = login();

        assertNotEquals(a.getChallengeGroupId(), b.getChallengeGroupId());
        assertEquals(OtpStatus.EXPIRED, latest(a.getChallengeGroupId()).orElseThrow().getStatus());
        assertEquals(OtpStatus.ACTIVE, latest(b.getChallengeGroupId()).orElseThrow().getStatus());
        assertEquals(1, rows.stream().filter(row -> row.getStatus() == OtpStatus.ACTIVE).count());
        assertTrue(rows.stream().allMatch(row -> row.getResendNo() == 0));
        verify(credentialsRepository, times(2)).findByCustomerIdForUpdate(CUSTOMER_ID);
        assertNoSession();
    }

    @Test
    void oldGroupResendAfterTwoLoginsIsRejectedWithoutEmailAndCurrentGroupCanResend() {
        stubLoginState();
        String a = login().getChallengeGroupId();
        String b = login().getChallengeGroupId();

        assertSuperseded(() -> service.resendLoginOtp(resend(a)));

        assertEquals(2, rows.size());
        verify(cusEmailService, times(2)).sendLoginOtp(eq(EMAIL), anyString());
        CusOtpResendResponse response = service.resendLoginOtp(resend(b));
        assertEquals(b, response.getChallengeGroupId());
        assertEquals(1, response.getResendNo());
        assertEquals(3, rows.size());
        assertNoSession();
    }

    @Test
    void oldGroupVerificationCannotIssueSessionWhileCurrentGroupStillVerifies() {
        stubLoginState();
        String a = login().getChallengeGroupId();
        String b = login().getChallengeGroupId();

        assertSuperseded(() -> service.verifyLoginOtp(verifyRequest(a, OTP)));
        assertNoSession();
        credentials.setMustChangePassword(false);
        credentials.setTransactionPinHash("existing-pin-hash");
        stubSuccessfulVerification(b);
        stubTokens();

        CusOtpVerifyResponse response = service.verifyLoginOtp(verifyRequest(b, OTP));

        assertEquals("synthetic-access-token", response.getAccessToken());
        assertEquals(OtpStatus.CONSUMED, latest(b).orElseThrow().getStatus());
        verify(authSessionsRepository).save(any(AuthSession.class));
    }

    @Test
    void verifiedGroupAThenNewLoginCannotChangePasswordUsingA() {
        stubLoginState();
        String a = login().getChallengeGroupId();
        stubSuccessfulVerification(a);
        assertTrue(service.verifyLoginOtp(verifyRequest(a, OTP)).isFirstLoginSetupRequired());
        login();

        assertSuperseded(() -> service.changeFirstLoginPassword(a, NEW_PASSWORD, NEW_PASSWORD));

        assertEquals(PASSWORD_HASH, credentials.getPasswordHash());
        assertTrue(credentials.isMustChangePassword());
        verify(passwordEncoder, never()).encode(NEW_PASSWORD);
        assertNoSession();
    }

    @Test
    void verifiedGroupAThenNewLoginCannotSetPinOrIssueSessionUsingA() {
        stubLoginState();
        String a = login().getChallengeGroupId();
        stubSuccessfulVerification(a);
        service.verifyLoginOtp(verifyRequest(a, OTP));
        login();
        credentials.setMustChangePassword(false);

        assertSuperseded(() -> service.setupTransactionPin(a, PIN, PIN));

        assertNull(credentials.getTransactionPinHash());
        verify(passwordEncoder, never()).encode(PIN);
        assertNoSession();
    }

    @Test
    void currentGroupPasswordThenPinSetupWorksAndCompletionReplayCannotIssueSecondSession() {
        stubLoginState();
        String group = login().getChallengeGroupId();
        stubSuccessfulVerification(group);
        when(passwordEncoder.matches(NEW_PASSWORD, PASSWORD_HASH)).thenReturn(false);
        stubTokens();

        CusOtpVerifyResponse verified = service.verifyLoginOtp(verifyRequest(group, OTP));
        assertTrue(verified.isPasswordChangeRequired());
        assertTrue(verified.isPinSetupRequired());
        assertNoSession();
        service.changeFirstLoginPassword(group, NEW_PASSWORD, NEW_PASSWORD);
        assertFalse(credentials.isMustChangePassword());
        assertEquals(OtpStatus.CONSUMED, latest(group).orElseThrow().getStatus());
        assertNoSession();
        CusTokenResponse response = service.setupTransactionPin(group, PIN, PIN);

        assertEquals("synthetic-access-token", response.getAccessToken());
        assertNotNull(credentials.getTransactionPinHash());
        assertThrows(CusValidationException.class, () -> service.setupTransactionPin(group, PIN, PIN));
        assertThrows(CusValidationException.class,
                () -> service.changeFirstLoginPassword(group, NEW_PASSWORD, NEW_PASSWORD));
        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(group, OTP)));
        assertThrows(CusOtpException.class, () -> service.resendLoginOtp(resend(group)));
        verify(authSessionsRepository).save(any(AuthSession.class));
        verify(cusJwtService).generateAccessToken(eq(CUSTOMER_ID), anyString(), eq(1L));
        ArgumentCaptor<LoginAttempt> attempts = ArgumentCaptor.forClass(LoginAttempt.class);
        verify(loginAttemptsRepository).save(attempts.capture());
        assertTrue(attempts.getValue().isSuccess());
    }

    @Test
    void expiredCurrentOriginalCanBeResentWithoutReactivatingTheOldRecord() {
        stubChallengeState();
        OtpChallenge original = addChallenge(GROUP_A, 10, 0, OtpStatus.EXPIRED);
        original.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        CusOtpResendResponse response = service.resendLoginOtp(resend(GROUP_A));

        OtpChallenge replacement = latest(GROUP_A).orElseThrow();
        assertEquals(1, response.getResendNo());
        assertEquals(OtpStatus.EXPIRED, original.getStatus());
        assertNotSame(original, replacement);
        assertFreshReplacement(replacement, 1);
    }

    @Test
    void blockedCurrentOtpCanBeResentWithAFreshAttemptBudget() {
        stubChallengeState();
        OtpChallenge blocked = addChallenge(GROUP_A, 10, 0, OtpStatus.BLOCKED);
        blocked.setAttemptCount(5);

        service.resendLoginOtp(resend(GROUP_A));

        assertNotSame(blocked, latest(GROUP_A).orElseThrow());
        assertNotEquals(OtpStatus.ACTIVE, blocked.getStatus());
        assertEquals(5, blocked.getAttemptCount());
        assertFreshReplacement(latest(GROUP_A).orElseThrow(), 1);
    }

    @Test
    void fifthReplacementAllowsFiveAttemptsAndSixthResendIsRejected() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 0, OtpStatus.ACTIVE);
        for (int resendNo = 1; resendNo <= 5; resendNo++) {
            assertEquals(resendNo, service.resendLoginOtp(resend(GROUP_A)).getResendNo());
            assertFreshReplacement(latest(GROUP_A).orElseThrow(), resendNo);
        }
        OtpChallenge fifth = latest(GROUP_A).orElseThrow();
        when(passwordEncoder.matches(WRONG_OTP, fifth.getOtpHash())).thenReturn(false);
        when(credentialsRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
        when(passwordEncoder.matches(OTP, fifth.getOtpHash())).thenReturn(true);

        assertThrows(CusOtpResendLimitException.class, () -> service.resendLoginOtp(resend(GROUP_A)));
        assertEquals(OtpStatus.ACTIVE, fifth.getStatus());
        for (int attempt = 1; attempt <= 4; attempt++) {
            assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(GROUP_A, WRONG_OTP)));
            assertEquals(attempt, fifth.getAttemptCount());
            assertEquals(OtpStatus.ACTIVE, fifth.getStatus());
        }
        assertTrue(service.verifyLoginOtp(verifyRequest(GROUP_A, OTP)).isSuccess());
        assertEquals(OtpStatus.CONSUMED, fifth.getStatus());
        assertEquals(5, fifth.getResendNo());
        verify(cusEmailService, times(5)).sendLoginOtp(eq(EMAIL), anyString());
        assertNoSession();
    }

    @Test
    void fiveWrongOtpsBlockOnlyThatRecordAndResendDoesNotResetGroupCounter() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 0, OtpStatus.EXPIRED);
        OtpChallenge otp = addChallenge(GROUP_A, 11, 2, OtpStatus.ACTIVE);
        when(passwordEncoder.matches(WRONG_OTP, otp.getOtpHash())).thenReturn(false);
        for (int attempt = 1; attempt <= 5; attempt++) {
            assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(GROUP_A, WRONG_OTP)));
        }
        assertEquals(5, otp.getAttemptCount());
        assertEquals(OtpStatus.BLOCKED, otp.getStatus());
        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(GROUP_A, OTP)));
        service.resendLoginOtp(resend(GROUP_A));

        assertFreshReplacement(latest(GROUP_A).orElseThrow(), 3);
        verify(passwordEncoder, times(5)).matches(WRONG_OTP, otp.getOtpHash());
    }

    @Test
    void newerResendRowInOldGroupCannotDisplaceTheCurrentOriginalGroup() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 0, OtpStatus.EXPIRED);
        addChallenge(GROUP_B, 20, 0, OtpStatus.ACTIVE);
        // Simulate legacy bad state: the newest row belongs to superseded A.
        addChallenge(GROUP_A, 1000, 1, OtpStatus.ACTIVE);

        assertSuperseded(() -> service.resendLoginOtp(resend(GROUP_A)));
        assertSuperseded(() -> service.verifyLoginOtp(verifyRequest(GROUP_A, OTP)));
        verifyNoInteractions(cusEmailService);
        assertEquals(1, service.resendLoginOtp(resend(GROUP_B)).getResendNo());
        assertEquals(OtpStatus.ACTIVE, latest(GROUP_B).orElseThrow().getStatus());
        assertNoSession();
    }

    @Test
    void inactiveCustomerCannotVerifyAnOtp() {
        stubChallengeState();
        OtpChallenge otp = addChallenge(GROUP_A, 10, 0, OtpStatus.ACTIVE);
        customer.setStatus(CustomerStatus.INACTIVE);

        assertThrows(CusAuthenticationException.class, () -> service.verifyLoginOtp(verifyRequest(GROUP_A, OTP)));

        assertEquals(OtpStatus.ACTIVE, otp.getStatus());
        assertNull(otp.getConsumedAt());
        assertNoOtpWritesOrDelivery();
        assertNoSession();
    }

    @Test
    void inactiveCustomerCannotResendAnOtp() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 0, OtpStatus.ACTIVE);
        customer.setStatus(CustomerStatus.INACTIVE);

        assertThrows(CusAuthenticationException.class, () -> service.resendLoginOtp(resend(GROUP_A)));

        assertNoOtpWritesOrDelivery();
        assertNoSession();
    }

    @Test
    void inactiveCustomerCannotChangeFirstLoginPassword() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 0, OtpStatus.CONSUMED);
        customer.setStatus(CustomerStatus.INACTIVE);

        assertThrows(CusAuthenticationException.class,
                () -> service.changeFirstLoginPassword(GROUP_A, NEW_PASSWORD, NEW_PASSWORD));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
        assertNoSession();
    }

    @Test
    void inactiveCustomerCannotSetFirstLoginPin() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 0, OtpStatus.CONSUMED);
        credentials.setMustChangePassword(false);
        customer.setStatus(CustomerStatus.INACTIVE);

        assertThrows(CusAuthenticationException.class, () -> service.setupTransactionPin(GROUP_A, PIN, PIN));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
        assertNoSession();
    }

    @Test
    void consumedAtPreventsResendEvenIfStatusWasIncorrectlyLeftActive() {
        stubChallengeState();
        OtpChallenge otp = addChallenge(GROUP_A, 10, 0, OtpStatus.ACTIVE);
        otp.setConsumedAt(LocalDateTime.now());

        assertThrows(CusOtpException.class, () -> service.resendLoginOtp(resend(GROUP_A)));
        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(GROUP_A, OTP)));

        assertNoOtpWritesOrDelivery();
        verifyNoInteractions(passwordEncoder);
        assertNoSession();
    }

    @Test
    void setupStillExpiresTenMinutesAfterConsumption() {
        stubChallengeState();
        OtpChallenge otp = addChallenge(GROUP_A, 10, 0, OtpStatus.CONSUMED);
        otp.setConsumedAt(LocalDateTime.now().minusMinutes(11));

        assertThrows(CusSessionExpiredException.class,
                () -> service.changeFirstLoginPassword(GROUP_A, NEW_PASSWORD, NEW_PASSWORD));
        assertThrows(CusSessionExpiredException.class, () -> service.setupTransactionPin(GROUP_A, PIN, PIN));

        verify(credentialsRepository, never()).save(any());
        assertNoSession();
    }

    @Test
    void verificationDiscardsProvisionalStateAndLocksCredentialThenOriginalThenRequestedOtp() {
        stubChallengeState();
        OtpChallenge otp = addChallenge(GROUP_A, 10, 0, OtpStatus.ACTIVE);
        otp.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(GROUP_A, OTP)));

        assertLockOrder(GROUP_A);
    }

    @Test
    void resendUsesTheSameCredentialFirstLockOrder() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 0, OtpStatus.ACTIVE);

        service.resendLoginOtp(resend(GROUP_A));

        assertLockOrder(GROUP_A);
    }

    @Test
    void passwordSetupUsesTheSameCredentialFirstLockOrder() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 0, OtpStatus.ACTIVE);

        assertThrows(CusOtpException.class,
                () -> service.changeFirstLoginPassword(GROUP_A, NEW_PASSWORD, NEW_PASSWORD));

        assertLockOrder(GROUP_A);
    }

    @Test
    void pinSetupUsesTheSameCredentialFirstLockOrder() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 0, OtpStatus.ACTIVE);

        assertThrows(CusOtpException.class, () -> service.setupTransactionPin(GROUP_A, PIN, PIN));

        assertLockOrder(GROUP_A);
    }

    @Test
    void authoritativeConsumedStateOverridesTheProvisionalActiveChallenge() {
        stubChallengeState();
        OtpChallenge authoritative = addChallenge(GROUP_A, 10, 0, OtpStatus.CONSUMED);
        OtpChallenge stale = OtpChallenge.builder().customer(customer).subjectType(OtpSubjectType.CUSTOMER)
                .purpose(OtpPurpose.LOGIN).challengeGroupId(GROUP_A).status(OtpStatus.ACTIVE).build();
        when(otpChallengesRepository.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                GROUP_A, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(stale));

        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(GROUP_A, OTP)));

        assertEquals(OtpStatus.CONSUMED, authoritative.getStatus());
        verify(entityManager).clear();
        assertNoOtpWritesOrDelivery();
        assertNoSession();
    }

    @Test
    void authoritativeForeignOwnerCannotBeUsedWithTheResolvedCredentialLock() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 0, OtpStatus.ACTIVE);
        OtpChallenge foreign = OtpChallenge.builder().subjectType(OtpSubjectType.CUSTOMER)
                .purpose(OtpPurpose.LOGIN).customer(Customers.builder().customerId(UUID.randomUUID()).build()).build();
        when(otpChallengesRepository.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                GROUP_A, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(foreign));

        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(GROUP_A, OTP)));

        assertNoOtpWritesOrDelivery();
        assertNoSession();
    }

    @Test
    void missingCurrentOriginalRejectsTheGroupEvenIfAReplacementExists() {
        stubChallengeState();
        addChallenge(GROUP_A, 10, 1, OtpStatus.ACTIVE);

        assertThrows(CusOtpException.class, () -> service.resendLoginOtp(resend(GROUP_A)));
        assertThrows(CusOtpException.class, () -> service.verifyLoginOtp(verifyRequest(GROUP_A, OTP)));

        assertNoOtpWritesOrDelivery();
        assertNoSession();
    }

    @Test
    void customerCodeAndAccountNumberShareTheFiveWrongPasswordLock() {
        when(customerRepository.findByCustomerCode(CODE)).thenReturn(Optional.of(customer));
        when(customerRepository.findByCustomerCode(ACCOUNT)).thenReturn(Optional.empty());
        when(accountsRepository.findByAccountNumber(ACCOUNT))
                .thenReturn(Optional.of(Accounts.builder().accountNumber(ACCOUNT).customer(customer).build()));
        when(credentialsRepository.findByCustomerIdForUpdate(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
        when(passwordEncoder.matches("incorrect", PASSWORD_HASH)).thenReturn(false);

        for (int attempt = 1; attempt <= 4; attempt++) {
            String identifier = attempt % 2 == 0 ? ACCOUNT : CODE;
            assertThrows(CusAuthenticationException.class,
                    () -> service.authenticateCredentials(loginRequest(identifier, "incorrect")));
            assertEquals(attempt, credentials.getFailedLoginCount());
        }
        LocalDateTime before = LocalDateTime.now();
        assertThrows(CusAccountLockedException.class,
                () -> service.authenticateCredentials(loginRequest(ACCOUNT, "incorrect")));

        assertEquals(5, credentials.getFailedLoginCount());
        assertFalse(credentials.getLockedUntil().isBefore(before.plusMinutes(15)));
        assertFalse(credentials.getLockedUntil().isAfter(LocalDateTime.now().plusMinutes(15)));
        verify(credentialsRepository, times(5)).findByCustomerIdForUpdate(CUSTOMER_ID);
        verify(credentialsRepository, times(5)).save(credentials);
        ArgumentCaptor<LoginAttempt> attempts = ArgumentCaptor.forClass(LoginAttempt.class);
        verify(loginAttemptsRepository, times(5)).save(attempts.capture());
        assertEquals("ACCOUNT_LOCKED", attempts.getAllValues().getLast().getFailureReason());
        assertTrue(attempts.getAllValues().stream().noneMatch(LoginAttempt::isSuccess));
        verifyNoInteractions(otpChallengesRepository, cusEmailService);
    }

    @Test
    void loginRevalidatesCustomerStatusFromTheLockedCredentialOwner() {
        Customers initial = Customers.builder().customerId(CUSTOMER_ID).status(CustomerStatus.ACTIVE).build();
        when(customerRepository.findByCustomerCode(CODE)).thenReturn(Optional.of(initial));
        customer.setStatus(CustomerStatus.INACTIVE);
        when(credentialsRepository.findByCustomerIdForUpdate(CUSTOMER_ID)).thenReturn(Optional.of(credentials));

        assertThrows(CusAuthenticationException.class, this::login);

        verify(entityManager).clear();
        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, otpChallengesRepository, cusEmailService);
    }

    @Test
    void resendDeliveryFailureLeavesReplacementExpiredAndPreservesResendNumber() {
        stubChallengeState();
        OtpChallenge original = addChallenge(GROUP_A, 10, 0, OtpStatus.ACTIVE);
        doThrow(new MailSendException("Synthetic delivery failure"))
                .when(cusEmailService).sendLoginOtp(eq(EMAIL), anyString());

        assertThrows(CusEmailException.class, () -> service.resendLoginOtp(resend(GROUP_A)));

        OtpChallenge replacement = latest(GROUP_A).orElseThrow();
        assertEquals(OtpStatus.EXPIRED, original.getStatus());
        assertEquals(OtpStatus.EXPIRED, replacement.getStatus());
        assertEquals(1, replacement.getResendNo());
        assertNoSession();
    }

    @Test
    void passwordTransactionMetadataCommitsExpectedFailureUpdates() throws Exception {
        TransactionAttribute tx = transaction("authenticateCredentials", CusLoginRequest.class);
        assertEquals(TransactionDefinition.PROPAGATION_REQUIRES_NEW, tx.getPropagationBehavior());
        assertFalse(tx.isReadOnly());
        assertFalse(tx.rollbackOn(new CusAuthenticationException("synthetic")));
        assertFalse(tx.rollbackOn(new CusAccountLockedException("synthetic")));
        assertFalse(tx.rollbackOn(new CusEmailException("synthetic")));
        assertTrue(tx.rollbackOn(new CusValidationException("synthetic")));
        assertTrue(tx.rollbackOn(new IllegalStateException("synthetic persistence failure")));
    }

    @Test
    void otpTransactionMetadataRetainsFailureWritesAndSessionAtomicity() throws Exception {
        TransactionAttribute verify = transaction("verifyLoginOtp", CusOtpVerifyRequest.class);
        assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, verify.getPropagationBehavior());
        assertFalse(verify.isReadOnly());
        assertFalse(verify.rollbackOn(new CusOtpException("synthetic")));
        assertTrue(verify.rollbackOn(new IllegalStateException("synthetic JWT failure")));
        TransactionAttribute resend = transaction("resendLoginOtp", CusOtpResendRequest.class);
        assertFalse(resend.isReadOnly());
        assertFalse(resend.rollbackOn(new CusEmailException("synthetic")));
    }

    @Test
    void firstLoginTransactionMetadataKeepsSetupAndSessionInTheSameTransaction() throws Exception {
        TransactionAttribute password = transaction("changeFirstLoginPassword", String.class, String.class, String.class);
        TransactionAttribute pin = transaction("setupTransactionPin", String.class, String.class, String.class);
        assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, password.getPropagationBehavior());
        assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, pin.getPropagationBehavior());
        assertFalse(pin.isReadOnly());
        assertTrue(pin.rollbackOn(new IllegalStateException("synthetic JWT failure")));
    }

    @Test
    void extractedHistoryWriterAddsNoTransactionBoundaryOrRollbackRules() throws Exception {
        var source = new AnnotationTransactionAttributeSource();
        assertNull(source.getTransactionAttribute(CusCustomerLoginAttemptService.class.getMethod(
                "saveLoginAttempt", String.class, Customers.class, boolean.class, String.class),
                CusCustomerLoginAttemptService.class));
        assertNull(source.getTransactionAttribute(CusCustomerLoginAttemptService.class.getMethod(
                "saveInvalidLoginAttempt", String.class, String.class), CusCustomerLoginAttemptService.class));
        Object writer = ReflectionTestUtils.getField(service, "customerLoginAttemptService");
        assertInstanceOf(CusCustomerLoginAttemptService.class, writer);
        assertFalse(mockingDetails(writer).isMock());
        assertSame(loginAttemptsRepository, ReflectionTestUtils.getField(writer, "loginAttemptsRepository"));
        // The existing facade metadata tests retain transaction ownership.
    }

    private void stubLoginState() {
        stubChallengeState();
        when(customerRepository.findByCustomerCode(CODE)).thenReturn(Optional.of(customer));
        when(passwordEncoder.matches(PASSWORD, PASSWORD_HASH)).thenReturn(true);
        when(otpChallengesRepository.findByCustomerAndSubjectTypeAndPurposeAndStatus(
                customer, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, OtpStatus.ACTIVE))
                .thenAnswer(invocation -> rows.stream().filter(row -> row.getStatus() == OtpStatus.ACTIVE).toList());
    }

    private void stubChallengeState() {
        // Shared mock fixture responses may not all be used by rejection paths.
        // This is single-threaded fixture storage, not a database/lock emulator.
        lenient().when(credentialsRepository.findByCustomerIdForUpdate(CUSTOMER_ID))
                .thenReturn(Optional.of(credentials));
        lenient().when(otpChallengesRepository
                .findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(
                        CUSTOMER_ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0))
                .thenAnswer(invocation -> rows.stream()
                        .filter(row -> row.getResendNo() == 0)
                        .filter(row -> row.getSubjectType() == OtpSubjectType.CUSTOMER)
                        .filter(row -> row.getPurpose() == OtpPurpose.LOGIN)
                        .filter(row -> row.getCustomer() != null && CUSTOMER_ID.equals(row.getCustomer().getCustomerId()))
                        .max(Comparator.comparing(OtpChallenge::getOtpId)));
        lenient().when(otpChallengesRepository.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                anyString(), eq(OtpSubjectType.CUSTOMER), eq(OtpPurpose.LOGIN)))
                .thenAnswer(invocation -> latest(invocation.getArgument(0)));
        lenient().when(otpChallengesRepository.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                anyString(), eq(OtpSubjectType.CUSTOMER), eq(OtpPurpose.LOGIN)))
                .thenAnswer(invocation -> latest(invocation.getArgument(0)));
        lenient().when(passwordEncoder.encode(anyString())).thenAnswer(invocation -> "synthetic-encoded-" + ++nextHash);
        lenient().when(otpChallengesRepository.save(any(OtpChallenge.class))).thenAnswer(invocation -> {
            OtpChallenge row = invocation.getArgument(0);
            if (row.getOtpId() == null) {
                row.setOtpId(++nextId);
                rows.add(row);
            }
            return row;
        });
    }

    private void stubSuccessfulVerification(String group) {
        when(credentialsRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
        when(passwordEncoder.matches(OTP, latest(group).orElseThrow().getOtpHash())).thenReturn(true);
    }

    private void stubTokens() {
        when(cusJwtService.generateAccessToken(eq(CUSTOMER_ID), anyString(), eq(1L)))
                .thenReturn("synthetic-access-token");
        when(cusJwtService.generateRefreshToken(eq(CUSTOMER_ID), anyString(), eq(1L), any(Date.class)))
                .thenReturn("synthetic-refresh-token");
        when(cusSessionService.hashRefreshToken("synthetic-refresh-token")).thenReturn("synthetic-refresh-hash");
    }

    private OtpChallenge addChallenge(String group, long id, int resendNo, OtpStatus status) {
        LocalDateTime now = LocalDateTime.now();
        OtpChallenge row = OtpChallenge.builder().otpId(id).customer(customer)
                .subjectType(OtpSubjectType.CUSTOMER).purpose(OtpPurpose.LOGIN).deliveryChannel(DeliveryChannel.EMAIL)
                .challengeGroupId(group).otpHash("synthetic-otp-hash-" + id).status(status)
                .resendNo(resendNo).maxResendAttempts(5).attemptCount(0).maxAttempts(5)
                .lastSentAt(now).expiresAt(now.plusMinutes(5))
                .consumedAt(status == OtpStatus.CONSUMED ? now : null).build();
        rows.add(row);
        nextId = Math.max(nextId, id);
        return row;
    }

    private Optional<OtpChallenge> latest(String group) {
        return rows.stream().filter(row -> group.equals(row.getChallengeGroupId()))
                .filter(row -> row.getSubjectType() == OtpSubjectType.CUSTOMER)
                .filter(row -> row.getPurpose() == OtpPurpose.LOGIN)
                .max(Comparator.comparing(OtpChallenge::getOtpId));
    }

    private void assertLockOrder(String group) {
        var order = inOrder(otpChallengesRepository, entityManager, credentialsRepository);
        order.verify(otpChallengesRepository).findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                group, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN);
        order.verify(entityManager).clear();
        order.verify(credentialsRepository).findByCustomerIdForUpdate(CUSTOMER_ID);
        order.verify(otpChallengesRepository)
                .findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(
                        CUSTOMER_ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0);
        order.verify(otpChallengesRepository).findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                group, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN);
    }

    private void assertFreshReplacement(OtpChallenge row, int resendNo) {
        assertEquals(OtpStatus.ACTIVE, row.getStatus());
        assertEquals(0, row.getAttemptCount());
        assertEquals(5, row.getMaxAttempts());
        assertEquals(5, row.getMaxResendAttempts());
        assertEquals(resendNo, row.getResendNo());
        assertEquals(row.getLastSentAt().plusMinutes(5), row.getExpiresAt());
        assertTrue(row.getExpiresAt().isAfter(LocalDateTime.now()));
        assertTrue(row.getOtpHash().startsWith("synthetic-encoded-"));
        assertEquals(OtpSubjectType.CUSTOMER, row.getSubjectType());
        assertNull(row.getCorporateUser());
    }

    private void assertSuperseded(org.junit.jupiter.api.function.Executable action) {
        CusOtpException error = assertThrows(CusOtpException.class, action);
        assertTrue(error.getMessage().contains("superseded"));
    }

    private void assertNoOtpWritesOrDelivery() {
        verify(otpChallengesRepository, never()).save(any());
        verify(otpChallengesRepository, never()).saveAll(any());
        verifyNoInteractions(cusEmailService);
    }

    private void assertNoSession() {
        verifyNoInteractions(cusJwtService, cusSessionService, authSessionsRepository);
    }

    private CusLoginResponse login() {
        return service.authenticateCredentials(loginRequest(CODE, PASSWORD));
    }

    private static CusLoginRequest loginRequest(String identifier, String password) {
        CusLoginRequest request = new CusLoginRequest();
        request.setLoginIdentifier(identifier);
        request.setPassword(password);
        return request;
    }

    private static CusOtpVerifyRequest verifyRequest(String group, String otp) {
        CusOtpVerifyRequest request = new CusOtpVerifyRequest();
        request.setChallengeGroupId(group);
        request.setOtp(otp);
        return request;
    }

    private static CusOtpResendRequest resend(String group) {
        CusOtpResendRequest request = new CusOtpResendRequest();
        request.setChallengeGroupId(group);
        return request;
    }

    private static TransactionAttribute transaction(String name, Class<?>... arguments) throws Exception {
        TransactionAttribute tx = new AnnotationTransactionAttributeSource().getTransactionAttribute(
                CusAuthService.class.getMethod(name, arguments), CusAuthService.class);
        assertNotNull(tx);
        return tx;
    }
}
