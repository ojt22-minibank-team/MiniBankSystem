package com.corebanking.service;

import com.corebanking.dto.*;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.CusOtpException;
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.repository.*;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.function.Executable;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.stubbing.Answer;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Plain JUnit/Mockito service tests. Real authentication/recovery services and
 * CusCustomerOtpLocks execute against synthetic, single-threaded repository state.
 * Mocked bulk consumption applies its documented conditional state transition;
 * it does not execute JPQL or prove locking, rollback or concurrent safety.
 * No Boot context, database, SMTP, real credentials or real JWTs are used.
 */
class CusIndividualAuthenticationFocusedUnitTest {
    private static final UUID ID = UUID.fromString("aaaaaaaa-1111-4111-8111-111111111111");
    private static final String CODE = "CUS-FOCUSED-001";
    private static final String EMAIL = "focused@example.test";
    private static final String GROUP = "bbbbbbbb-2222-4222-8222-222222222222";
    private static final String PASSWORD_HASH = "synthetic-original-password-hash";
    private static final String PIN_HASH = "synthetic-original-pin-hash";
    private static final String NEW_PASSWORD = "NewPass1!";
    private static final String PIN = "246810";
    private static final String ACCESS = "synthetic-focused-access";
    private static final String BEARER = "Bearer " + ACCESS;

    private final List<Object> dependencies = new ArrayList<>();
    private final List<OtpChallenge> rows = new ArrayList<>();
    private final Map<String, String> delivered = new HashMap<>();
    private CusCustomerRepository customers;
    private CusCredentialsRepository credentials;
    private CusOtpChallengesRepository otps;
    private CusAuditLogsRepository audits;
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
    private Claims accessClaims;
    private long nextId;

    @BeforeEach
    void setUp() {
        customers = dependency(CusCustomerRepository.class);
        var accounts = dependency(CusAccountsRepository.class);
        credentials = dependency(CusCredentialsRepository.class);
        otps = dependency(CusOtpChallengesRepository.class);
        audits = dependency(CusAuditLogsRepository.class);
        sessions = dependency(CusAuthSessionsRepository.class);
        revoked = dependency(CusJwtRevokedTokensRepository.class);
        encoder = dependency(PasswordEncoder.class);
        email = dependency(CusEmailService.class);
        jwt = dependency(CusJwtService.class);
        sessionValidator = dependency(CusSessionService.class);
        issuer = dependency(CusCustomerSessionIssuanceService.class);
        em = dependency(EntityManager.class);
        var passwordReset = new CusCustomerPasswordResetService(customers, accounts, credentials,
                otps, encoder, sessionValidator, email, audits);
        var pinReset = new CusCustomerPinResetService(credentials, otps, encoder, jwt,
                sessionValidator, email, audits);
        ReflectionTestUtils.setField(passwordReset, "entityManager", em);
        ReflectionTestUtils.setField(pinReset, "entityManager", em);
        auth = new CusAuthService(customers, accounts, credentials,
                dependency(CusCustomerLoginAttemptService.class), otps, encoder, sessions, jwt,
                sessionValidator, revoked, email, audits, passwordReset, pinReset,
                dependency(CusCustomerSessionService.class), issuer);
        ReflectionTestUtils.setField(auth, "entityManager", em);
        customer = Customers.builder().customerId(ID).customerCode(CODE).email(EMAIL)
                .customerType(CustomerType.PERSONAL).status(CustomerStatus.ACTIVE).build();
        credential = CustomerCredentials.builder().customerId(ID).customer(customer)
                .passwordHash(PASSWORD_HASH).transactionPinHash(PIN_HASH).tokenVersion(7L)
                .mustChangePassword(false).failedLoginCount(2).failedPinAttemptCount(3).build();
    }

    @AfterEach
    void noAuthenticationTokensOrSessionsMayBeIssued() {
        verifyNoInteractions(issuer, sessions, revoked);
        verify(jwt, never()).generateAccessToken(any(), anyString(), anyLong());
        verify(jwt, never()).generateRefreshToken(any(), anyString(), anyLong());
        verify(jwt, never()).generateRefreshToken(any(), anyString(), anyLong(), any(Date.class));
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void supersededRecoveryGroupCannotResendOrVerify(OtpPurpose purpose) {
        recoveryFixture();
        List<Object> originalCredentials = credentialState();
        String a = start(purpose);
        String codeA = delivered.get(a);
        String b = start(purpose);
        assertNotEquals(a, b);
        assertEquals(OtpStatus.EXPIRED, byGroup(a, purpose).orElseThrow().getStatus());
        assertEquals(OtpStatus.ACTIVE, byGroup(b, purpose).orElseThrow().getStatus());

        var resendError = rejectedWithoutMutation(CusOtpException.class, () -> resend(purpose, a));
        assertTrue(resendError.getMessage().contains("superseded"));
        var verifyError = rejectedWithoutMutation(CusOtpException.class, () -> verifyOtp(purpose, a, codeA));
        assertTrue(verifyError.getMessage().contains("superseded"));
        verify(encoder, never()).matches(anyString(), anyString());

        // Positive controls: the same repository answers permit B to resend and verify.
        assertEquals(1, resend(purpose, b).getResendNo());
        String verifiedB = verifyOtp(purpose, b, delivered.get(b));
        assertNotEquals(b, verifiedB);
        assertEquals(OtpStatus.CONSUMED, byGroup(verifiedB, purpose).orElseThrow().getStatus());
        assertEquals(originalCredentials, credentialState());
        verify(credentials, never()).save(any());
        verify(encoder, never()).matches(NEW_PASSWORD, PASSWORD_HASH);
    }

    @ParameterizedTest
    @EnumSource(value = OtpPurpose.class, names = {"PASSWORD_RESET", "PIN_RESET"})
    void newRecoveryInvalidatesPreviousVerifiedAuthorization(OtpPurpose purpose) {
        recoveryFixture();
        String a = start(purpose);
        String verifiedA = verifyOtp(purpose, a, delivered.get(a));
        OtpChallenge oldAuthority = byGroup(verifiedA, purpose).orElseThrow();
        String b = start(purpose);
        // A still exists, is consumed, and has not expired: rejection must be supersession.
        assertSame(oldAuthority, byGroup(verifiedA, purpose).orElseThrow());
        assertEquals(OtpStatus.CONSUMED, oldAuthority.getStatus());
        assertNotNull(oldAuthority.getConsumedAt());
        assertTrue(oldAuthority.getExpiresAt().isAfter(LocalDateTime.now()));
        var error = rejectedWithoutMutation(CusOtpException.class, () -> confirm(purpose, verifiedA));
        assertTrue(error.getMessage().contains("superseded"));
        assertEquals(PASSWORD_HASH, credential.getPasswordHash());
        assertEquals(PIN_HASH, credential.getTransactionPinHash());
        verify(credentials, never()).save(any());
        verify(sessionValidator, never()).revokeAllActiveCustomerSessions(any(), anyString(), any(), any());
        String verifiedB = verifyOtp(purpose, b, delivered.get(b));
        assertEquals(OtpStatus.CONSUMED, byGroup(verifiedB, purpose).orElseThrow().getStatus());
    }

    @ParameterizedTest
    @ValueSource(strings = {"ACTIVE", "EXPIRED", "BLOCKED", "CONSUMED_WITHOUT_TIMESTAMP"})
    void pinSetupRejectsUnverifiedOrMissingConsumptionTimestamp(String state) {
        loginFixture();
        OtpChallenge challenge = rows.getFirst();
        challenge.setStatus(state.equals("CONSUMED_WITHOUT_TIMESTAMP") ? OtpStatus.CONSUMED : OtpStatus.valueOf(state));
        challenge.setConsumedAt(null);
        credential.setMustChangePassword(false);
        if (state.equals("CONSUMED_WITHOUT_TIMESTAMP")) {
            rejectedWithoutMutation(CusSessionExpiredException.class, () -> auth.setupTransactionPin(GROUP, PIN, PIN));
        } else {
            rejectedWithoutMutation(CusOtpException.class, () -> auth.setupTransactionPin(GROUP, PIN, PIN));
        }
        verifyNoInteractions(encoder, audits);
        verify(credentials, never()).save(any());
    }

    static Stream<Arguments> invalidPasswords() {
        return Stream.of(
                Arguments.of("below-minimum", "Ab1!xyz"),
                Arguments.of("above-maximum", "Abcdef12!xy"),
                Arguments.of("missing-uppercase", "abcd12!x"),
                Arguments.of("missing-lowercase", "ABCD12!X"),
                Arguments.of("missing-number", "Abcdef!x"),
                Arguments.of("missing-symbol", "Abcdef12"),
                Arguments.of("space", "Ab1! xyZ"),
                Arguments.of("tab", "Ab1!\txyZ"),
                Arguments.of("newline", "Ab1!\nxyZ"));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidPasswords")
    void firstLoginPasswordPolicyRejectsEachInvalidCategory(String scenario, String password) {
        loginFixture();
        var failure = rejectedWithoutMutation(CusValidationException.class,
                () -> auth.changeFirstLoginPassword(GROUP, password, password));
        assertTrue(failure.getMessage().contains("between 8 and 10 characters"), scenario);
        verify(encoder).matches(password, PASSWORD_HASH);
        verify(encoder, never()).encode(anyString());
        verifyNoInteractions(audits);
    }

    @ParameterizedTest
    @ValueSource(strings = {"Abcd12!x", "Abcdef12!x"})
    void firstLoginPasswordPolicyAcceptsLengthBoundaries(String password) {
        loginFixture();
        when(encoder.encode(password)).thenReturn("synthetic-new-password-hash");
        auth.changeFirstLoginPassword(GROUP, password, password);
        assertEquals("synthetic-new-password-hash", credential.getPasswordHash());
        assertFalse(credential.isMustChangePassword());
        assertNull(credential.getTransactionPinHash());
        assertEquals(7L, credential.getTokenVersion());
        assertEquals(OtpStatus.CONSUMED, rows.getFirst().getStatus());
        verify(credentials).save(credential);
        verify(audits).save(argThat(a -> "FIRST_LOGIN_PASSWORD_CHANGED".equals(a.getActionType())));
        verify(otps, never()).save(any());
    }

    static Stream<Arguments> invalidPasswordFields() {
        var cases = new ArrayList<Arguments>();
        for (int field = 0; field < 3; field++) {
            for (String value : new String[]{null, "", " "}) {
                String[] values = {GROUP, NEW_PASSWORD, NEW_PASSWORD};
                values[field] = value;
                cases.add(Arguments.of("field-" + field + ":" + value, values[0], values[1], values[2]));
            }
        }
        cases.add(Arguments.of("confirmation-mismatch", GROUP, NEW_PASSWORD, "OtherPas1!"));
        return cases.stream();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidPasswordFields")
    void firstLoginPasswordFieldsAndConfirmationAreValidated(String scenario, String group, String password, String confirm) {
        rejectedWithoutMutation(CusValidationException.class, () -> auth.changeFirstLoginPassword(group, password, confirm));
        verifyNoInteractions(dependencies.toArray());
    }

    static Stream<Arguments> invalidPinFields() {
        var cases = new ArrayList<Arguments>();
        for (int field = 0; field < 3; field++) {
            for (String value : new String[]{null, "", " "}) {
                String[] values = {GROUP, PIN, PIN};
                values[field] = value;
                cases.add(Arguments.of("field-" + field + ":" + value, values[0], values[1], values[2]));
            }
        }
        // Five digits is already tested by CusAuthServiceBaselineTest.
        cases.add(Arguments.of("seven-digits", GROUP, "1234567", "1234567"));
        cases.add(Arguments.of("nonnumeric", GROUP, "12a456", "12a456"));
        cases.add(Arguments.of("confirmation-mismatch", GROUP, PIN, "135790"));
        return cases.stream();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("invalidPinFields")
    void pinSetupRejectsRemainingInvalidFieldAndFormatCases(String scenario, String group, String pin, String confirm) {
        rejectedWithoutMutation(CusValidationException.class, () -> auth.setupTransactionPin(group, pin, confirm));
        verifyNoInteractions(dependencies.toArray());
    }

    static Stream<Arguments> missingInputs() {
        var cases = new ArrayList<Arguments>();
        for (String operation : List.of("login", "verify", "resend")) {
            cases.add(Arguments.of(operation + ":null-request", operation, true, "value", "value"));
            int fields = operation.equals("resend") ? 1 : 2;
            for (int field = 0; field < fields; field++) {
                for (String value : new String[]{null, "", " "}) {
                    cases.add(Arguments.of(operation + ":field-" + field + ":" + value, operation,
                            false, field == 0 ? value : "value", field == 1 ? value : "value"));
                }
            }
        }
        return cases.stream();
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("missingInputs")
    void individualEntryPointsRejectMissingRequiredInputBeforeLookup(String scenario, String operation,
            boolean nullRequest, String first, String second) {
        if (operation.equals("login")) {
            var request = new CusLoginRequest();
            request.setLoginIdentifier(first);
            request.setPassword(second);
            rejectedWithoutMutation(CusValidationException.class, () -> auth.authenticateCredentials(nullRequest ? null : request));
        } else if (operation.equals("verify")) {
            var request = new CusOtpVerifyRequest();
            request.setChallengeGroupId(first);
            request.setOtp(second);
            rejectedWithoutMutation(CusOtpException.class, () -> auth.verifyLoginOtp(nullRequest ? null : request));
        } else {
            var request = new CusOtpResendRequest();
            request.setChallengeGroupId(first);
            rejectedWithoutMutation(CusOtpException.class, () -> auth.resendLoginOtp(nullRequest ? null : request));
        }
        verifyNoInteractions(dependencies.toArray());
    }

    @ParameterizedTest
    @ValueSource(strings = {"wrong-purpose", "wrong-subject", "corporate-binding", "missing-owner"})
    void loginOtpRejectsWrongPurposeSubjectCorporateBindingOrMissingOwner(String scenario) {
        loginFixture();
        OtpChallenge authoritative = challenge(OtpPurpose.LOGIN, GROUP, OtpStatus.ACTIVE);
        switch (scenario) {
            case "wrong-purpose" -> authoritative.setPurpose(OtpPurpose.PIN_RESET);
            case "wrong-subject" -> authoritative.setSubjectType(OtpSubjectType.CORPORATE_USER);
            case "corporate-binding" -> authoritative.setCorporateUser(CorporateUser.builder().corporateUserId(ID).build());
            case "missing-owner" -> authoritative.setCustomer(Customers.builder().build());
            default -> throw new AssertionError(scenario);
        }
        // Provisional identity and current original are valid. Inject an invalid
        // authoritative row to exercise the real defensive binding checks.
        when(otps.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(authoritative));
        var request = new CusOtpVerifyRequest();
        request.setChallengeGroupId(GROUP);
        request.setOtp("123456");
        var failure = rejectedWithoutMutation(CusOtpException.class, () -> auth.verifyLoginOtp(request));
        assertEquals("Invalid customer OTP challenge.", failure.getMessage());
        verify(credentials).findByCustomerIdForUpdate(ID);
        verifyNoInteractions(encoder, audits);
        // The foreign-UUID owner case is already covered in the login regression class.
    }

    private void loginFixture() {
        credential.setMustChangePassword(true);
        credential.setTransactionPinHash(null);
        OtpChallenge login = challenge(OtpPurpose.LOGIN, GROUP, OtpStatus.CONSUMED);
        rows.add(login);
        when(credentials.findByCustomerIdForUpdate(ID)).thenReturn(Optional.of(credential));
        when(credentials.findById(ID)).thenReturn(Optional.of(credential));
        when(otps.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(login));
        when(otps.findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(
                ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0)).thenReturn(Optional.of(login));
        when(otps.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(login));
    }

    private void recoveryFixture() {
        when(customers.findByCustomerCode(CODE)).thenReturn(Optional.of(customer));
        when(credentials.findByCustomerIdForUpdate(ID)).thenReturn(Optional.of(credential));
        when(em.find(Customers.class, ID, LockModeType.PESSIMISTIC_READ)).thenReturn(customer);
        when(em.find(CustomerCredentials.class, ID, LockModeType.PESSIMISTIC_WRITE)).thenReturn(credential);
        when(em.find(eq(OtpChallenge.class), any(), eq(LockModeType.PESSIMISTIC_WRITE)))
                .thenAnswer(call -> rows.stream().filter(r -> Objects.equals(r.getOtpId(), call.getArgument(1))).findFirst().orElse(null));
        when(otps.findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(anyString(), any(OtpPurpose.class)))
                .thenAnswer(call -> byGroup(call.getArgument(0), call.getArgument(1)));
        when(otps.findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                eq(ID), eq(OtpSubjectType.CUSTOMER), any(OtpPurpose.class)))
                .thenAnswer(call -> rows.stream().filter(r -> r.getPurpose() == call.getArgument(2))
                        .max(Comparator.comparing(OtpChallenge::getOtpId)));
        when(otps.findByCustomerAndPurposeAndStatus(eq(customer), any(OtpPurpose.class), eq(OtpStatus.ACTIVE)))
                .thenAnswer(call -> rows.stream().filter(r -> r.getPurpose() == call.getArgument(1)
                        && r.getStatus() == OtpStatus.ACTIVE).toList());
        when(otps.save(any(OtpChallenge.class))).thenAnswer(call -> {
            OtpChallenge row = call.getArgument(0);
            if (row.getOtpId() == null) {
                row.setOtpId(++nextId);
                rows.add(row);
            }
            return row;
        });
        when(encoder.encode(anyString())).thenAnswer(call -> "synthetic-encoded-" + call.getArgument(0));
        when(encoder.matches(anyString(), anyString())).thenAnswer(call ->
                ("synthetic-encoded-" + call.getArgument(0)).equals(call.getArgument(1)));
        doAnswer(call -> { delivered.put(latest(OtpPurpose.PASSWORD_RESET).getChallengeGroupId(), call.getArgument(1)); return null; })
                .when(email).sendPasswordResetOtp(eq(EMAIL), anyString());
        doAnswer(call -> { delivered.put(latest(OtpPurpose.PIN_RESET).getChallengeGroupId(), call.getArgument(1)); return null; })
                .when(email).sendPinResetOtp(eq(EMAIL), anyString());
        accessClaims = Jwts.claims();
        accessClaims.setSubject(ID.toString());
        accessClaims.put("tokenType", "ACCESS");
        when(jwt.getClaims(ACCESS)).thenReturn(accessClaims);
        when(sessionValidator.validateAccessSession(accessClaims)).thenReturn(AuthSession.builder()
                .customer(customer).subjectType(SessionSubjectType.CUSTOMER).build());
        Answer<Integer> consume = call -> {
            OtpChallenge row = rows.stream().filter(r -> Objects.equals(r.getOtpId(), call.getArgument(0))).findFirst().orElseThrow();
            if (!Objects.equals(row.getChallengeGroupId(), call.getArgument(1))
                    || row.getPurpose() != call.getArgument(2) || row.getStatus() != OtpStatus.ACTIVE
                    || !row.getExpiresAt().isAfter(call.getArgument(10))) return 0;
            row.setStatus(OtpStatus.CONSUMED);
            row.setChallengeGroupId(call.getArgument(5));
            row.setConsumedAt(call.getArgument(6));
            return 1;
        };
        when(otps.consumePasswordResetOtpIfActive(anyLong(), anyString(), eq(OtpPurpose.PASSWORD_RESET),
                eq(OtpStatus.ACTIVE), eq(OtpStatus.CONSUMED), anyString(), any(LocalDateTime.class),
                any(LocalDateTime.class), eq(UpdatedByType.CUSTOMER), eq(ID), any(LocalDateTime.class))).thenAnswer(consume);
        when(otps.consumePinResetOtpIfActive(anyLong(), anyString(), eq(OtpPurpose.PIN_RESET),
                eq(OtpStatus.ACTIVE), eq(OtpStatus.CONSUMED), anyString(), any(LocalDateTime.class),
                any(LocalDateTime.class), eq(UpdatedByType.CUSTOMER), eq(ID), any(LocalDateTime.class))).thenAnswer(consume);
    }

    private OtpChallenge challenge(OtpPurpose purpose, String group, OtpStatus status) {
        LocalDateTime now = LocalDateTime.now();
        return OtpChallenge.builder().otpId(++nextId).customer(customer).subjectType(OtpSubjectType.CUSTOMER)
                .purpose(purpose).challengeGroupId(group).status(status).otpHash("synthetic-otp-hash")
                .consumedAt(status == OtpStatus.CONSUMED ? now : null).expiresAt(now.plusMinutes(5))
                .maxAttempts(5).attemptCount(0).maxResendAttempts(5).resendNo(0).lastSentAt(now).build();
    }

    private Optional<OtpChallenge> byGroup(String group, OtpPurpose purpose) {
        return rows.stream().filter(r -> group.equals(r.getChallengeGroupId()) && r.getPurpose() == purpose)
                .max(Comparator.comparing(OtpChallenge::getOtpId));
    }

    private OtpChallenge latest(OtpPurpose purpose) {
        return rows.stream().filter(r -> r.getPurpose() == purpose).max(Comparator.comparing(OtpChallenge::getOtpId)).orElseThrow();
    }

    private String start(OtpPurpose purpose) {
        return purpose == OtpPurpose.PASSWORD_RESET
                ? auth.requestPasswordReset(new CusPasswordResetRequest(CODE)).getChallengeGroupId()
                : auth.requestPinReset(BEARER).getChallengeGroupId();
    }

    private CusOtpResendResponse resend(OtpPurpose purpose, String group) {
        var request = new CusOtpResendRequest();
        request.setChallengeGroupId(group);
        return purpose == OtpPurpose.PASSWORD_RESET ? auth.resendPasswordResetOtp(request)
                : auth.resendPinResetOtp(BEARER, request);
    }

    private String verifyOtp(OtpPurpose purpose, String group, String code) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            return auth.verifyPasswordResetOtp(new CusPasswordResetOtpVerifyRequest(group, code)).getChallengeGroupId();
        }
        var request = new CusPinResetOtpVerifyRequest();
        request.setChallengeGroupId(group);
        request.setOtp(code);
        return auth.verifyPinResetOtp(BEARER, request).getVerifiedChallengeGroupId();
    }

    private void confirm(OtpPurpose purpose, String group) {
        if (purpose == OtpPurpose.PASSWORD_RESET) {
            var request = new CusPasswordResetConfirmRequest();
            request.setVerifiedChallengeGroupId(group);
            request.setNewPassword(NEW_PASSWORD);
            request.setConfirmPassword(NEW_PASSWORD);
            auth.resetPassword(request);
        } else {
            var request = new CusPinResetConfirmRequest();
            request.setVerifiedChallengeGroupId(group);
            request.setNewPin(PIN);
            request.setConfirmPin(PIN);
            auth.resetTransactionPin(BEARER, request);
        }
    }

    private List<Object> credentialState() {
        return Arrays.asList(credential.getPasswordHash(), credential.getTransactionPinHash(),
                credential.getTokenVersion(), credential.isMustChangePassword(), credential.getFailedLoginCount(),
                credential.getLockedUntil(), credential.getFailedPinAttemptCount(), credential.getPinLockedUntil());
    }

    private List<List<Object>> otpState() {
        return rows.stream().map(r -> Arrays.<Object>asList(r.getOtpId(), r.getChallengeGroupId(), r.getPurpose(),
                r.getStatus(), r.getConsumedAt(), r.getAttemptCount(), r.getResendNo(), r.getOtpHash())).toList();
    }

    private long writeCalls() {
        Set<String> writes = Set.of("save", "saveAll", "saveAndFlush", "consumePasswordResetOtpIfActive",
                "consumePinResetOtpIfActive", "claimVerifiedPasswordResetChallengeIfMatch", "claimVerifiedPinResetChallengeIfMatch");
        return Stream.of(credentials, otps, audits).flatMap(m -> mockingDetails(m).getInvocations().stream())
                .filter(i -> writes.contains(i.getMethod().getName())).count();
    }

    private <T extends Throwable> T rejectedWithoutMutation(Class<T> type, Executable action) {
        List<Object> beforeCredentials = credentialState();
        List<List<Object>> beforeOtps = otpState();
        long beforeWrites = writeCalls();
        long beforeEncoder = mockingDetails(encoder).getInvocations().stream()
                .filter(i -> i.getMethod().getName().equals("encode")).count();
        T error = assertThrowsExactly(type, action);
        assertEquals(beforeCredentials, credentialState());
        assertEquals(beforeOtps, otpState());
        assertEquals(beforeWrites, writeCalls(), "Rejected operation must not add repository/audit writes");
        assertEquals(beforeEncoder, mockingDetails(encoder).getInvocations().stream()
                .filter(i -> i.getMethod().getName().equals("encode")).count(), "Rejected operation must not encode a secret");
        return error;
    }

    private <T> T dependency(Class<T> type) {
        T result = mock(type);
        dependencies.add(result);
        return result;
    }
}
