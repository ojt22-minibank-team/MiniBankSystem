package com.corebanking.service;

import com.corebanking.dto.CusOtpResendRequest;
import com.corebanking.dto.CusOtpResendResponse;
import com.corebanking.dto.CusPasswordResetConfirmRequest;
import com.corebanking.dto.CusPasswordResetOtpVerifyRequest;
import com.corebanking.dto.CusPasswordResetOtpVerifyResponse;
import com.corebanking.dto.CusPasswordResetRequest;
import com.corebanking.dto.CusPasswordResetStartResponse;
import com.corebanking.dto.CusPinResetConfirmRequest;
import com.corebanking.dto.CusPinResetOtpVerifyRequest;
import com.corebanking.dto.CusPinResetOtpVerifyResponse;
import com.corebanking.dto.CusPinResetStartResponse;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.DeliveryChannel;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.OtpSubjectType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
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
import io.jsonwebtoken.Claims;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mail.MailSendException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionAttribute;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Recovery characterization against the current working-tree implementation.
 * No Spring context, database, SMTP, JWT signing or persistent sessions.
 * Bulk-update row counts are mocked outcomes, not implementations of the JPQL.
 * Annotation assertions do not prove commits, rollback atomicity or locking.
 * Known gaps (binding lifetime, supersession and concurrent failed attempts)
 * deliberately have no tests asserting that their insecure outcome is correct.
 */
@ExtendWith(MockitoExtension.class)
class CusCustomerRecoveryBaselineTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    private static final String CODE = "CUS-RECOVERY-001";
    private static final String ACCOUNT = "RECOVERY-ACCOUNT-001";
    private static final String EMAIL = "recovery.customer@example.test";
    private static final String GROUP = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
    private static final String OTP = "123456";
    private static final String WRONG_OTP = "000000";
    private static final String OTP_HASH = "synthetic-existing-otp-hash";
    private static final String PASSWORD_HASH = "synthetic-existing-password-hash";
    private static final String PIN_HASH = "synthetic-existing-pin-hash";
    private static final String NEW_PASSWORD = "NewPass1!";
    private static final String NEW_PIN = "246810";
    private static final String NEW_PASSWORD_HASH = "synthetic-new-password-hash";
    private static final String NEW_PIN_HASH = "synthetic-new-pin-hash";
    private static final String ACCESS = "synthetic-recovery-access-token";
    private static final String AUTHORIZATION = "Bearer " + ACCESS;

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
    @Mock private Claims claims;
    @Mock private jakarta.persistence.EntityManager entityManager;
    @InjectMocks private CusCustomerPasswordResetService passwordResetService;
    @InjectMocks private CusCustomerPinResetService pinResetService;
    private CusAuthService service;

    private Customers customer;
    private CustomerCredentials credentials;
    private OtpChallenge challenge;
    private OtpChallenge latest;
    private AuthSession validatedSession;
    private LocalDateTime passwordLock;
    private long nextId;
    private int nextHash;

    @BeforeEach
    void fixtures() {
        org.springframework.test.util.ReflectionTestUtils.setField(passwordResetService, "entityManager", entityManager);
        org.springframework.test.util.ReflectionTestUtils.setField(pinResetService, "entityManager", entityManager);
        service = authFacade(passwordResetService);
        customer = Customers.builder().customerId(CUSTOMER_ID).customerCode(CODE)
                .customerType(CustomerType.PERSONAL).status(CustomerStatus.ACTIVE).email(EMAIL).build();
        passwordLock = LocalDateTime.now().plusMinutes(15);
        credentials = credentialsFixture();
        // In-memory identity fixture returned by the mocked session validator.
        validatedSession = AuthSession.builder().customer(customer)
                .subjectType(SessionSubjectType.CUSTOMER).build();
        nextId = 100;
        lenient().when(credentialsRepository.findByCustomerIdForUpdate(CUSTOMER_ID)).thenAnswer(call -> Optional.of(credentials));
        lenient().when(claims.getSubject()).thenReturn(CUSTOMER_ID.toString());
        lenient().when(entityManager.find(eq(CustomerCredentials.class), eq(CUSTOMER_ID), eq(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE))).thenAnswer(call -> credentials);
        lenient().when(entityManager.find(eq(Customers.class), eq(CUSTOMER_ID), eq(jakarta.persistence.LockModeType.PESSIMISTIC_READ))).thenAnswer(call -> customer);
        lenient().when(entityManager.find(eq(OtpChallenge.class), any(), eq(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE))).thenAnswer(call -> latest);
        lenient().when(otpChallengesRepository.findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                eq(CUSTOMER_ID), eq(OtpSubjectType.CUSTOMER), any(OtpPurpose.class))).thenAnswer(call -> Optional.ofNullable(latest));
    }

    @AfterEach
    void recoveryNeverCreatesSessionsTokensOrChangesPasswordLockout() {
        verifyNoInteractions(authSessionsRepository, jwtRevokedTokensRepository, loginAttemptsRepository);
        verify(cusJwtService, never()).generateAccessToken(any(), any(), anyLong());
        verify(cusJwtService, never()).generateRefreshToken(any(), any(), anyLong(), any(Date.class));
        assertEquals(3, credentials.getFailedLoginCount());
        assertEquals(passwordLock, credentials.getLockedUntil());
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void requestCreatesPurposeScopedHashedSixDigitEmailOtp(OtpPurpose purpose) {
        prepareRequest(purpose, List.of());
        LocalDateTime before = LocalDateTime.now();

        String responseGroup = requestReset(purpose);

        OtpChallenge saved = savedChallenge();
        assertEquals(responseGroup, saved.getChallengeGroupId());
        assertDoesNotThrow(() -> UUID.fromString(responseGroup));
        assertFreshOtp(saved, purpose, 0);
        assertBetween(saved.getLastSentAt(), before, LocalDateTime.now());
        verifyGeneratedDelivery(purpose, 1);
        assertAudit(purpose + "_OTP_SENT", ActorType.CUSTOMER);
        verify(otpChallengesRepository).saveAll(List.of());
        verify(credentialsRepository, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void requestExpiresExistingActiveChallengesOfTheSamePurpose(OtpPurpose purpose) {
        OtpChallenge previous = challenge(purpose);
        prepareRequest(purpose, List.of(previous));

        requestReset(purpose);

        assertEquals(OtpStatus.EXPIRED, previous.getStatus());
        assertEquals(UpdatedByType.CUSTOMER, previous.getUpdatedByType());
        assertEquals(CUSTOMER_ID, previous.getUpdatedById());
        assertNotSame(previous, savedChallenge());
        verify(otpChallengesRepository).findByCustomerAndPurposeAndStatus(customer, purpose, OtpStatus.ACTIVE);
        verify(otpChallengesRepository).saveAll(List.of(previous));
    }

    @Test
    void passwordResetRequestSupportsAccountNumberLookup() {
        when(customerRepository.findByCustomerCode(ACCOUNT)).thenReturn(Optional.empty());
        when(accountsRepository.findByAccountNumber(ACCOUNT))
                .thenReturn(Optional.of(Accounts.builder().accountNumber(ACCOUNT).customer(customer).build()));
        stubRequestOtpWrites(OtpPurpose.PASSWORD_RESET, List.of());

        assertTrue(service.requestPasswordReset(new CusPasswordResetRequest(ACCOUNT)).isSuccess());

        verify(accountsRepository).findByAccountNumber(ACCOUNT);
        assertSame(customer, savedChallenge().getCustomer());
    }

    @Test
    void unknownPasswordResetCustomerIsRejectedWithoutIssuingOtp() {
        when(customerRepository.findByCustomerCode(CODE)).thenReturn(Optional.empty());
        when(accountsRepository.findByAccountNumber(CODE)).thenReturn(Optional.empty());

        assertThrows(CusAuthenticationException.class,
                () -> service.requestPasswordReset(new CusPasswordResetRequest(CODE)));

        verifyNoInteractions(otpChallengesRepository, passwordEncoder, cusEmailService, auditLogsRepository);
    }

    @Test
    void passwordResetRequestRequiresAnIdentifier() {
        assertThrows(CusValidationException.class, () -> service.requestPasswordReset(null));
        assertThrows(CusValidationException.class,
                () -> service.requestPasswordReset(new CusPasswordResetRequest(" ")));
        verifyNoInteractions(customerRepository, accountsRepository, otpChallengesRepository, cusEmailService);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void requestRejectsInactiveCustomer(OtpPurpose purpose) {
        prepareRequestIdentity(purpose);
        customer.setStatus(CustomerStatus.INACTIVE);

        assertThrows(CusAuthenticationException.class, () -> requestReset(purpose));

        verifyNoInteractions(otpChallengesRepository, passwordEncoder, cusEmailService);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void requestRejectsMissingRegisteredEmail(OtpPurpose purpose) {
        prepareRequestIdentity(purpose);
        customer.setEmail(" ");

        if (purpose == OtpPurpose.PASSWORD_RESET) {
            assertThrows(CusValidationException.class, () -> requestReset(purpose));
        } else {
            assertThrows(CusEmailException.class, () -> requestReset(purpose));
        }
        verifyNoInteractions(otpChallengesRepository, passwordEncoder, cusEmailService);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void requestEmailFailureRequestsExpirationAndSystemAttribution(OtpPurpose purpose) {
        prepareRequest(purpose, List.of());
        failDelivery(purpose);

        assertThrows(CusEmailException.class, () -> requestReset(purpose));

        assertDeliveryFailure(purpose + "_OTP_SEND_FAILED");
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void resendExpiresPredecessorAndCreatesFreshSameGroupReplacement(OtpPurpose purpose) {
        prepareResend(purpose);
        OtpChallenge previous = challenge;
        previous.setAttemptCount(3);
        previous.setResendNo(2);

        CusOtpResendResponse response = resendReset(purpose, resendRequest());

        assertTrue(response.isSuccess());
        assertEquals(GROUP, response.getChallengeGroupId());
        assertEquals(3, response.getResendNo());
        assertEquals(OtpStatus.EXPIRED, previous.getStatus());
        assertNotSame(previous, latest);
        assertFreshOtp(latest, purpose, 3);
        assertFalse(previous.getOtpHash().equals(latest.getOtpHash()));
        verifyGeneratedDelivery(purpose, 1);
        assertAudit(purpose + "_OTP_RESENT", ActorType.CUSTOMER);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void normallyExpiredCurrentResetOtpCanBeResent(OtpPurpose purpose) {
        prepareResend(purpose);
        OtpChallenge previous = challenge;
        previous.setStatus(OtpStatus.EXPIRED);
        previous.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        resendReset(purpose, resendRequest());

        assertEquals(OtpStatus.EXPIRED, previous.getStatus());
        assertNotSame(previous, latest);
        assertFreshOtp(latest, purpose, 1);
        verify(otpChallengesRepository, never()).save(previous);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void blockedCurrentResetOtpGetsANewRecordAndFreshAttemptBudget(OtpPurpose purpose) {
        prepareResend(purpose);
        OtpChallenge previous = challenge;
        previous.setStatus(OtpStatus.BLOCKED);
        previous.setAttemptCount(5);
        previous.setResendNo(3);

        resendReset(purpose, resendRequest());

        assertEquals(OtpStatus.BLOCKED, previous.getStatus());
        assertEquals(5, previous.getAttemptCount());
        assertFreshOtp(latest, purpose, 4);
        verify(otpChallengesRepository, never()).save(previous);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void consumedResetOtpCannotBeResent(OtpPurpose purpose) {
        prepareLookup(purpose);
        challenge.setStatus(OtpStatus.CONSUMED);
        challenge.setConsumedAt(LocalDateTime.now());

        assertThrows(CusOtpException.class, () -> resendReset(purpose, resendRequest()));

        assertNoOtpWriteOrDelivery();
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void fiveResendsPersistCounterAndSixthRequestDoesNotWriteOrSend(OtpPurpose purpose) {
        prepareResend(purpose);
        for (int resend = 1; resend <= 5; resend++) {
            assertEquals(resend, resendReset(purpose, resendRequest()).getResendNo());
            assertEquals(GROUP, latest.getChallengeGroupId());
            assertFreshOtp(latest, purpose, resend);
        }
        OtpChallenge fifth = latest;

        assertThrows(CusOtpResendLimitException.class, () -> resendReset(purpose, resendRequest()));

        assertSame(fifth, latest);
        assertEquals(OtpStatus.ACTIVE, fifth.getStatus());
        assertEquals(5, fifth.getResendNo());
        verify(otpChallengesRepository, times(10)).save(any());
        verifyGeneratedDelivery(purpose, 5);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void resendEmailFailureExpiresTheNewRecordAndPreservesResendNumber(OtpPurpose purpose) {
        prepareResend(purpose);
        challenge.setResendNo(2);
        failDelivery(purpose);

        assertThrows(CusEmailException.class, () -> resendReset(purpose, resendRequest()));

        assertEquals(OtpStatus.EXPIRED, challenge.getStatus());
        assertEquals(OtpStatus.EXPIRED, latest.getStatus());
        assertEquals(3, latest.getResendNo());
        assertEquals(UpdatedByType.SYSTEM, latest.getUpdatedByType());
        assertNull(latest.getUpdatedById());
        verify(otpChallengesRepository, times(2)).save(latest);
        assertAudit(purpose + "_OTP_RESEND_FAILED", ActorType.SYSTEM);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void resendRejectsInactiveCustomer(OtpPurpose purpose) {
        prepareLookup(purpose);
        customer.setStatus(CustomerStatus.INACTIVE);

        assertThrows(CusAuthenticationException.class, () -> resendReset(purpose, resendRequest()));

        assertNoOtpWriteOrDelivery();
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void resendRequiresChallengeInformation(OtpPurpose purpose) {
        authorizeIfPin(purpose);
        assertThrows(CusOtpException.class, () -> resendReset(purpose, null));
        CusOtpResendRequest blank = new CusOtpResendRequest();
        blank.setChallengeGroupId(" ");
        assertThrows(CusOtpException.class, () -> resendReset(purpose, blank));
        verifyNoInteractions(otpChallengesRepository, cusEmailService, passwordEncoder);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void correctOtpRequestsAtomicConsumptionAndReturnsRotatedBinding(OtpPurpose purpose) {
        prepareLookup(purpose);
        when(passwordEncoder.matches(OTP, OTP_HASH)).thenReturn(true);
        stubConsume(purpose, 1);
        LocalDateTime before = LocalDateTime.now();

        String verifiedGroup = verifyReset(purpose, GROUP, " " + OTP + " ");

        assertFalse(GROUP.equals(verifiedGroup));
        assertDoesNotThrow(() -> UUID.fromString(verifiedGroup));
        assertConsumptionArguments(purpose, verifiedGroup, before);
        assertAudit(purpose + "_OTP_VERIFIED", ActorType.CUSTOMER);
        verify(otpChallengesRepository, never()).save(any());
        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(cusEmailService);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void lostAtomicConsumptionRejectsCorrectOtpWithoutSuccessAudit(OtpPurpose purpose) {
        prepareLookup(purpose);
        when(passwordEncoder.matches(OTP, OTP_HASH)).thenReturn(true);
        stubConsume(purpose, 0);

        assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, OTP));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(auditLogsRepository, cusEmailService);
        verify(otpChallengesRepository, never()).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void rotatedAwayOtpGroupIsRejectedOnRepeatedVerification(OtpPurpose purpose) {
        prepareLookup(purpose);
        when(lookup(purpose))
                .thenReturn(Optional.of(challenge), Optional.empty());
        when(passwordEncoder.matches(OTP, OTP_HASH)).thenReturn(true);
        stubConsume(purpose, 1);

        verifyReset(purpose, GROUP, OTP);
        // The second lookup models the database outcome of challenge-ID rotation.
        assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, OTP));

        verify(passwordEncoder).matches(OTP, OTP_HASH);
        assertAudit(purpose + "_OTP_VERIFIED", ActorType.CUSTOMER);
        verify(auditLogsRepository).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void incorrectOtpRequestsAttemptIncrementAndFailureAudit(OtpPurpose purpose) {
        prepareLookup(purpose);
        when(passwordEncoder.matches(WRONG_OTP, OTP_HASH)).thenReturn(false);

        assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, WRONG_OTP));

        assertEquals(1, challenge.getAttemptCount());
        assertEquals(OtpStatus.ACTIVE, challenge.getStatus());
        assertNull(challenge.getConsumedAt());
        assertEquals(UpdatedByType.CUSTOMER, challenge.getUpdatedByType());
        assertEquals(CUSTOMER_ID, challenge.getUpdatedById());
        verify(otpChallengesRepository).save(challenge);
        assertAudit(purpose + "_OTP_VERIFY_FAILED", ActorType.CUSTOMER);
        assertNoConsume(purpose);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void malformedNonBlankOtpCountsAsAnIncorrectAttemptWithoutHashChecking(OtpPurpose purpose) {
        prepareLookup(purpose);

        assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, "not-a-code"));

        assertEquals(1, challenge.getAttemptCount());
        verify(otpChallengesRepository).save(challenge);
        verifyNoInteractions(passwordEncoder);
        assertNoConsume(purpose);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void fiveWrongOtpAttemptsBlockTheRecordAndFurtherVerificationDoesNotIncrement(OtpPurpose purpose) {
        prepareLookup(purpose);
        when(passwordEncoder.matches(WRONG_OTP, OTP_HASH)).thenReturn(false);
        List<Integer> savedAttempts = new ArrayList<>();
        when(otpChallengesRepository.save(any(OtpChallenge.class))).thenAnswer(invocation -> {
            OtpChallenge saved = invocation.getArgument(0);
            savedAttempts.add(saved.getAttemptCount());
            return saved;
        });
        for (int attempt = 1; attempt <= 5; attempt++) {
            assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, WRONG_OTP));
            assertEquals(attempt, challenge.getAttemptCount());
            assertEquals(attempt == 5 ? OtpStatus.BLOCKED : OtpStatus.ACTIVE, challenge.getStatus());
        }

        assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, OTP));

        assertEquals(List.of(1, 2, 3, 4, 5), savedAttempts);
        verify(passwordEncoder, times(5)).matches(WRONG_OTP, OTP_HASH);
        assertNoConsume(purpose);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void timeExpiredOtpIsSavedExpiredWithoutHashChecking(OtpPurpose purpose) {
        prepareLookup(purpose);
        challenge.setExpiresAt(LocalDateTime.now().minusSeconds(1));

        assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, OTP));

        assertExpiredVerification(purpose);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void missingOtpExpiryIsTreatedAsExpired(OtpPurpose purpose) {
        prepareLookup(purpose);
        challenge.setExpiresAt(null);

        assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, OTP));

        assertExpiredVerification(purpose);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void terminalOtpStatusesRejectVerificationWithoutWrites(OtpPurpose purpose) {
        prepareLookup(purpose);
        for (OtpStatus status : List.of(OtpStatus.EXPIRED, OtpStatus.BLOCKED, OtpStatus.CONSUMED)) {
            challenge.setStatus(status);
            assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, OTP));
        }
        verify(otpChallengesRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, auditLogsRepository);
        assertNoConsume(purpose);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void alreadyExhaustedActiveOtpIsBlockedBeforeHashChecking(OtpPurpose purpose) {
        prepareLookup(purpose);
        challenge.setAttemptCount(5);

        assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, OTP));

        assertEquals(OtpStatus.BLOCKED, challenge.getStatus());
        assertEquals(UpdatedByType.SYSTEM, challenge.getUpdatedByType());
        verify(otpChallengesRepository).save(challenge);
        verifyNoInteractions(passwordEncoder);
        assertNoConsume(purpose);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void missingOtpChallengeIsRejected(OtpPurpose purpose) {
        authorizeIfPin(purpose);
        when(lookup(purpose))
                .thenReturn(Optional.empty());

        assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, OTP));

        assertNoOtpWriteOrDelivery();
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void verificationRequiresNonBlankChallengeAndOtp(OtpPurpose purpose) {
        authorizeIfPin(purpose);
        assertThrows(CusOtpException.class, () -> verifyReset(purpose, " ", OTP));
        assertThrows(CusOtpException.class, () -> verifyReset(purpose, GROUP, " "));
        verifyNoInteractions(otpChallengesRepository, passwordEncoder);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void verifiedBindingIsClaimedBeforeHashedCredentialReplacement(OtpPurpose purpose) {
        prepareBinding(purpose);
        stubCredentials();
        stubClaim(purpose, 1);
        stubConfirmationRemainder(purpose);
        LocalDateTime before = LocalDateTime.now();

        confirmReset(purpose);

        assertClaimArguments(purpose, before);
        assertCredentialReplacement(credentials, purpose, before);
        verify(credentialsRepository).findById(CUSTOMER_ID);
        verify(credentialsRepository, times(2)).findByCustomerIdForUpdate(CUSTOMER_ID);
        verify(credentialsRepository).save(credentials);
        assertAudit(purpose + "_SUCCESS", ActorType.CUSTOMER);
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            verify(passwordEncoder).matches(NEW_PASSWORD, PASSWORD_HASH);
            verify(cusSessionService).revokeAllActiveCustomerSessions(
                    CUSTOMER_ID, "PASSWORD_RESET", UpdatedByType.CUSTOMER, CUSTOMER_ID);
        } else {
            verify(passwordEncoder, never()).matches(anyString(), anyString());
            verify(cusSessionService, never()).revokeAllActiveCustomerSessions(any(), any(), any(), any());
        }
        assertConfirmationOrder(purpose);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void failedAtomicClaimRejectsResetWithoutEncodingSavingOrRevoking(OtpPurpose purpose) {
        prepareBinding(purpose);
        stubCredentials();
        stubClaim(purpose, 0);

        assertThrows(CusOtpException.class, () -> confirmReset(purpose));

        verify(credentialsRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(anyString());
        verify(cusSessionService, never()).revokeAllActiveCustomerSessions(any(), any(), any(), any());
        verifyNoInteractions(auditLogsRepository);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void claimedAwayVerifiedBindingCannotBeReplayed(OtpPurpose purpose) {
        prepareBinding(purpose);
        when(lookup(purpose))
                .thenReturn(Optional.of(challenge), Optional.empty());
        stubCredentials();
        stubClaim(purpose, 1);
        stubConfirmationRemainder(purpose);

        confirmReset(purpose);
        // Simulates lookup after the successful atomic claim rotated the group.
        assertThrows(CusOtpException.class, () -> confirmReset(purpose));

        verify(credentialsRepository).save(credentials);
        verify(passwordEncoder).encode(newSecret(purpose));
        verify(auditLogsRepository).save(any());
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void unverifiedExpiredOrBlockedBindingCannotChangeCredentials(OtpPurpose purpose) {
        prepareBinding(purpose);
        for (OtpStatus status : List.of(OtpStatus.ACTIVE, OtpStatus.EXPIRED, OtpStatus.BLOCKED)) {
            challenge.setStatus(status);
            assertThrows(CusOtpException.class, () -> confirmReset(purpose));
        }
        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, auditLogsRepository);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void consumedBindingWithoutConsumptionTimestampIsRejected(OtpPurpose purpose) {
        prepareBinding(purpose);
        challenge.setConsumedAt(null);

        assertThrows(CusOtpException.class, () -> confirmReset(purpose));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, auditLogsRepository);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void nonexistentVerifiedBindingIsRejected(OtpPurpose purpose) {
        authorizeIfPin(purpose);
        when(lookup(purpose))
                .thenReturn(Optional.empty());

        assertThrows(CusOtpException.class, () -> confirmReset(purpose));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, auditLogsRepository);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void inactiveCustomerCannotConfirmReset(OtpPurpose purpose) {
        prepareBinding(purpose);
        customer.setStatus(CustomerStatus.INACTIVE);

        assertThrows(CusAuthenticationException.class, () -> confirmReset(purpose));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder, auditLogsRepository);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void missingCredentialsRejectConfirmationBeforeClaim(OtpPurpose purpose) {
        prepareBinding(purpose);
        when(credentialsRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

        assertThrows(RuntimeException.class, () -> confirmReset(purpose));

        assertNoClaim(purpose);
        verifyNoInteractions(passwordEncoder, auditLogsRepository);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void missingCredentialsAfterClaimPropagatesFailureWithoutSaving(OtpPurpose purpose) {
        prepareBinding(purpose);
        when(credentialsRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
        when(credentialsRepository.findByCustomerIdForUpdate(CUSTOMER_ID))
                .thenReturn(Optional.of(credentials), Optional.empty());
        stubClaim(purpose, 1);

        assertThrows(RuntimeException.class, () -> confirmReset(purpose));

        verify(credentialsRepository, never()).save(any());
        verify(passwordEncoder, never()).encode(anyString());
        verifyNoInteractions(auditLogsRepository);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void unexpectedEncodingFailurePropagatesWithoutSavingCredentials(OtpPurpose purpose) {
        prepareBinding(purpose);
        stubCredentials();
        stubClaim(purpose, 1);
        when(passwordEncoder.encode(newSecret(purpose))).thenThrow(new IllegalStateException("Synthetic encoder failure"));

        assertThrows(IllegalStateException.class, () -> confirmReset(purpose));

        verify(credentialsRepository, never()).save(any());
        verify(cusSessionService, never()).revokeAllActiveCustomerSessions(any(), any(), any(), any());
        verifyNoInteractions(auditLogsRepository);
    }

    @Test
    void passwordConfirmationValidatesRequiredFieldsConfirmationAndExistingPolicyBeforeLookup() {
        assertThrows(CusValidationException.class, () -> service.resetPassword(null));
        CusPasswordResetConfirmRequest missing = passwordConfirmation();
        missing.setVerifiedChallengeGroupId(" ");
        assertThrows(CusValidationException.class, () -> service.resetPassword(missing));
        CusPasswordResetConfirmRequest mismatch = passwordConfirmation();
        mismatch.setConfirmPassword("Different1!");
        assertThrows(CusValidationException.class, () -> service.resetPassword(mismatch));
        for (String invalid : List.of("short", "LongerPassword1!", "lowerab1!", "UPPERAB1!",
                "NoDigits!!", "NoSymbol12", " NewPass1!")) {
            CusPasswordResetConfirmRequest request = passwordConfirmation();
            request.setNewPassword(invalid);
            request.setConfirmPassword(invalid);
            assertThrows(CusValidationException.class, () -> service.resetPassword(request));
        }
        verifyNoInteractions(otpChallengesRepository, credentialsRepository, passwordEncoder);
    }

    @Test
    void passwordConfirmationRejectsReusingCurrentPasswordBeforeClaim() {
        prepareBinding(OtpPurpose.PASSWORD_RESET);
        stubCredentials();
        when(passwordEncoder.matches(NEW_PASSWORD, PASSWORD_HASH)).thenReturn(true);

        assertThrows(CusValidationException.class, () -> service.resetPassword(passwordConfirmation()));

        assertNoClaim(OtpPurpose.PASSWORD_RESET);
        verify(passwordEncoder, never()).encode(anyString());
        verify(credentialsRepository, never()).save(any());
    }

    @Test
    void passwordConfirmationUpdatesTheReloadedCredentialAfterClearAutomaticallyClaim() {
        prepareBinding(OtpPurpose.PASSWORD_RESET);
        CustomerCredentials reloaded = credentialsFixture();
        when(credentialsRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
        when(credentialsRepository.findByCustomerIdForUpdate(CUSTOMER_ID))
                .thenReturn(Optional.of(credentials), Optional.of(reloaded));
        stubClaim(OtpPurpose.PASSWORD_RESET, 1);
        stubConfirmationRemainder(OtpPurpose.PASSWORD_RESET);

        service.resetPassword(passwordConfirmation());

        assertEquals(PASSWORD_HASH, credentials.getPasswordHash());
        assertEquals(NEW_PASSWORD_HASH, reloaded.getPasswordHash());
        verify(credentialsRepository).save(reloaded);
        verify(credentialsRepository, never()).save(credentials);
    }

    @Test
    void passwordConfirmationDoesNotHideSessionRevocationFailure() {
        prepareBinding(OtpPurpose.PASSWORD_RESET);
        stubCredentials();
        stubClaim(OtpPurpose.PASSWORD_RESET, 1);
        when(passwordEncoder.encode(NEW_PASSWORD)).thenReturn(NEW_PASSWORD_HASH);
        when(cusSessionService.revokeAllActiveCustomerSessions(
                CUSTOMER_ID, "PASSWORD_RESET", UpdatedByType.CUSTOMER, CUSTOMER_ID))
                .thenThrow(new IllegalStateException("Synthetic session revocation failure"));

        assertThrows(IllegalStateException.class, () -> service.resetPassword(passwordConfirmation()));

        verify(credentialsRepository).save(credentials);
        verifyNoInteractions(auditLogsRepository);
        // The mock entity is not rolled back. Actual database rollback needs an integration test.
    }

    @Test
    void allPinResetOperationsRequireBearerAuthorization() {
        for (String header : new String[]{null, "", "Basic synthetic"}) {
            assertThrows(CusAuthenticationException.class, () -> service.requestPinReset(header));
            assertThrows(CusAuthenticationException.class, () -> service.resendPinResetOtp(header, resendRequest()));
            assertThrows(CusAuthenticationException.class, () -> service.verifyPinResetOtp(header, pinVerification(OTP)));
            assertThrows(CusAuthenticationException.class, () -> service.resetTransactionPin(header, pinConfirmation()));
        }
        verifyNoInteractions(cusJwtService, cusSessionService, otpChallengesRepository, credentialsRepository);
    }

    @Test
    void allPinResetOperationsRejectNonAccessTokensBeforeSessionValidation() {
        when(cusJwtService.getClaims(ACCESS)).thenReturn(claims);
        when(claims.get("tokenType", String.class)).thenReturn("REFRESH");

        assertThrows(CusAuthenticationException.class, () -> service.requestPinReset(AUTHORIZATION));
        assertThrows(CusAuthenticationException.class, () -> service.resendPinResetOtp(AUTHORIZATION, resendRequest()));
        assertThrows(CusAuthenticationException.class,
                () -> service.verifyPinResetOtp(AUTHORIZATION, pinVerification(OTP)));
        assertThrows(CusAuthenticationException.class,
                () -> service.resetTransactionPin(AUTHORIZATION, pinConfirmation()));

        verifyNoInteractions(cusSessionService, otpChallengesRepository, credentialsRepository);
    }

    @Test
    void allPinResetOperationsPropagateSessionExpiryBeforeLookingUpOtp() {
        when(cusJwtService.getClaims(ACCESS)).thenReturn(claims);
        when(claims.get("tokenType", String.class)).thenReturn("ACCESS");
        when(cusSessionService.validateAccessSession(claims))
                .thenThrow(new CusSessionExpiredException("Synthetic expired session"));

        assertThrows(CusSessionExpiredException.class, () -> service.requestPinReset(AUTHORIZATION));
        assertThrows(CusSessionExpiredException.class,
                () -> service.resendPinResetOtp(AUTHORIZATION, resendRequest()));
        assertThrows(CusSessionExpiredException.class,
                () -> service.verifyPinResetOtp(AUTHORIZATION, pinVerification(OTP)));
        assertThrows(CusSessionExpiredException.class,
                () -> service.resetTransactionPin(AUTHORIZATION, pinConfirmation()));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(otpChallengesRepository, cusEmailService);
    }

    @Test
    void pinResetRejectsSessionWithoutCustomerIdentity() {
        authorizeIfPin(OtpPurpose.PIN_RESET);
        validatedSession.setCustomer(null);

        assertThrows(CusSessionExpiredException.class, () -> service.requestPinReset(AUTHORIZATION));
        assertThrows(CusSessionExpiredException.class,
                () -> service.resendPinResetOtp(AUTHORIZATION, resendRequest()));
        assertThrows(CusSessionExpiredException.class,
                () -> service.verifyPinResetOtp(AUTHORIZATION, pinVerification(OTP)));
        assertThrows(CusSessionExpiredException.class,
                () -> service.resetTransactionPin(AUTHORIZATION, pinConfirmation()));

        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(otpChallengesRepository, cusEmailService);
    }

    @Test
    void pinResetCannotResendVerifyOrConfirmAnotherCustomersChallenge() {
        prepareLookup(OtpPurpose.PIN_RESET);
        challenge.setCustomer(Customers.builder().customerId(UUID.randomUUID()).build());

        assertThrows(CusOtpException.class, () -> service.resendPinResetOtp(AUTHORIZATION, resendRequest()));
        assertThrows(CusOtpException.class, () -> service.verifyPinResetOtp(AUTHORIZATION, pinVerification(OTP)));
        challenge.setStatus(OtpStatus.CONSUMED);
        challenge.setConsumedAt(LocalDateTime.now());
        assertThrows(CusOtpException.class, () -> service.resetTransactionPin(AUTHORIZATION, pinConfirmation()));

        assertNoOtpWriteOrDelivery();
        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void inactiveCustomerRejectionFromSessionValidatorIsNotBypassedByPinVerification() {
        when(cusJwtService.getClaims(ACCESS)).thenReturn(claims);
        when(claims.get("tokenType", String.class)).thenReturn("ACCESS");
        when(cusSessionService.validateAccessSession(claims))
                .thenThrow(new CusAuthenticationException("Customer account is not active."));

        assertThrows(CusAuthenticationException.class,
                () -> service.verifyPinResetOtp(AUTHORIZATION, pinVerification(OTP)));

        verifyNoInteractions(otpChallengesRepository, passwordEncoder);
    }

    @Test
    void pinConfirmationRequiresMatchingSixDigitPinBeforeBindingLookup() {
        authorizeIfPin(OtpPurpose.PIN_RESET);
        assertThrows(CusValidationException.class, () -> service.resetTransactionPin(AUTHORIZATION, null));
        CusPinResetConfirmRequest mismatch = pinConfirmation();
        mismatch.setConfirmPin("135790");
        assertThrows(CusValidationException.class, () -> service.resetTransactionPin(AUTHORIZATION, mismatch));
        for (String invalid : List.of("12345", "1234567", "abcdef", " 246810")) {
            CusPinResetConfirmRequest request = pinConfirmation();
            request.setNewPin(invalid);
            request.setConfirmPin(invalid);
            assertThrows(CusValidationException.class,
                    () -> service.resetTransactionPin(AUTHORIZATION, request));
        }
        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(otpChallengesRepository, passwordEncoder);
    }

    @Test
    void pinConfirmationRequiresAnExistingPinBeforeClaimingTheBinding() {
        prepareBinding(OtpPurpose.PIN_RESET);
        stubCredentials();
        credentials.setTransactionPinHash(null);

        assertThrows(CusValidationException.class,
                () -> service.resetTransactionPin(AUTHORIZATION, pinConfirmation()));

        assertNoClaim(OtpPurpose.PIN_RESET);
        verify(credentialsRepository, never()).save(any());
        verifyNoInteractions(passwordEncoder);
    }

    @Test
    void pinOtpLookupFollowsJwtParsingAndSessionValidation() {
        prepareLookup(OtpPurpose.PIN_RESET);
        challenge.setStatus(OtpStatus.BLOCKED);

        assertThrows(CusOtpException.class, () -> service.verifyPinResetOtp(AUTHORIZATION, pinVerification(OTP)));

        var order = inOrder(cusJwtService, credentialsRepository, cusSessionService, otpChallengesRepository);
        order.verify(cusJwtService).getClaims(ACCESS);
        order.verify(credentialsRepository).findByCustomerIdForUpdate(CUSTOMER_ID);
        order.verify(cusSessionService).validateAccessSession(claims);
        order.verify(otpChallengesRepository)
                .findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(CUSTOMER_ID, OtpSubjectType.CUSTOMER, OtpPurpose.PIN_RESET);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void requestAndResendTransactionMetadataExcludesOnlyExpectedEmailFailure(OtpPurpose purpose) throws Exception {
        TransactionAttribute request = purpose == OtpPurpose.PASSWORD_RESET
                ? transaction("requestPasswordReset", CusPasswordResetRequest.class)
                : transaction("requestPinReset", String.class);
        TransactionAttribute resend = purpose == OtpPurpose.PASSWORD_RESET
                ? transaction("resendPasswordResetOtp", CusOtpResendRequest.class)
                : transaction("resendPinResetOtp", String.class, CusOtpResendRequest.class);
        for (TransactionAttribute tx : List.of(request, resend)) {
            assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, tx.getPropagationBehavior());
            assertFalse(tx.isReadOnly());
            assertFalse(tx.rollbackOn(new CusEmailException("Synthetic delivery failure")));
            assertTrue(tx.rollbackOn(new IllegalStateException("Synthetic persistence failure")));
        }
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void otpVerificationTransactionMetadataRetainsOtpRejectionUpdates(OtpPurpose purpose) throws Exception {
        TransactionAttribute tx = purpose == OtpPurpose.PASSWORD_RESET
                ? transaction("verifyPasswordResetOtp", CusPasswordResetOtpVerifyRequest.class)
                : transaction("verifyPinResetOtp", String.class, CusPinResetOtpVerifyRequest.class);
        assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, tx.getPropagationBehavior());
        assertFalse(tx.isReadOnly());
        assertFalse(tx.rollbackOn(new CusOtpException("Synthetic OTP rejection")));
        assertTrue(tx.rollbackOn(new IllegalStateException("Synthetic persistence failure")));
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void confirmationTransactionMetadataRollsBackUnexpectedFailures(OtpPurpose purpose) throws Exception {
        TransactionAttribute tx = purpose == OtpPurpose.PASSWORD_RESET
                ? transaction("resetPassword", CusPasswordResetConfirmRequest.class)
                : transaction("resetTransactionPin", String.class, CusPinResetConfirmRequest.class);
        assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, tx.getPropagationBehavior());
        assertFalse(tx.isReadOnly());
        assertTrue(tx.rollbackOn(new CusOtpException("Synthetic claim rejection")));
        assertTrue(tx.rollbackOn(new IllegalStateException("Synthetic persistence failure")));
    }

    @Test
    void passwordResetRequestFacadeDelegatesTheSameRequestAndResponseAndPropagatesFailure() {
        CusCustomerPasswordResetService delegate = mock(CusCustomerPasswordResetService.class);
        CusAuthService facade = authFacade(delegate);
        CusPasswordResetRequest request = new CusPasswordResetRequest(CODE);
        CusPasswordResetStartResponse response = new CusPasswordResetStartResponse(true, "sent", GROUP, "masked");
        when(delegate.requestPasswordReset(same(request))).thenReturn(response);

        assertSame(response, facade.requestPasswordReset(request));

        CusEmailException failure = new CusEmailException("Synthetic delivery failure");
        when(delegate.requestPasswordReset(same(request))).thenThrow(failure);
        assertSame(failure, assertThrows(CusEmailException.class, () -> facade.requestPasswordReset(request)));
        verify(delegate, times(2)).requestPasswordReset(same(request));
        verifyNoMoreInteractions(delegate);
        assertFacadeDidNotUseRecoveryDependencies();
    }

    @Test
    void passwordResetResendFacadeDelegatesTheSameRequestAndResponseAndPropagatesFailure() {
        CusCustomerPasswordResetService delegate = mock(CusCustomerPasswordResetService.class);
        CusAuthService facade = authFacade(delegate);
        CusOtpResendRequest request = resendRequest();
        CusOtpResendResponse response = new CusOtpResendResponse(true, "sent", GROUP, "masked", 1);
        when(delegate.resendPasswordResetOtp(same(request))).thenReturn(response);

        assertSame(response, facade.resendPasswordResetOtp(request));

        CusEmailException failure = new CusEmailException("Synthetic delivery failure");
        when(delegate.resendPasswordResetOtp(same(request))).thenThrow(failure);
        assertSame(failure, assertThrows(CusEmailException.class, () -> facade.resendPasswordResetOtp(request)));
        verify(delegate, times(2)).resendPasswordResetOtp(same(request));
        verifyNoMoreInteractions(delegate);
        assertFacadeDidNotUseRecoveryDependencies();
    }

    @Test
    void passwordResetVerificationFacadeDelegatesTheSameRequestAndResponseAndPropagatesFailure() {
        CusCustomerPasswordResetService delegate = mock(CusCustomerPasswordResetService.class);
        CusAuthService facade = authFacade(delegate);
        CusPasswordResetOtpVerifyRequest request = new CusPasswordResetOtpVerifyRequest(GROUP, OTP);
        CusPasswordResetOtpVerifyResponse response = new CusPasswordResetOtpVerifyResponse(true, "verified", GROUP);
        when(delegate.verifyPasswordResetOtp(same(request))).thenReturn(response);

        assertSame(response, facade.verifyPasswordResetOtp(request));

        CusOtpException failure = new CusOtpException("Synthetic OTP rejection");
        when(delegate.verifyPasswordResetOtp(same(request))).thenThrow(failure);
        assertSame(failure, assertThrows(CusOtpException.class, () -> facade.verifyPasswordResetOtp(request)));
        verify(delegate, times(2)).verifyPasswordResetOtp(same(request));
        verifyNoMoreInteractions(delegate);
        assertFacadeDidNotUseRecoveryDependencies();
    }

    @Test
    void passwordResetConfirmationFacadeDelegatesTheSameRequestAndPropagatesFailure() {
        CusCustomerPasswordResetService delegate = mock(CusCustomerPasswordResetService.class);
        CusAuthService facade = authFacade(delegate);
        CusPasswordResetConfirmRequest request = passwordConfirmation();

        assertDoesNotThrow(() -> facade.resetPassword(request));

        CusOtpException failure = new CusOtpException("Synthetic claim rejection");
        doThrow(failure).when(delegate).resetPassword(same(request));
        assertSame(failure, assertThrows(CusOtpException.class, () -> facade.resetPassword(request)));
        verify(delegate, times(2)).resetPassword(same(request));
        verifyNoMoreInteractions(delegate);
        assertFacadeDidNotUseRecoveryDependencies();
    }

    @Test
    void extractedPasswordResetTransactionRulesAndPublicSignaturesMatchTheFacade() throws Exception {
        String[] names = {"requestPasswordReset", "resendPasswordResetOtp", "verifyPasswordResetOtp", "resetPassword"};
        Class<?>[] requests = {CusPasswordResetRequest.class, CusOtpResendRequest.class,
                CusPasswordResetOtpVerifyRequest.class, CusPasswordResetConfirmRequest.class};
        for (int i = 0; i < names.length; i++) {
            var facadeMethod = CusAuthService.class.getMethod(names[i], requests[i]);
            var extractedMethod = CusCustomerPasswordResetService.class.getMethod(names[i], requests[i]);
            assertEquals(facadeMethod.getReturnType(), extractedMethod.getReturnType());
            TransactionAttribute facade = transaction(names[i], requests[i]);
            TransactionAttribute extracted = new AnnotationTransactionAttributeSource()
                    .getTransactionAttribute(extractedMethod, CusCustomerPasswordResetService.class);
            assertNotNull(extracted);
            assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, extracted.getPropagationBehavior());
            assertEquals(facade.getPropagationBehavior(), extracted.getPropagationBehavior());
            assertEquals(facade.isReadOnly(), extracted.isReadOnly());
            assertEquals(facade.getIsolationLevel(), extracted.getIsolationLevel());
            assertEquals(facade.getTimeout(), extracted.getTimeout());
            for (Throwable failure : List.of(new CusEmailException("Synthetic delivery failure"),
                    new CusOtpException("Synthetic OTP rejection"), new CusOtpResendLimitException("Synthetic limit"),
                    new CusValidationException("Synthetic validation"),
                    new IllegalStateException("Synthetic persistence failure"), new Exception("Synthetic checked failure"))) {
                assertEquals(facade.rollbackOn(failure), extracted.rollbackOn(failure),
                        names[i] + " must preserve rollback behavior for " + failure.getClass().getSimpleName());
            }
        }
        // Metadata equality does not prove real commits or rollback-only behavior.
    }

    @Test
    void pinResetRequestFacadeDelegatesTheSameHeaderAndResponseAndPropagatesFailure() {
        CusCustomerPinResetService delegate = mock(CusCustomerPinResetService.class);
        CusAuthService facade = authFacade(passwordResetService, delegate);
        CusPinResetStartResponse response = new CusPinResetStartResponse(true, "sent", GROUP, "masked");
        when(delegate.requestPinReset(same(AUTHORIZATION))).thenReturn(response);

        assertSame(response, facade.requestPinReset(AUTHORIZATION));

        CusEmailException failure = new CusEmailException("Synthetic delivery failure");
        when(delegate.requestPinReset(same(AUTHORIZATION))).thenThrow(failure);
        assertSame(failure, assertThrows(CusEmailException.class, () -> facade.requestPinReset(AUTHORIZATION)));
        verify(delegate, times(2)).requestPinReset(same(AUTHORIZATION));
        verifyNoMoreInteractions(delegate);
        assertFacadeDidNotUseRecoveryDependencies();
        verifyNoInteractions(cusJwtService);
    }

    @Test
    void pinResetResendFacadeDelegatesTheSameHeaderRequestAndResponseAndPropagatesFailure() {
        CusCustomerPinResetService delegate = mock(CusCustomerPinResetService.class);
        CusAuthService facade = authFacade(passwordResetService, delegate);
        CusOtpResendRequest request = resendRequest();
        CusOtpResendResponse response = new CusOtpResendResponse(true, "sent", GROUP, "masked", 1);
        when(delegate.resendPinResetOtp(same(AUTHORIZATION), same(request))).thenReturn(response);

        assertSame(response, facade.resendPinResetOtp(AUTHORIZATION, request));

        CusEmailException failure = new CusEmailException("Synthetic delivery failure");
        when(delegate.resendPinResetOtp(same(AUTHORIZATION), same(request))).thenThrow(failure);
        assertSame(failure, assertThrows(CusEmailException.class,
                () -> facade.resendPinResetOtp(AUTHORIZATION, request)));
        verify(delegate, times(2)).resendPinResetOtp(same(AUTHORIZATION), same(request));
        verifyNoMoreInteractions(delegate);
        assertFacadeDidNotUseRecoveryDependencies();
        verifyNoInteractions(cusJwtService);
    }

    @Test
    void pinResetVerificationFacadeDelegatesTheSameHeaderRequestAndResponseAndPropagatesFailure() {
        CusCustomerPinResetService delegate = mock(CusCustomerPinResetService.class);
        CusAuthService facade = authFacade(passwordResetService, delegate);
        CusPinResetOtpVerifyRequest request = pinVerification(OTP);
        CusPinResetOtpVerifyResponse response = new CusPinResetOtpVerifyResponse(true, "verified", GROUP);
        when(delegate.verifyPinResetOtp(same(AUTHORIZATION), same(request))).thenReturn(response);

        assertSame(response, facade.verifyPinResetOtp(AUTHORIZATION, request));

        CusOtpException failure = new CusOtpException("Synthetic OTP rejection");
        when(delegate.verifyPinResetOtp(same(AUTHORIZATION), same(request))).thenThrow(failure);
        assertSame(failure, assertThrows(CusOtpException.class,
                () -> facade.verifyPinResetOtp(AUTHORIZATION, request)));
        verify(delegate, times(2)).verifyPinResetOtp(same(AUTHORIZATION), same(request));
        verifyNoMoreInteractions(delegate);
        assertFacadeDidNotUseRecoveryDependencies();
        verifyNoInteractions(cusJwtService);
    }

    @Test
    void pinResetConfirmationFacadeDelegatesTheSameHeaderAndRequestAndPropagatesFailure() {
        CusCustomerPinResetService delegate = mock(CusCustomerPinResetService.class);
        CusAuthService facade = authFacade(passwordResetService, delegate);
        CusPinResetConfirmRequest request = pinConfirmation();

        assertDoesNotThrow(() -> facade.resetTransactionPin(AUTHORIZATION, request));

        CusOtpException failure = new CusOtpException("Synthetic claim rejection");
        doThrow(failure).when(delegate).resetTransactionPin(same(AUTHORIZATION), same(request));
        assertSame(failure, assertThrows(CusOtpException.class,
                () -> facade.resetTransactionPin(AUTHORIZATION, request)));
        verify(delegate, times(2)).resetTransactionPin(same(AUTHORIZATION), same(request));
        verifyNoMoreInteractions(delegate);
        assertFacadeDidNotUseRecoveryDependencies();
        verifyNoInteractions(cusJwtService);
    }

    @Test
    void extractedPinResetTransactionRulesAndPublicSignaturesMatchTheFacade() throws Exception {
        String[] names = {"requestPinReset", "resendPinResetOtp", "verifyPinResetOtp", "resetTransactionPin"};
        Class<?>[][] parameters = {{String.class}, {String.class, CusOtpResendRequest.class},
                {String.class, CusPinResetOtpVerifyRequest.class}, {String.class, CusPinResetConfirmRequest.class}};
        Class<?>[] returns = {CusPinResetStartResponse.class, CusOtpResendResponse.class,
                CusPinResetOtpVerifyResponse.class, void.class};
        for (int i = 0; i < names.length; i++) {
            var facadeMethod = CusAuthService.class.getMethod(names[i], parameters[i]);
            var extractedMethod = CusCustomerPinResetService.class.getMethod(names[i], parameters[i]);
            assertEquals(returns[i], facadeMethod.getReturnType());
            assertEquals(returns[i], extractedMethod.getReturnType());
            assertArrayEquals(facadeMethod.getExceptionTypes(), extractedMethod.getExceptionTypes());
            TransactionAttribute facade = transaction(names[i], parameters[i]);
            TransactionAttribute extracted = new AnnotationTransactionAttributeSource()
                    .getTransactionAttribute(extractedMethod, CusCustomerPinResetService.class);
            assertNotNull(extracted);
            assertEquals(TransactionDefinition.PROPAGATION_REQUIRED, extracted.getPropagationBehavior());
            assertEquals(facade.getPropagationBehavior(), extracted.getPropagationBehavior());
            assertFalse(extracted.isReadOnly());
            assertEquals(facade.isReadOnly(), extracted.isReadOnly());
            assertEquals(facade.getIsolationLevel(), extracted.getIsolationLevel());
            assertEquals(facade.getTimeout(), extracted.getTimeout());
            assertEquals(i >= 2, extracted.rollbackOn(new CusEmailException("Synthetic delivery failure")));
            assertEquals(i != 2, extracted.rollbackOn(new CusOtpException("Synthetic OTP rejection")));
            for (Throwable failure : List.of(new CusEmailException("Synthetic delivery failure"),
                    new CusOtpException("Synthetic OTP rejection"), new CusOtpResendLimitException("Synthetic limit"),
                    new CusSessionExpiredException("Synthetic session expiry"),
                    new CusAuthenticationException("Synthetic authentication failure"),
                    new CusValidationException("Synthetic validation"),
                    new IllegalStateException("Synthetic persistence failure"), new Exception("Synthetic checked failure"))) {
                assertEquals(facade.rollbackOn(failure), extracted.rollbackOn(failure),
                        names[i] + " must preserve rollback behavior for " + failure.getClass().getSimpleName());
            }
        }
        // Mockito and metadata checks do not prove database commits or concurrency.
    }

    private CusAuthService authFacade(CusCustomerPasswordResetService delegate) {
        return authFacade(delegate, pinResetService);
    }

    private CusAuthService authFacade(CusCustomerPasswordResetService passwordDelegate,
                                     CusCustomerPinResetService pinDelegate) {
        return new CusAuthService(customerRepository, accountsRepository, credentialsRepository,
                loginAttemptsRepository, otpChallengesRepository, passwordEncoder, authSessionsRepository,
                cusJwtService, cusSessionService, jwtRevokedTokensRepository, cusEmailService,
                auditLogsRepository, passwordDelegate, pinDelegate);
    }

    private void assertFacadeDidNotUseRecoveryDependencies() {
        verifyNoInteractions(customerRepository, accountsRepository, credentialsRepository, otpChallengesRepository,
                passwordEncoder, cusEmailService, cusSessionService, auditLogsRepository);
    }

    private CustomerCredentials credentialsFixture() {
        return CustomerCredentials.builder().customerId(CUSTOMER_ID).customer(customer)
                .passwordHash(PASSWORD_HASH).transactionPinHash(PIN_HASH).mustChangePassword(false)
                .tokenVersion(2L).failedLoginCount(3).lockedUntil(passwordLock)
                .failedPinAttemptCount(4).pinLockedUntil(LocalDateTime.now().plusMinutes(15)).build();
    }

    private OtpChallenge challenge(OtpPurpose purpose) {
        LocalDateTime now = LocalDateTime.now();
        return OtpChallenge.builder().otpId(10L).customer(customer).subjectType(OtpSubjectType.CUSTOMER)
                .purpose(purpose).deliveryChannel(DeliveryChannel.EMAIL).challengeGroupId(GROUP)
                .otpHash(OTP_HASH).status(OtpStatus.ACTIVE).attemptCount(0).maxAttempts(5)
                .resendNo(0).maxResendAttempts(5).lastSentAt(now).expiresAt(now.plusMinutes(5)).build();
    }

    private void authorizeIfPin(OtpPurpose purpose) {
        if (purpose == OtpPurpose.PIN_RESET) {
            when(cusJwtService.getClaims(ACCESS)).thenReturn(claims);
            when(claims.get("tokenType", String.class)).thenReturn("ACCESS");
            when(cusSessionService.validateAccessSession(claims)).thenReturn(validatedSession);
        }
    }

    private void prepareRequestIdentity(OtpPurpose purpose) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            when(customerRepository.findByCustomerCode(CODE)).thenReturn(Optional.of(customer));
        } else {
            authorizeIfPin(purpose);
        }
    }

    private void prepareRequest(OtpPurpose purpose, List<OtpChallenge> active) {
        prepareRequestIdentity(purpose);
        stubRequestOtpWrites(purpose, active);
    }

    private void stubRequestOtpWrites(OtpPurpose purpose, List<OtpChallenge> active) {
        when(otpChallengesRepository.findByCustomerAndPurposeAndStatus(customer, purpose, OtpStatus.ACTIVE))
                .thenReturn(active);
        stubOtpWrites();
    }

    private Optional<OtpChallenge> lookup(OtpPurpose purpose) {
        return purpose == OtpPurpose.PIN_RESET
                ? otpChallengesRepository.findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(CUSTOMER_ID, OtpSubjectType.CUSTOMER, purpose)
                : otpChallengesRepository.findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(GROUP, purpose);
    }

    private void prepareLookup(OtpPurpose purpose) {
        authorizeIfPin(purpose);
        challenge = challenge(purpose);
        latest = challenge;
        when(lookup(purpose))
                .thenAnswer(invocation -> Optional.of(latest));
    }

    private void prepareResend(OtpPurpose purpose) {
        prepareLookup(purpose);
        stubOtpWrites();
    }

    private void stubOtpWrites() {
        when(passwordEncoder.encode(anyString())).thenAnswer(invocation -> "synthetic-encoded-otp-" + ++nextHash);
        when(otpChallengesRepository.save(any(OtpChallenge.class))).thenAnswer(invocation -> {
            OtpChallenge saved = invocation.getArgument(0);
            if (saved.getOtpId() == null) {
                saved.setOtpId(++nextId);
            }
            latest = saved;
            return saved;
        });
    }

    private void prepareBinding(OtpPurpose purpose) {
        prepareLookup(purpose);
        challenge.setStatus(OtpStatus.CONSUMED);
        challenge.setConsumedAt(LocalDateTime.now());
    }

    private void stubCredentials() {
        when(credentialsRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(credentials));
    }

    private void stubConfirmationRemainder(OtpPurpose purpose) {
        when(passwordEncoder.encode(newSecret(purpose))).thenReturn(newHash(purpose));
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            when(cusSessionService.revokeAllActiveCustomerSessions(
                    CUSTOMER_ID, "PASSWORD_RESET", UpdatedByType.CUSTOMER, CUSTOMER_ID)).thenReturn(2);
        }
    }

    private void stubConsume(OtpPurpose purpose, int result) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            when(otpChallengesRepository.consumePasswordResetOtpIfActive(
                    eq(10L), eq(GROUP), eq(purpose), eq(OtpStatus.ACTIVE), eq(OtpStatus.CONSUMED), anyString(),
                    any(LocalDateTime.class), any(LocalDateTime.class), eq(UpdatedByType.CUSTOMER),
                    eq(CUSTOMER_ID), any(LocalDateTime.class))).thenReturn(result);
        } else {
            when(otpChallengesRepository.consumePinResetOtpIfActive(
                    eq(10L), eq(GROUP), eq(purpose), eq(OtpStatus.ACTIVE), eq(OtpStatus.CONSUMED), anyString(),
                    any(LocalDateTime.class), any(LocalDateTime.class), eq(UpdatedByType.CUSTOMER),
                    eq(CUSTOMER_ID), any(LocalDateTime.class))).thenReturn(result);
        }
    }

    private void stubClaim(OtpPurpose purpose, int result) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            when(otpChallengesRepository.claimVerifiedPasswordResetChallengeIfMatch(
                    eq(10L), eq(GROUP), anyString(), eq(purpose), eq(OtpStatus.CONSUMED),
                    eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID), any(LocalDateTime.class))).thenReturn(result);
        } else {
            when(otpChallengesRepository.claimVerifiedPinResetChallengeIfMatch(
                    eq(10L), eq(GROUP), anyString(), eq(purpose), eq(OtpStatus.CONSUMED),
                    eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID), any(LocalDateTime.class))).thenReturn(result);
        }
    }

    private String requestReset(OtpPurpose purpose) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            CusPasswordResetStartResponse response = service.requestPasswordReset(new CusPasswordResetRequest(CODE));
            assertTrue(response.isSuccess());
            assertEquals("re****@example.test", response.getDestinationMasked());
            return response.getChallengeGroupId();
        }
        CusPinResetStartResponse response = service.requestPinReset(AUTHORIZATION);
        assertTrue(response.isSuccess());
        assertEquals("re****@example.test", response.getDestinationMasked());
        return response.getChallengeGroupId();
    }

    private CusOtpResendResponse resendReset(OtpPurpose purpose, CusOtpResendRequest request) {
        return purpose == OtpPurpose.PASSWORD_RESET
                ? service.resendPasswordResetOtp(request) : service.resendPinResetOtp(AUTHORIZATION, request);
    }

    private String verifyReset(OtpPurpose purpose, String group, String rawOtp) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            CusPasswordResetOtpVerifyResponse response = service.verifyPasswordResetOtp(
                    new CusPasswordResetOtpVerifyRequest(group, rawOtp));
            assertTrue(response.isSuccess());
            return response.getChallengeGroupId();
        }
        CusPinResetOtpVerifyRequest request = pinVerification(rawOtp);
        request.setChallengeGroupId(group);
        CusPinResetOtpVerifyResponse response = service.verifyPinResetOtp(AUTHORIZATION, request);
        assertTrue(response.isSuccess());
        return response.getVerifiedChallengeGroupId();
    }

    private void confirmReset(OtpPurpose purpose) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            service.resetPassword(passwordConfirmation());
        } else {
            service.resetTransactionPin(AUTHORIZATION, pinConfirmation());
        }
    }

    private void failDelivery(OtpPurpose purpose) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            doThrow(new MailSendException("Synthetic delivery failure"))
                    .when(cusEmailService).sendPasswordResetOtp(eq(EMAIL), anyString());
        } else {
            doThrow(new MailSendException("Synthetic delivery failure"))
                    .when(cusEmailService).sendPinResetOtp(eq(EMAIL), anyString());
        }
    }

    private void verifyGeneratedDelivery(OtpPurpose purpose, int count) {
        ArgumentCaptor<String> raw = ArgumentCaptor.forClass(String.class);
        verify(passwordEncoder, times(count)).encode(raw.capture());
        assertTrue(raw.getAllValues().stream().allMatch(code -> code.matches("[1-9]\\d{5}")));
        assertTrue(raw.getAllValues().stream().noneMatch(code -> code.equals(latest.getOtpHash())));
        ArgumentCaptor<String> delivered = ArgumentCaptor.forClass(String.class);
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            verify(cusEmailService, times(count)).sendPasswordResetOtp(eq(EMAIL), delivered.capture());
            verify(cusEmailService, never()).sendPinResetOtp(anyString(), anyString());
        } else {
            verify(cusEmailService, times(count)).sendPinResetOtp(eq(EMAIL), delivered.capture());
            verify(cusEmailService, never()).sendPasswordResetOtp(anyString(), anyString());
        }
        assertTrue(raw.getAllValues().equals(delivered.getAllValues()), "Encoded and delivered OTPs must match");
    }

    private OtpChallenge savedChallenge() {
        ArgumentCaptor<OtpChallenge> saved = ArgumentCaptor.forClass(OtpChallenge.class);
        verify(otpChallengesRepository).save(saved.capture());
        return saved.getValue();
    }

    private void assertFreshOtp(OtpChallenge saved, OtpPurpose purpose, int resendNo) {
        assertSame(customer, saved.getCustomer());
        assertNull(saved.getCorporateUser());
        assertEquals(OtpSubjectType.CUSTOMER, saved.getSubjectType());
        assertEquals(purpose, saved.getPurpose());
        assertEquals(DeliveryChannel.EMAIL, saved.getDeliveryChannel());
        assertEquals(OtpStatus.ACTIVE, saved.getStatus());
        assertEquals(0, saved.getAttemptCount());
        assertEquals(5, saved.getMaxAttempts());
        assertEquals(5, saved.getMaxResendAttempts());
        assertEquals(resendNo, saved.getResendNo());
        assertEquals(saved.getLastSentAt().plusMinutes(5), saved.getExpiresAt());
        assertEquals(UpdatedByType.CUSTOMER, saved.getUpdatedByType());
        assertEquals(CUSTOMER_ID, saved.getUpdatedById());
        assertTrue(saved.getOtpHash().startsWith("synthetic-encoded-otp-"));
        assertNull(saved.getConsumedAt());
    }

    private void assertDeliveryFailure(String auditAction) {
        assertEquals(OtpStatus.EXPIRED, latest.getStatus());
        assertEquals(UpdatedByType.SYSTEM, latest.getUpdatedByType());
        assertNull(latest.getUpdatedById());
        verify(otpChallengesRepository, times(2)).save(latest);
        assertAudit(auditAction, ActorType.SYSTEM);
    }

    private void assertExpiredVerification(OtpPurpose purpose) {
        assertEquals(OtpStatus.EXPIRED, challenge.getStatus());
        assertEquals(UpdatedByType.SYSTEM, challenge.getUpdatedByType());
        assertNull(challenge.getUpdatedById());
        verify(otpChallengesRepository).save(challenge);
        verifyNoInteractions(passwordEncoder);
        assertAudit(purpose + "_OTP_EXPIRED", ActorType.SYSTEM);
        assertNoConsume(purpose);
    }

    private void assertConsumptionArguments(OtpPurpose purpose, String verifiedGroup, LocalDateTime before) {
        ArgumentCaptor<LocalDateTime> time = ArgumentCaptor.forClass(LocalDateTime.class);
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            verify(otpChallengesRepository).consumePasswordResetOtpIfActive(
                    eq(10L), eq(GROUP), eq(purpose), eq(OtpStatus.ACTIVE), eq(OtpStatus.CONSUMED), eq(verifiedGroup),
                    time.capture(), time.capture(), eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID), time.capture());
        } else {
            verify(otpChallengesRepository).consumePinResetOtpIfActive(
                    eq(10L), eq(GROUP), eq(purpose), eq(OtpStatus.ACTIVE), eq(OtpStatus.CONSUMED), eq(verifiedGroup),
                    time.capture(), time.capture(), eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID), time.capture());
        }
        assertEquals(3, time.getAllValues().size());
        assertTrue(time.getAllValues().stream().allMatch(value -> value.equals(time.getValue())));
        assertBetween(time.getValue(), before, LocalDateTime.now());
    }

    private void assertClaimArguments(OtpPurpose purpose, LocalDateTime before) {
        ArgumentCaptor<String> rotated = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<LocalDateTime> now = ArgumentCaptor.forClass(LocalDateTime.class);
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            verify(otpChallengesRepository).claimVerifiedPasswordResetChallengeIfMatch(
                    eq(10L), eq(GROUP), rotated.capture(), eq(purpose), eq(OtpStatus.CONSUMED),
                    eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID), now.capture());
        } else {
            verify(otpChallengesRepository).claimVerifiedPinResetChallengeIfMatch(
                    eq(10L), eq(GROUP), rotated.capture(), eq(purpose), eq(OtpStatus.CONSUMED),
                    eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID), now.capture());
        }
        assertFalse(GROUP.equals(rotated.getValue()));
        assertDoesNotThrow(() -> UUID.fromString(rotated.getValue()));
        assertBetween(now.getValue(), before, LocalDateTime.now());
    }

    private void assertCredentialReplacement(CustomerCredentials saved, OtpPurpose purpose, LocalDateTime before) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            assertTrue(NEW_PASSWORD_HASH.equals(saved.getPasswordHash()), "Store only the encoder result");
            assertFalse(NEW_PASSWORD.equals(saved.getPasswordHash()), "Do not persist a raw password");
            assertBetween(saved.getPasswordChangedAt(), before, LocalDateTime.now());
            assertEquals(3L, saved.getTokenVersion());
            assertEquals(PIN_HASH, saved.getTransactionPinHash());
        } else {
            assertTrue(NEW_PIN_HASH.equals(saved.getTransactionPinHash()), "Store only the encoder result");
            assertFalse(NEW_PIN.equals(saved.getTransactionPinHash()), "Do not persist a raw PIN");
            assertBetween(saved.getPinChangedAt(), before, LocalDateTime.now());
            assertEquals(0, saved.getFailedPinAttemptCount());
            assertNull(saved.getPinLockedUntil());
            assertEquals(2L, saved.getTokenVersion());
            assertEquals(PASSWORD_HASH, saved.getPasswordHash());
        }
        assertEquals(UpdatedByType.CUSTOMER, saved.getUpdatedByType());
        assertEquals(CUSTOMER_ID, saved.getUpdatedById());
        verify(passwordEncoder).encode(newSecret(purpose));
    }

    private void assertConfirmationOrder(OtpPurpose purpose) {
        var order = inOrder(otpChallengesRepository, credentialsRepository, customerRepository,
                passwordEncoder, cusSessionService, auditLogsRepository);
        if (purpose == OtpPurpose.PASSWORD_RESET) order.verify(otpChallengesRepository).findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(GROUP, purpose);
        order.verify(credentialsRepository).findByCustomerIdForUpdate(CUSTOMER_ID);
        order.verify(otpChallengesRepository).findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(CUSTOMER_ID, OtpSubjectType.CUSTOMER, purpose);
        order.verify(credentialsRepository).findById(CUSTOMER_ID);
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            order.verify(passwordEncoder).matches(NEW_PASSWORD, PASSWORD_HASH);
            order.verify(otpChallengesRepository).claimVerifiedPasswordResetChallengeIfMatch(
                    eq(10L), eq(GROUP), anyString(), eq(purpose), eq(OtpStatus.CONSUMED),
                    eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID), any(LocalDateTime.class));
        } else {
            order.verify(otpChallengesRepository).claimVerifiedPinResetChallengeIfMatch(
                    eq(10L), eq(GROUP), anyString(), eq(purpose), eq(OtpStatus.CONSUMED),
                    eq(UpdatedByType.CUSTOMER), eq(CUSTOMER_ID), any(LocalDateTime.class));
        }
        order.verify(credentialsRepository).findByCustomerIdForUpdate(CUSTOMER_ID);
        order.verify(passwordEncoder).encode(newSecret(purpose));
        order.verify(credentialsRepository).save(credentials);
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            order.verify(cusSessionService).revokeAllActiveCustomerSessions(
                    CUSTOMER_ID, "PASSWORD_RESET", UpdatedByType.CUSTOMER, CUSTOMER_ID);
        }
        order.verify(auditLogsRepository).save(any());
    }

    private void assertNoConsume(OtpPurpose purpose) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            verify(otpChallengesRepository, never()).consumePasswordResetOtpIfActive(any(), any(), any(), any(), any(),
                    any(), any(), any(), any(), any(), any());
        } else {
            verify(otpChallengesRepository, never()).consumePinResetOtpIfActive(any(), any(), any(), any(), any(),
                    any(), any(), any(), any(), any(), any());
        }
    }

    private void assertNoClaim(OtpPurpose purpose) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            verify(otpChallengesRepository, never()).claimVerifiedPasswordResetChallengeIfMatch(
                    any(), any(), any(), any(), any(), any(), any(), any());
        } else {
            verify(otpChallengesRepository, never()).claimVerifiedPinResetChallengeIfMatch(
                    any(), any(), any(), any(), any(), any(), any(), any());
        }
    }

    private void assertNoOtpWriteOrDelivery() {
        verify(otpChallengesRepository, never()).save(any());
        verifyNoInteractions(cusEmailService, passwordEncoder);
    }

    private void assertAudit(String action, ActorType actor) {
        ArgumentCaptor<AuditLogs> audits = ArgumentCaptor.forClass(AuditLogs.class);
        verify(auditLogsRepository, atLeastOnce()).save(audits.capture());
        AuditLogs audit = audits.getAllValues().stream().filter(row -> action.equals(row.getActionType()))
                .findFirst().orElseThrow();
        assertEquals(actor, audit.getActorType());
        if (actor == ActorType.CUSTOMER) {
            assertSame(customer, audit.getActorCustomer());
        } else {
            assertNull(audit.getActorCustomer());
        }
        assertTrue(List.of("OTP_CHALLENGE", "CUSTOMER_CREDENTIALS").contains(audit.getEntityType()));
        for (AuditLogs row : audits.getAllValues()) {
            String values = String.valueOf(row.getOldValues()) + String.valueOf(row.getNewValues());
            assertFalse(values.contains(NEW_PASSWORD) || values.contains(NEW_PIN) || values.contains(OTP)
                    || values.contains(ACCESS), "Recovery audit must not contain raw secrets");
        }
    }

    private static String newSecret(OtpPurpose purpose) {
        return purpose == OtpPurpose.PASSWORD_RESET ? NEW_PASSWORD : NEW_PIN;
    }

    private static String newHash(OtpPurpose purpose) {
        return purpose == OtpPurpose.PASSWORD_RESET ? NEW_PASSWORD_HASH : NEW_PIN_HASH;
    }

    private static CusOtpResendRequest resendRequest() {
        CusOtpResendRequest request = new CusOtpResendRequest();
        request.setChallengeGroupId(GROUP);
        return request;
    }

    private static CusPinResetOtpVerifyRequest pinVerification(String rawOtp) {
        CusPinResetOtpVerifyRequest request = new CusPinResetOtpVerifyRequest();
        request.setChallengeGroupId(GROUP);
        request.setOtp(rawOtp);
        return request;
    }

    private static CusPasswordResetConfirmRequest passwordConfirmation() {
        CusPasswordResetConfirmRequest request = new CusPasswordResetConfirmRequest();
        request.setVerifiedChallengeGroupId(GROUP);
        request.setNewPassword(NEW_PASSWORD);
        request.setConfirmPassword(NEW_PASSWORD);
        return request;
    }

    private static CusPinResetConfirmRequest pinConfirmation() {
        CusPinResetConfirmRequest request = new CusPinResetConfirmRequest();
        request.setVerifiedChallengeGroupId(GROUP);
        request.setNewPin(NEW_PIN);
        request.setConfirmPin(NEW_PIN);
        return request;
    }

    private static void assertBetween(LocalDateTime actual, LocalDateTime earliest, LocalDateTime latest) {
        assertNotNull(actual);
        assertFalse(actual.isBefore(earliest));
        assertFalse(actual.isAfter(latest));
    }

    private static TransactionAttribute transaction(String name, Class<?>... types) throws Exception {
        TransactionAttribute tx = new AnnotationTransactionAttributeSource().getTransactionAttribute(
                CusAuthService.class.getMethod(name, types), CusAuthService.class);
        assertNotNull(tx);
        return tx;
    }
}
