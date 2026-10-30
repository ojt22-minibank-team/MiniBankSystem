package com.corebanking.service;

import com.corebanking.dto.*;
import com.corebanking.controller.CusAuthController;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.*;
import com.corebanking.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.PersistenceContext;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.BeanWrapperImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.mail.MailSendException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;

import javax.sql.DataSource;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.locks.LockSupport;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Predicate;
import java.util.function.Supplier;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Real production services/proxies, Spring Data JPQL, Hibernate and MySQL 8 InnoDB
 * REPEATABLE READ, including independent transactions blocked on actual DB locks.
 * Email delivery is mocked; the Corporate repository spy gates entry only and
 * always executes its real SQL. JWTs use an explicitly synthetic signing key.
 * No Boot application context or application.properties is loaded. Schema creation
 * and destruction are restricted to the explicitly named disposable database.
 */
@EnabledIfSystemProperty(named = "cus.otp.jdbcUrl", matches = "jdbc:mysql://127\\.0\\.0\\.1:[0-9]+/cus_otp_security_test\\?.*")
@SpringJUnitConfig(CusOtpConcurrencyIntegrationTest.CusConfig.class)
class CusOtpConcurrencyIntegrationTest {
    enum CusFlow { LOGIN, CORPORATE, PASSWORD, PIN }
    record CusOutcome(Object value, Throwable error) { boolean ok() { return error == null; } }
    private static final String PASSWORD = "OldPass1!", NEW_PASSWORD = "NewPass1!", FIXED_OTP = "012345";
    @Autowired CusAuthService auth;
    @Autowired CusCorporateAuthService corporate;
    @Autowired CusCorporateFirstLoginService corporateSetup;
    @Autowired CusCustomerSessionIssuanceService issuer;
    @Autowired CusCustomerPasswordResetService passwordReset;
    @Autowired CusCustomerPinResetService pinReset;
    @Autowired CusOtpChallengesRepository otps;
    @Autowired CusCredentialsRepository credentials;
    @Autowired CusCorporateCredentialRepository corporateCredentials;
    @Autowired CusJwtService jwt;
    @Autowired CusEmailService email;
    @Autowired PasswordEncoder encoder;
    @Autowired PlatformTransactionManager manager;
    @Autowired JdbcTemplate jdbc;
    @Autowired CusSessionService sessions;
    @Autowired CusAuthSessionsRepository sessionRepository;
    @Autowired CusCorporateOtpService corporateOtp;
    @Autowired CusCorporateSessionService corporateSessions;
    @Autowired CusCorporateSessionActivityRepository corporateActivityRepository;
    @Autowired CusSqlProbe sql;
    @PersistenceContext EntityManager em;
    private UUID customerId, corporateId;
    private String customerCode, companyCode, bearer, refreshToken;
    private final Map<String, String> delivered = new ConcurrentHashMap<>();

    @BeforeEach void seedSyntheticCustomers() {
        reset(email); reset(corporateActivityTarget()); delivered.clear(); sql.reset();
        doAnswer(call -> { delivered.put(call.getArgument(0), call.getArgument(1)); return null; }).when(email).sendLoginOtp(anyString(), anyString());
        doAnswer(call -> { delivered.put(call.getArgument(0), call.getArgument(1)); return null; }).when(email).sendCorporateLoginOtp(anyString(), anyString());
        doAnswer(call -> { delivered.put(call.getArgument(0), call.getArgument(1)); return null; }).when(email).sendPasswordResetOtp(anyString(), anyString());
        doAnswer(call -> { delivered.put(call.getArgument(0), call.getArgument(1)); return null; }).when(email).sendPinResetOtp(anyString(), anyString());
        customerId = UUID.randomUUID(); customerCode = "OTP-" + customerId.toString().substring(0, 8);
        companyCode = "CO-" + customerId.toString().substring(0, 8);
        tx(() -> {
            Customers customer = Customers.builder().customerId(customerId).customerCode(customerCode).customerType(CustomerType.PERSONAL)
                    .fullName("Synthetic OTP Customer").email(customerId + "@example.invalid").status(CustomerStatus.ACTIVE).build();
            em.persist(customer);
            CustomerCredentials credential = CustomerCredentials.builder().customerId(customerId).customer(customer)
                    .passwordHash(encoder.encode(PASSWORD)).transactionPinHash(encoder.encode("123456")).mustChangePassword(false).build();
            em.persist(credential);
            Customers company = Customers.builder().customerId(UUID.randomUUID()).customerCode(companyCode).customerType(CustomerType.COMPANY)
                    .fullName("Synthetic Company").status(CustomerStatus.ACTIVE).build(); em.persist(company);
            CompanyInfo info = CompanyInfo.builder().customer(company).customerId(company.getCustomerId()).country("Myanmar")
                    .companyName("Synthetic Company").registrationNumber(UUID.randomUUID().toString()).build(); em.persist(info);
            CorporateUser user = CorporateUser.builder().companyInfo(info).corporateUserCode("CEO-TEST").corporateRole(CorporateRole.CEO)
                    .fullName("Synthetic Corporate User").email(companyCode + "@example.invalid").status(CorporateUserStatus.ACTIVE).build(); em.persist(user); em.flush();
            corporateId = user.getCorporateUserId();
            em.persist(CorporateCredential.builder().corporateUserId(corporateId).corporateUser(user).mustChangePassword(false)
                    .passwordHash(encoder.encode(PASSWORD)).transactionPinHash(encoder.encode("123456")).build());
            CusTokenResponse tokens = issuer.createAuthenticatedSession(customer, credential);
            bearer = "Bearer " + tokens.getAccessToken();
            refreshToken = tokens.getRefreshToken();
            return null;
        });
        assertEquals("REPEATABLE-READ", jdbc.queryForObject("SELECT @@transaction_isolation", String.class));
        assertEquals("InnoDB", jdbc.queryForObject("SELECT ENGINE FROM information_schema.tables WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='otp_challenges'", String.class));
    }

    private <T> T tx(Supplier<T> call) { return new TransactionTemplate(manager).execute(status -> call.get()); }
    private static <T> T dto(Class<T> type, String... fields) {
        try { T value = type.getDeclaredConstructor().newInstance(); BeanWrapperImpl bean = new BeanWrapperImpl(value);
            for (int i = 0; i < fields.length; i += 2) bean.setPropertyValue(fields[i], fields[i + 1]); return value;
        } catch (ReflectiveOperationException ex) { throw new AssertionError(ex); }
    }
    private String start(CusFlow flow) {
        return switch (flow) {
            case LOGIN -> auth.authenticateCredentials(dto(CusLoginRequest.class, "loginIdentifier", customerCode, "password", PASSWORD)).getChallengeGroupId();
            case CORPORATE -> corporate.login(dto(CusCorporateLoginRequest.class, "companyCustomerCode", companyCode, "corporateUserCode", "CEO-TEST", "password", PASSWORD)).getChallengeGroupId();
            case PASSWORD -> auth.requestPasswordReset(new CusPasswordResetRequest(customerCode)).getChallengeGroupId();
            case PIN -> auth.requestPinReset(bearer).getChallengeGroupId();
        };
    }
    private CusOtpResendResponse resend(CusFlow flow, String group) {
        CusOtpResendRequest request = dto(CusOtpResendRequest.class, "challengeGroupId", group);
        return switch (flow) {
            case LOGIN -> auth.resendLoginOtp(request);
            case CORPORATE -> corporate.resendLoginOtp(request);
            case PASSWORD -> auth.resendPasswordResetOtp(request);
            case PIN -> auth.resendPinResetOtp(bearer, request);
        };
    }
    private Object verify(CusFlow flow, String group, String code) {
        return switch (flow) {
            case LOGIN -> auth.verifyLoginOtp(dto(CusOtpVerifyRequest.class, "challengeGroupId", group, "otp", code));
            case CORPORATE -> corporate.verifyLoginOtp(dto(CusCorporateOtpVerifyRequest.class, "challengeGroupId", group, "otp", code));
            case PASSWORD -> auth.verifyPasswordResetOtp(new CusPasswordResetOtpVerifyRequest(group, code));
            case PIN -> auth.verifyPinResetOtp(bearer, dto(CusPinResetOtpVerifyRequest.class, "challengeGroupId", group, "otp", code));
        };
    }
    private String code(CusFlow flow) { return delivered.get(flow == CusFlow.CORPORATE ? companyCode + "@example.invalid" : customerId + "@example.invalid"); }
    private OtpPurpose purpose(CusFlow flow) { return flow == CusFlow.PASSWORD ? OtpPurpose.PASSWORD_RESET : flow == CusFlow.PIN ? OtpPurpose.PIN_RESET : OtpPurpose.LOGIN; }
    private OtpChallenge latest(CusFlow flow) {
        return tx(() -> flow == CusFlow.CORPORATE
                ? otps.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                        otps.findFirstByCorporateUser_CorporateUserIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(corporateId, OtpSubjectType.CORPORATE_USER, OtpPurpose.LOGIN, 0).orElseThrow().getChallengeGroupId(),
                        OtpSubjectType.CORPORATE_USER, OtpPurpose.LOGIN).orElseThrow()
                : otps.findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(customerId, OtpSubjectType.CUSTOMER, purpose(flow)).orElseThrow());
    }
    private void complete(CusFlow flow, String group) {
        if (flow == CusFlow.PASSWORD) auth.resetPassword(dto(CusPasswordResetConfirmRequest.class, "verifiedChallengeGroupId", group, "newPassword", NEW_PASSWORD, "confirmPassword", NEW_PASSWORD));
        else auth.resetTransactionPin(bearer, dto(CusPinResetConfirmRequest.class, "verifiedChallengeGroupId", group, "newPin", "246810", "confirmPin", "246810"));
    }
    private String verifiedGroup(CusFlow flow, Object response) {
        return flow == CusFlow.PASSWORD ? ((CusPasswordResetOtpVerifyResponse) response).getChallengeGroupId() : ((CusPinResetOtpVerifyResponse) response).getVerifiedChallengeGroupId();
    }

    @ParameterizedTest @EnumSource(CusFlow.class)
    void supersededGroupCannotResendOrVerify(CusFlow flow) {
        String a = start(flow), oldCode = code(flow), b = start(flow);
        assertNotEquals(a, b);
        assertThrows(CusOtpException.class, () -> resend(flow, a));
        assertThrows(CusOtpException.class, () -> verify(flow, a, oldCode));
        assertNotNull(verify(flow, b, code(flow)));
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void rotatedLatestCannotReactivateOriginalHistoryAndNewResetInvalidatesVerifiedAuthority(CusFlow flow) {
        String group = start(flow); resend(flow, group); resend(flow, group);
        String verified = verifiedGroup(flow, verify(flow, group, code(flow)));
        assertNotEquals(group, verified);
        assertThrows(CusOtpException.class, () -> resend(flow, group));
        assertThrows(CusOtpException.class, () -> verify(flow, group, code(flow)));
        start(flow);
        tx(() -> { latest(flow).setExpiresAt(LocalDateTime.now().minusSeconds(1)); return null; });
        assertThrows(CusOtpException.class, () -> complete(flow, verified));
        assertThrows(CusOtpException.class, () -> resend(flow, group));
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void completedResetAuthorizationIsOneTimeAndBoundToExistingExpiry(CusFlow flow) {
        String group = start(flow);
        String verified = verifiedGroup(flow, verify(flow, group, code(flow)));
        complete(flow, verified);
        assertThrows(CusOtpException.class, () -> complete(flow, verified));
        String next = start(flow);
        String expiring = verifiedGroup(flow, verify(flow, next, code(flow)));
        tx(() -> { latest(flow).setExpiresAt(LocalDateTime.now().minusSeconds(1)); return null; });
        assertThrows(CusOtpException.class, () -> complete(flow, expiring));
    }


    /** Release competing service transactions only after observing their actual
     * InnoDB lock waits. Each worker uses an independent connection/transaction. */
    private List<CusOutcome> race(CusFlow flow, Supplier<?>... calls) {
        ExecutorService workers = Executors.newFixedThreadPool(calls.length);
        List<Future<CusOutcome>> futures = new ArrayList<>();
        try {
            tx(() -> {
                if (flow == CusFlow.CORPORATE) corporateCredentials.findByCorporateUserIdForUpdate(corporateId).orElseThrow();
                else credentials.findByCustomerIdForUpdate(customerId).orElseThrow();
                for (Supplier<?> call : calls) futures.add(workers.submit(() -> {
                    try { return new CusOutcome(call.get(), null); }
                    catch (Throwable failure) { return new CusOutcome(null, failure); }
                }));
                awaitBlocked(calls.length);
                return null;
            });
            List<CusOutcome> results = new ArrayList<>();
            for (Future<CusOutcome> future : futures) results.add(future.get(20, TimeUnit.SECONDS));
            for (CusOutcome result : results) if (!result.ok()) {
                assertTrue(result.error instanceof CusOtpException || result.error instanceof CusValidationException,
                        () -> "Unexpected concurrency failure: " + result.error);
            }
            return results;
        } catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new AssertionError(ex); }
        catch (ExecutionException | TimeoutException ex) { throw new AssertionError(ex); }
        finally { workers.shutdownNow(); }
    }
    private void awaitBlocked(int expected) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        int waiting;
        do {
            waiting = jdbc.queryForObject("SELECT COUNT(DISTINCT w.REQUESTING_ENGINE_TRANSACTION_ID) "
                    + "FROM performance_schema.data_lock_waits w JOIN performance_schema.data_locks l "
                    + "ON l.ENGINE_LOCK_ID=w.REQUESTING_ENGINE_LOCK_ID WHERE l.OBJECT_SCHEMA=DATABASE()", Integer.class);
            if (waiting >= expected) return;
            LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(10));
        } while (System.nanoTime() < deadline);
        fail("Expected " + expected + " independent InnoDB lock waiters, observed " + waiting);
    }
    private long sessionCount(CusFlow flow) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM auth_sessions WHERE "
                + (flow == CusFlow.CORPORATE ? "corporate_user_id" : "customer_id") + "=UNHEX(?)", Long.class,
                (flow == CusFlow.CORPORATE ? corporateId : customerId).toString().replace("-", ""));
    }
    private void fixCode(CusFlow flow) {
        tx(() -> { latest(flow).setOtpHash(encoder.encode(FIXED_OTP)); return null; });
    }
    private void oneSuccess(List<CusOutcome> results) { assertEquals(1, results.stream().filter(CusOutcome::ok).count()); }

    @ParameterizedTest @EnumSource(CusFlow.class)
    void simultaneousResendsHaveDistinctSequences(CusFlow flow) {
        String group = start(flow);
        List<CusOutcome> results = race(flow, () -> resend(flow, group), () -> resend(flow, group));
        assertTrue(results.stream().allMatch(CusOutcome::ok));
        OtpChallenge current = latest(flow);
        assertEquals(2, current.getResendNo()); assertEquals(0, current.getAttemptCount());
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(DISTINCT resend_no) FROM otp_challenges WHERE challenge_group_id=?", Integer.class, group));
        assertEquals(3, jdbc.queryForObject("SELECT COUNT(*) FROM otp_challenges WHERE challenge_group_id=?", Integer.class, group));
        assertNotNull(verify(flow, group, code(flow)));
    }

    @ParameterizedTest @EnumSource(CusFlow.class)
    void simultaneousCorrectVerificationsConsumeOnceAndIssueAtMostOneSession(CusFlow flow) {
        String group = start(flow), otp = code(flow); long before = sessionCount(flow);
        oneSuccess(race(flow, () -> verify(flow, group, otp), () -> verify(flow, group, otp)));
        assertEquals(before + (flow == CusFlow.LOGIN || flow == CusFlow.CORPORATE ? 1 : 0), sessionCount(flow));
        assertThrows(CusOtpException.class, () -> verify(flow, group, otp));
    }

    @ParameterizedTest @EnumSource(CusFlow.class)
    void fiveSimultaneousWrongAttemptsBlockWithoutLostUpdates(CusFlow flow) {
        String group = start(flow);
        List<CusOutcome> outcomes = race(flow, () -> verify(flow, group, FIXED_OTP), () -> verify(flow, group, FIXED_OTP),
                () -> verify(flow, group, FIXED_OTP), () -> verify(flow, group, FIXED_OTP), () -> verify(flow, group, FIXED_OTP));
        assertTrue(outcomes.stream().noneMatch(CusOutcome::ok));
        assertEquals(5, latest(flow).getAttemptCount()); assertEquals(OtpStatus.BLOCKED, latest(flow).getStatus());
        resend(flow, group);
        assertEquals(1, latest(flow).getResendNo()); assertEquals(0, latest(flow).getAttemptCount());
        assertEquals(OtpStatus.ACTIVE, latest(flow).getStatus());
        assertNotNull(verify(flow, group, code(flow)));
    }

    @ParameterizedTest @EnumSource(CusFlow.class)
    void correctVerificationRacingResendIsLinearizable(CusFlow flow) {
        String group = start(flow); fixCode(flow);
        List<CusOutcome> results = race(flow, () -> verify(flow, group, FIXED_OTP), () -> resend(flow, group));
        oneSuccess(results);
        if (results.get(0).ok()) {
            assertThrows(CusOtpException.class, () -> resend(flow, group));
            assertThrows(CusOtpException.class, () -> verify(flow, group, FIXED_OTP));
        } else {
            assertEquals(1, latest(flow).getResendNo());
            assertNotNull(verify(flow, group, code(flow)));
        }
    }

    @ParameterizedTest @EnumSource(CusFlow.class)
    void newStartRacingVerificationSupersedesOldGroup(CusFlow flow) {
        String a = start(flow), otp = code(flow);
        List<CusOutcome> results = race(flow, () -> verify(flow, a, otp), () -> start(flow));
        assertTrue(results.get(1).ok()); String b = (String) results.get(1).value;
        assertNotEquals(a, b);
        assertThrows(CusOtpException.class, () -> resend(flow, a));
        assertThrows(CusOtpException.class, () -> verify(flow, a, otp));
        assertNotNull(verify(flow, b, code(flow)));
    }

    @ParameterizedTest @EnumSource(CusFlow.class)
    void newStartRacingResendCannotReactivateOldGroup(CusFlow flow) {
        String a = start(flow);
        List<CusOutcome> results = race(flow, () -> resend(flow, a), () -> start(flow));
        assertTrue(results.get(1).ok());
        assertThrows(CusOtpException.class, () -> resend(flow, a));
        assertNotNull(verify(flow, (String) results.get(1).value, code(flow)));
    }

    @ParameterizedTest @EnumSource(CusFlow.class)
    void resendQuotaAndLastOtpVerificationRemainUnchanged(CusFlow flow) {
        String group = start(flow);
        for (int sequence = 1; sequence <= 5; sequence++) {
            resend(flow, group); assertEquals(sequence, latest(flow).getResendNo());
        }
        String last = code(flow);
        assertThrows(CusOtpResendLimitException.class, () -> resend(flow, group));
        assertNotNull(verify(flow, group, last));
        assertThrows(CusOtpException.class, () -> verify(flow, group, last));
    }

    @ParameterizedTest @EnumSource(CusFlow.class)
    void expiredOtpCannotVerify(CusFlow flow) {
        String group = start(flow), otp = code(flow);
        tx(() -> { latest(flow).setExpiresAt(LocalDateTime.now().minusSeconds(1)); return null; });
        assertThrows(CusOtpException.class, () -> verify(flow, group, otp));
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void simultaneousResetCompletionsClaimOnce(CusFlow flow) {
        String group = start(flow), verified = verifiedGroup(flow, verify(flow, group, code(flow)));
        long version = credentials.findById(customerId).orElseThrow().getTokenVersion();
        oneSuccess(race(flow, () -> { complete(flow, verified); return true; }, () -> { complete(flow, verified); return true; }));
        CustomerCredentials changed = credentials.findById(customerId).orElseThrow();
        if (flow == CusFlow.PASSWORD) {
            assertEquals(version + 1, changed.getTokenVersion()); assertTrue(encoder.matches(NEW_PASSWORD, changed.getPasswordHash()));
        } else assertTrue(encoder.matches("246810", changed.getTransactionPinHash()));
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"LOGIN", "CORPORATE"})
    void simultaneousFirstLoginPasswordChangesOnlyOnce(CusFlow flow) {
        tx(() -> {
            if (flow == CusFlow.LOGIN) { CustomerCredentials c = credentials.findByCustomerIdForUpdate(customerId).orElseThrow(); c.setMustChangePassword(true); c.setTransactionPinHash(null); }
            else { CorporateCredential c = corporateCredentials.findByCorporateUserIdForUpdate(corporateId).orElseThrow(); c.setMustChangePassword(true); c.setTransactionPinHash(null); }
            return null;
        });
        String group = start(flow); verify(flow, group, code(flow));
        Supplier<?> change = () -> {
            if (flow == CusFlow.LOGIN) auth.changeFirstLoginPassword(group, NEW_PASSWORD, NEW_PASSWORD);
            else corporateSetup.changeFirstLoginPassword(dto(CusCorporateFirstLoginPasswordRequest.class, "challengeGroupId", group, "newPassword", NEW_PASSWORD, "confirmPassword", NEW_PASSWORD));
            return true;
        };
        oneSuccess(race(flow, change, change));
        boolean mustChange = flow == CusFlow.LOGIN ? credentials.findById(customerId).orElseThrow().isMustChangePassword()
                : corporateCredentials.findById(corporateId).orElseThrow().isMustChangePassword();
        assertFalse(mustChange);
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"LOGIN", "CORPORATE"})
    void simultaneousFirstLoginPinCompletionIssuesOnlyOneSession(CusFlow flow) {
        tx(() -> {
            if (flow == CusFlow.LOGIN) credentials.findByCustomerIdForUpdate(customerId).orElseThrow().setTransactionPinHash(null);
            else corporateCredentials.findByCorporateUserIdForUpdate(corporateId).orElseThrow().setTransactionPinHash(null);
            return null;
        });
        String group = start(flow); verify(flow, group, code(flow));
        if (flow == CusFlow.CORPORATE) corporateSetup.setupTransactionPin(dto(CusCorporatePinSetupRequest.class, "challengeGroupId", group, "transactionPin", "246810", "confirmTransactionPin", "246810"));
        long before = sessionCount(flow);
        Supplier<?> complete = () -> flow == CusFlow.LOGIN ? auth.setupTransactionPin(group, "246810", "246810") : corporate.completeFirstLogin(group);
        oneSuccess(race(flow, complete, complete));
        assertEquals(before + 1, sessionCount(flow));
    }


    @ParameterizedTest @EnumSource(CusFlow.class)
    void waiterWithOldRepeatableReadSnapshotMustSeeCommittedNewGroup(CusFlow flow) throws Exception {
        String oldGroup = start(flow), otp = code(flow), newGroup = UUID.randomUUID().toString();
        ExecutorService worker = Executors.newSingleThreadExecutor();
        List<Future<CusOutcome>> pending = new ArrayList<>();
        try {
            tx(() -> {
                if (flow == CusFlow.CORPORATE) corporateCredentials.findByCorporateUserIdForUpdate(corporateId).orElseThrow();
                else credentials.findByCustomerIdForUpdate(customerId).orElseThrow();
                pending.add(worker.submit(() -> {
                    // Force a snapshot older than the new group's commit, even
                    // for PIN reset, whose subject comes from a signed JWT.
                    return tx(() -> {
                        assertTrue(otps.findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(oldGroup, purpose(flow)).isPresent());
                        try { return new CusOutcome(verify(flow, oldGroup, otp), null); }
                        catch (Throwable error) { return new CusOutcome(null, error); }
                    });
                }));
                awaitBlocked(1);
                // Same owner lock/order as a new challenge start. Deliberately
                // publish the replacement AFTER the waiter's provisional read.
                OtpChallenge original = latest(flow);
                OtpChallenge replacement = OtpChallenge.builder().customer(original.getCustomer()).corporateUser(original.getCorporateUser())
                        .subjectType(original.getSubjectType()).purpose(original.getPurpose()).challengeGroupId(newGroup)
                        .otpHash(encoder.encode(FIXED_OTP)).deliveryChannel(DeliveryChannel.EMAIL).status(OtpStatus.ACTIVE)
                        .expiresAt(LocalDateTime.now().plusMinutes(5)).lastSentAt(LocalDateTime.now())
                        .resendNo(0).maxResendAttempts(5).attemptCount(0).maxAttempts(5).build();
                em.persist(replacement); em.flush();
                return null;
            });
            CusOutcome result = pending.getFirst().get(20, TimeUnit.SECONDS);
            assertInstanceOf(CusOtpException.class, result.error);
            assertEquals(newGroup, latest(flow).getChallengeGroupId());
            assertEquals(0, latest(flow).getAttemptCount());
        } finally { worker.shutdownNow(); }
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void rollbackRestoresClaimCredentialsAndSessionsTogether(CusFlow flow) {
        String group = start(flow), verified = verifiedGroup(flow, verify(flow, group, code(flow)));
        CustomerCredentials before = credentials.findById(customerId).orElseThrow();
        long auditCount = jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs", Long.class);
        long revokedCount = jdbc.queryForObject("SELECT COUNT(*) FROM auth_sessions WHERE customer_id=UNHEX(?) AND revoked_at IS NOT NULL", Long.class, customerId.toString().replace("-", ""));
        assertThrows(IllegalStateException.class, () -> tx(() -> {
            complete(flow, verified);
            throw new IllegalStateException("Synthetic post-operation rollback");
        }));
        CustomerCredentials after = credentials.findById(customerId).orElseThrow();
        assertEquals(before.getPasswordHash(), after.getPasswordHash());
        assertEquals(before.getTransactionPinHash(), after.getTransactionPinHash());
        assertEquals(before.getTokenVersion(), after.getTokenVersion());
        assertEquals(verified, latest(flow).getChallengeGroupId());
        assertEquals(auditCount, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs", Long.class));
        assertEquals(revokedCount, jdbc.queryForObject("SELECT COUNT(*) FROM auth_sessions WHERE customer_id=UNHEX(?) AND revoked_at IS NOT NULL", Long.class, customerId.toString().replace("-", "")));
        complete(flow, verified); // rollback did not burn the one-time claim
        assertThrows(CusOtpException.class, () -> complete(flow, verified));
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void atomicClaimRejectsExpiredVerifiedAuthorizationAtDatabaseBoundary(CusFlow flow) {
        String group = start(flow), verified = verifiedGroup(flow, verify(flow, group, code(flow)));
        tx(() -> { latest(flow).setExpiresAt(LocalDateTime.now().minusSeconds(1)); return null; });
        int claimed = tx(() -> {
            OtpChallenge row = latest(flow);
            return flow == CusFlow.PASSWORD
                    ? otps.claimVerifiedPasswordResetChallengeIfMatch(row.getOtpId(), verified, UUID.randomUUID().toString(), purpose(flow), OtpStatus.CONSUMED, UpdatedByType.CUSTOMER, customerId, LocalDateTime.now())
                    : otps.claimVerifiedPinResetChallengeIfMatch(row.getOtpId(), verified, UUID.randomUUID().toString(), purpose(flow), OtpStatus.CONSUMED, UpdatedByType.CUSTOMER, customerId, LocalDateTime.now());
        });
        assertEquals(0, claimed);
        assertEquals(verified, latest(flow).getChallengeGroupId());
    }


    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"LOGIN", "CORPORATE"})
    void supersededVerifiedFirstLoginCannotChangePasswordSetupPinOrIssueSession(CusFlow flow) {
        tx(() -> {
            if (flow == CusFlow.LOGIN) { CustomerCredentials c = credentials.findByCustomerIdForUpdate(customerId).orElseThrow(); c.setMustChangePassword(true); c.setTransactionPinHash(null); }
            else { CorporateCredential c = corporateCredentials.findByCorporateUserIdForUpdate(corporateId).orElseThrow(); c.setMustChangePassword(true); c.setTransactionPinHash(null); }
            return null;
        });
        String a = start(flow); verify(flow, a, code(flow));
        String b = start(flow); long before = sessionCount(flow);
        if (flow == CusFlow.LOGIN) {
            assertThrows(CusOtpException.class, () -> auth.changeFirstLoginPassword(a, NEW_PASSWORD, NEW_PASSWORD));
            assertThrows(CusOtpException.class, () -> auth.setupTransactionPin(a, "246810", "246810"));
        } else {
            assertThrows(CusOtpException.class, () -> corporateSetup.changeFirstLoginPassword(dto(CusCorporateFirstLoginPasswordRequest.class, "challengeGroupId", a, "newPassword", NEW_PASSWORD, "confirmPassword", NEW_PASSWORD)));
            assertThrows(CusOtpException.class, () -> corporateSetup.setupTransactionPin(dto(CusCorporatePinSetupRequest.class, "challengeGroupId", a, "transactionPin", "246810", "confirmTransactionPin", "246810")));
            assertThrows(CusOtpException.class, () -> corporate.completeFirstLogin(a));
        }
        assertEquals(before, sessionCount(flow));
        assertNotNull(verify(flow, b, code(flow)));
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void newResetRacingCompletionLeavesOnlyNewGroupUsable(CusFlow flow) {
        String a = start(flow), verified = verifiedGroup(flow, verify(flow, a, code(flow)));
        List<CusOutcome> outcomes = race(flow, () -> { complete(flow, verified); return true; }, () -> start(flow));
        assertTrue(outcomes.get(1).ok());
        assertThrows(CusOtpException.class, () -> complete(flow, verified));
        assertNotNull(verify(flow, (String) outcomes.get(1).value, code(flow)));
    }

    @Test void differentResetPurposesSerializeOnSameCustomerWithoutLosingCurrentGroups() {
        List<CusOutcome> outcomes = race(CusFlow.PASSWORD, () -> start(CusFlow.PASSWORD), () -> start(CusFlow.PIN));
        assertTrue(outcomes.stream().allMatch(CusOutcome::ok));
        String passwordGroup = (String) outcomes.get(0).value, pinGroup = (String) outcomes.get(1).value;
        assertEquals(passwordGroup, latest(CusFlow.PASSWORD).getChallengeGroupId());
        assertEquals(pinGroup, latest(CusFlow.PIN).getChallengeGroupId());
        assertEquals(OtpStatus.ACTIVE, latest(CusFlow.PASSWORD).getStatus());
        assertEquals(OtpStatus.ACTIVE, latest(CusFlow.PIN).getStatus());
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"LOGIN", "CORPORATE"})
    void fiveFailedPasswordsKeepFifteenMinuteLockAndNeverIssueOtp(CusFlow flow) {
        LocalDateTime before = LocalDateTime.now();
        for (int count = 1; count <= 5; count++) {
            final int attempt = count;
            RuntimeException error = assertThrows(RuntimeException.class, () -> {
                if (flow == CusFlow.LOGIN) auth.authenticateCredentials(dto(CusLoginRequest.class, "loginIdentifier", customerCode, "password", "WrongPass1!"));
                else corporate.login(dto(CusCorporateLoginRequest.class, "companyCustomerCode", companyCode, "corporateUserCode", "CEO-TEST", "password", "WrongPass1!"));
            });
            assertTrue(error instanceof CusAuthenticationException || (attempt == 5 && error instanceof CusAccountLockedException));
        }
        int failed = flow == CusFlow.LOGIN ? credentials.findById(customerId).orElseThrow().getFailedLoginCount() : corporateCredentials.findById(corporateId).orElseThrow().getFailedLoginCount();
        LocalDateTime locked = flow == CusFlow.LOGIN ? credentials.findById(customerId).orElseThrow().getLockedUntil() : corporateCredentials.findById(corporateId).orElseThrow().getLockedUntil();
        assertEquals(5, failed); assertNotNull(locked);
        assertFalse(locked.isBefore(before.plusMinutes(15))); assertFalse(locked.isAfter(LocalDateTime.now().plusMinutes(15)));
        assertThrows(CusAccountLockedException.class, () -> start(flow));
        assertTrue(delivered.isEmpty());
    }

    // These are security invariants, not expected-failure tests. A reproduced
    // vulnerability remains red until its owner approves and implements a fix.
    private String sid() { return jwt.getClaims(bearer.substring(7)).get("sid", String.class); }
    private AuthSession sessionRow() {
        return tx(() -> sessionRepository.findBySessionUuid(sid()).orElseThrow());
    }
    private CusJob job(String name, Supplier<?> operation) { return new CusJob(name, operation); }
    private boolean credentialSelect(String statement) {
        return statement.contains(" from customer_credentials ") && statement.contains("for update");
    }
    private boolean otpLock(String statement) {
        return statement.contains(" from otp_challenges ") && statement.contains("for update");
    }
    private boolean sessionActivityBoundary(String statement) {
        return (statement.startsWith("update auth_sessions set ") && statement.contains("corporate_user_id="))
                || (statement.startsWith("select") && statement.contains(" from auth_sessions ") && statement.contains("for update"));
    }
    private static boolean deadlock(Throwable error) {
        for (Throwable t = error; t != null; t = t.getCause()) {
            if (t instanceof java.sql.SQLException sqlError && sqlError.getErrorCode() == 1213) return true;
        }
        return false;
    }
    private static void succeeded(CusOutcome result) {
        assertNull(result.error, () -> "Operation failed: " + result.error);
        assertNotNull(result.value);
    }
    private CusOutcome revokeSystem() {
        try {
            tx(() -> { sessions.revokeSession(sessionRepository.findBySessionUuid(sid()).orElseThrow(), "IDLE_TIMEOUT"); return true; });
            return new CusOutcome(true, null);
        } catch (Throwable error) { return new CusOutcome(null, error); }
    }

    enum CusSystemEnd { EXPLICIT, IDLE, ABSOLUTE }
    @ParameterizedTest @EnumSource(CusSystemEnd.class)
    void remainingPinActivityCannotUndoCommittedSystemRevocation(CusSystemEnd end) throws Exception {
        AuthSession original = sessionRow();
        LocalDateTime expiredAt = end == CusSystemEnd.IDLE ? original.getLastSeenAt().plusMinutes(5) : original.getIssuedAt().plusHours(24);
        CusOutcome pending;
        try (CusSqlGate gate = sql.arm("cus-pin-system", this::sessionActivityBoundary, 1);
             CusJob pin = job("cus-pin-system", () -> auth.requestPinReset(bearer))) {
            gate.await();
            if (end == CusSystemEnd.EXPLICIT) succeeded(revokeSystem());
            else try (var clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS)) {
                clock.when(LocalDateTime::now).thenReturn(expiredAt);
                assertThrows(CusSessionExpiredException.class, () -> sessions.validateAccessSessionWithoutActivity(jwt.getClaims(bearer.substring(7))));
            }
            assertNotNull(sessionRow().getRevokedAt(), "System revocation committed before the pending activity SQL");
            gate.release(); pending = pin.result();
        }
        AuthSession committed = sessionRow();
        assertAll(() -> assertTrue(pending.error instanceof CusAuthenticationException || pending.error instanceof CusSessionExpiredException,
                        "PIN reset must fail closed when revocation commits before its activity write"),
                () -> assertNotNull(committed.getRevokedAt(), "PIN activity must never erase a committed revocation"),
                () -> assertEquals(end == CusSystemEnd.ABSOLUTE ? "SESSION_EXPIRED" : "IDLE_TIMEOUT", committed.getRevokeReason()),
                () -> assertEquals(original.getIssuedAt(), committed.getIssuedAt()),
                () -> assertEquals(original.getRefreshExpiresAt(), committed.getRefreshExpiresAt()),
                () -> {
                    if (end == CusSystemEnd.EXPLICIT) assertThrows(CusAuthenticationException.class,
                            () -> sessions.validateAccessSessionWithoutActivity(jwt.getClaims(bearer.substring(7))), "A revoked session must not become usable");
                    else try (var clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS)) {
                        clock.when(LocalDateTime::now).thenReturn(expiredAt);
                        assertThrows(CusAuthenticationException.class, () -> sessions.validateAccessSessionWithoutActivity(jwt.getClaims(bearer.substring(7))),
                                "Already revoked sessions use the existing revocation rejection before expiry checks");
                    }
                });
    }

    @Test void remainingPinResetAndLogoutMustNotDeadlockOrUndoLogout() throws Exception {
        try (CusSqlGate gate = sql.arm("cus-pin-logout", this::sessionActivityBoundary, 1);
             CusJob pin = job("cus-pin-logout", () -> auth.requestPinReset(bearer))) {
            gate.await();
            try (CusJob logout = job("cus-logout", () -> { auth.logout(bearer); return true; })) {
                CusOutcome l = logout.result(); succeeded(l);
                assertNotNull(sessionRow().getRevokedAt(), "Logout must commit while the older activity SQL is paused");
                gate.release(); CusOutcome p = pin.result();
                System.out.println("CUS_SESSION_LOGOUT outcomes: PIN deadlock=" + deadlock(p.error) + ", logout deadlock=" + deadlock(l.error));
                assertAll(() -> assertFalse(deadlock(p.error), "PIN transaction deadlocked with logout"),
                        () -> assertFalse(deadlock(l.error), "Logout transaction deadlocked with PIN reset"),
                        () -> succeeded(l),
                        () -> assertTrue(p.error instanceof CusAuthenticationException || p.error instanceof CusSessionExpiredException,
                                "PIN reset must fail closed after logout wins"),
                        () -> assertNotNull(sessionRow().getRevokedAt(), "Logout must remain committed"),
                        () -> assertThrows(CusAuthenticationException.class,
                                () -> auth.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", refreshToken)),
                                "The logged-out session's refresh token must remain unusable"));
            }
        }
    }

    @Test void remainingPinResetAndRefreshMustNotDeadlockOrOverwriteRotation() throws Exception {
        String oldHash = sessionRow().getRefreshTokenHash();
        try (CusSqlGate gate = sql.arm("cus-pin-refresh", this::sessionActivityBoundary, 1);
             CusJob pin = job("cus-pin-refresh", () -> auth.requestPinReset(bearer))) {
            gate.await();
            try (CusJob refresh = job("cus-refresh", () -> auth.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", refreshToken)))) {
                CusOutcome r = refresh.result(); succeeded(r);
                CusTokenResponse beforeResume = (CusTokenResponse) r.value;
                assertEquals(sessions.hashRefreshToken(beforeResume.getRefreshToken()), sessionRow().getRefreshTokenHash());
                gate.release(); CusOutcome p = pin.result();
                System.out.println("CUS_SESSION_REFRESH outcomes: PIN deadlock=" + deadlock(p.error) + ", refresh deadlock=" + deadlock(r.error));
                assertAll(() -> assertFalse(deadlock(p.error), "PIN transaction deadlocked with refresh"),
                        () -> assertFalse(deadlock(r.error), "Refresh transaction deadlocked with PIN reset"), () -> succeeded(r));
                CusTokenResponse rotated = (CusTokenResponse) r.value;
                String committedHash = sessionRow().getRefreshTokenHash();
                assertAll(() -> assertNotEquals(oldHash, committedHash),
                        () -> assertEquals(sessions.hashRefreshToken(rotated.getRefreshToken()), committedHash),
                        () -> assertNull(sessionRow().getRevokedAt()),
                        () -> assertDoesNotThrow(() -> sessions.validateRefreshSession(jwt.getClaims(rotated.getRefreshToken()), rotated.getRefreshToken())),
                        () -> assertThrows(CusAuthenticationException.class,
                                () -> auth.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", refreshToken)),
                                "An already rotated token must not become reusable"));
            }
        }
    }

    @Test void remainingPinActivityMustNotOverwriteNewerActivityTimestamp() throws Exception {
        LocalDateTime earlier = LocalDateTime.now().withNano(0), later = earlier.plusSeconds(1);
        tx(() -> {
            AuthSession s = sessionRepository.findBySessionUuid(sid()).orElseThrow();
            s.setIssuedAt(earlier.minusHours(1)); s.setLastSeenAt(earlier.minusSeconds(10)); s.setRefreshExpiresAt(earlier.plusHours(23));
            return null;
        });
        try (CusSqlGate gate = sql.arm("cus-pin-activity", this::sessionActivityBoundary, 1);
             CusJob pin = job("cus-pin-activity", () -> {
                 try (var clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS)) {
                     clock.when(LocalDateTime::now).thenReturn(earlier);
                     return auth.requestPinReset(bearer);
                 }
             })) {
            gate.await();
            try (var clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS)) {
                clock.when(LocalDateTime::now).thenReturn(later);
                sessions.validateAccessSession(jwt.getClaims(bearer.substring(7)));
            }
            assertEquals(later, sessionRow().getLastSeenAt());
            gate.release(); succeeded(pin.result());
        }
        assertEquals(later, sessionRow().getLastSeenAt(), "An older request must not move committed activity backwards");
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void remainingJoinedTransactionPreservesUnrelatedDirtyEntityOnCommit(CusFlow flow) {
        Long id = tx(() -> {
            JwtRevokedTokens unrelated = JwtRevokedTokens.builder().jti(UUID.randomUUID().toString())
                    .subjectType(SessionSubjectType.CUSTOMER).tokenExpiresAt(LocalDateTime.now().plusHours(1)).reason("before").build();
            em.persist(unrelated); em.flush(); return unrelated.getRevocationId();
        });
        tx(() -> {
            em.find(JwtRevokedTokens.class, id).setReason("pending caller change");
            start(flow); // real REQUIRED facade + service proxies
            return null;
        });
        assertEquals("pending caller change", tx(() -> em.find(JwtRevokedTokens.class, id).getReason()),
                "Reset helper must not detach and silently discard caller-owned pending changes");
    }

    private List<CusOutcome> ordered(CusFlow flow, Supplier<?> first, Supplier<?> second) throws Exception {
        String one = "cus-ordered-one", two = "cus-ordered-two";
        try (CusSqlGate gate = sql.arm(one, this::otpLock, 1); CusJob a = job(one, first)) {
            gate.await();
            try (CusJob b = job(two, second)) {
                awaitBlocked(1); gate.release();
                return List.of(a.result(), b.result());
            }
        }
    }
    private void verifiedSuccessfully(CusFlow flow, Object response) {
        switch (flow) {
            case LOGIN -> {
                CusOtpVerifyResponse r = (CusOtpVerifyResponse) response;
                assertTrue(r.isSuccess()); assertNotNull(r.getAccessToken()); assertNotNull(r.getRefreshToken());
                assertEquals(customerId.toString(), jwt.getClaims(r.getAccessToken()).getSubject());
            }
            case CORPORATE -> {
                CusCorporateOtpVerifyResponse r = (CusCorporateOtpVerifyResponse) response;
                assertTrue(r.isSuccess()); assertNotNull(r.getAccessToken()); assertNotNull(r.getRefreshToken());
                assertEquals(corporateId.toString(), jwt.getClaims(r.getAccessToken()).getSubject());
            }
            case PASSWORD -> {
                CusPasswordResetOtpVerifyResponse r = (CusPasswordResetOtpVerifyResponse) response;
                assertTrue(r.isSuccess()); assertEquals(latest(flow).getChallengeGroupId(), r.getChallengeGroupId());
            }
            case PIN -> {
                CusPinResetOtpVerifyResponse r = (CusPinResetOtpVerifyResponse) response;
                assertTrue(r.isSuccess()); assertEquals(latest(flow).getChallengeGroupId(), r.getVerifiedChallengeGroupId());
            }
        }
    }
    @ParameterizedTest @EnumSource(CusFlow.class)
    void remainingFinalResendSlotHasExactlyOneWinner(CusFlow flow) throws Exception {
        String group = start(flow);
        for (int i = 0; i < 4; i++) resend(flow, group);
        List<CusOutcome> outcomes = ordered(flow, () -> resend(flow, group), () -> resend(flow, group));
        succeeded(outcomes.getFirst()); assertInstanceOf(CusOtpResendLimitException.class, outcomes.getLast().error);
        assertEquals(5, ((CusOtpResendResponse) outcomes.getFirst().value).getResendNo());
        OtpChallenge current = latest(flow);
        assertEquals(group, current.getChallengeGroupId()); assertEquals(5, current.getResendNo());
        assertEquals(0, current.getAttemptCount()); assertEquals(OtpStatus.ACTIVE, current.getStatus());
        assertEquals(6, jdbc.queryForObject("SELECT COUNT(*) FROM otp_challenges WHERE challenge_group_id=?", Integer.class, group));
        verifiedSuccessfully(flow, verify(flow, group, code(flow)));
    }
    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> remainingAttemptOrders() {
        return Arrays.stream(CusFlow.values()).flatMap(flow -> java.util.stream.Stream.of(true, false)
                .map(correctFirst -> org.junit.jupiter.params.provider.Arguments.of(flow, correctFirst)));
    }
    @ParameterizedTest @org.junit.jupiter.params.provider.MethodSource("remainingAttemptOrders")
    void remainingCorrectOtpVersusFifthWrongAttemptHasOrderedOutcome(CusFlow flow, boolean correctFirst) throws Exception {
        String group = start(flow); fixCode(flow); long before = sessionCount(flow);
        tx(() -> { latest(flow).setAttemptCount(4); return null; });
        Supplier<?> correct = () -> verify(flow, group, FIXED_OTP), wrong = () -> verify(flow, group, "099999");
        List<CusOutcome> results = correctFirst ? ordered(flow, correct, wrong) : ordered(flow, wrong, correct);
        if (correctFirst) {
            succeeded(results.getFirst()); verifiedSuccessfully(flow, results.getFirst().value);
            assertInstanceOf(CusOtpException.class, results.getLast().error);
            assertEquals(4, latest(flow).getAttemptCount()); assertNotNull(latest(flow).getConsumedAt());
            assertEquals(flow == CusFlow.CORPORATE ? OtpStatus.EXPIRED : OtpStatus.CONSUMED, latest(flow).getStatus());
            assertEquals(before + (flow == CusFlow.LOGIN || flow == CusFlow.CORPORATE ? 1 : 0), sessionCount(flow));
        } else {
            assertInstanceOf(CusOtpException.class, results.getFirst().error);
            assertInstanceOf(CusOtpException.class, results.getLast().error);
            assertEquals(5, latest(flow).getAttemptCount()); assertEquals(OtpStatus.BLOCKED, latest(flow).getStatus());
            assertNull(latest(flow).getConsumedAt()); assertEquals(before, sessionCount(flow));
            resend(flow, group); assertEquals(0, latest(flow).getAttemptCount());
            verifiedSuccessfully(flow, verify(flow, group, code(flow)));
        }
    }
    @ParameterizedTest @EnumSource(CusFlow.class)
    void remainingExpiryCommittedWhileCredentialWaiterBlockedIsRespected(CusFlow flow) throws Exception {
        String group = start(flow), code = code(flow); long before = sessionCount(flow);
        List<CusJob> pending = new ArrayList<>();
        try {
            tx(() -> {
                if (flow == CusFlow.CORPORATE) corporateCredentials.findByCorporateUserIdForUpdate(corporateId).orElseThrow();
                else credentials.findByCustomerIdForUpdate(customerId).orElseThrow();
                pending.add(job("cus-expiry-waiter", () -> verify(flow, group, code)));
                awaitBlocked(1);
                // Controlled synthetic deadline, committed after the contender
                // entered its transaction and before it obtains the owner lock.
                latest(flow).setExpiresAt(LocalDateTime.now().minusSeconds(1));
                return null;
            });
            assertInstanceOf(CusOtpException.class, pending.getFirst().result().error);
            assertEquals(OtpStatus.EXPIRED, latest(flow).getStatus()); assertEquals(0, latest(flow).getAttemptCount());
            assertNull(latest(flow).getConsumedAt()); assertEquals(before, sessionCount(flow));
        } finally { pending.forEach(CusJob::close); }
    }
    private boolean corporateCredentialSelect(String statement) {
        return statement.contains(" from corporate_credentials ") && statement.contains("for update");
    }
    @Test void remainingCorporateConsumptionRejectsGroupSupersededBeforeItsLock() throws Exception {
        String a = start(CusFlow.CORPORATE), otp = code(CusFlow.CORPORATE); long before = sessionCount(CusFlow.CORPORATE);
        try (CusSqlGate gate = sql.arm("cus-corporate-consume", this::corporateCredentialSelect, 1);
             CusJob consume = job("cus-corporate-consume", () -> verify(CusFlow.CORPORATE, a, otp))) {
            gate.await(); String b = start(CusFlow.CORPORATE);
            assertEquals(b, latest(CusFlow.CORPORATE).getChallengeGroupId());
            gate.release(); assertInstanceOf(CusOtpException.class, consume.result().error);
            assertEquals(before, sessionCount(CusFlow.CORPORATE));
            verifiedSuccessfully(CusFlow.CORPORATE, verify(CusFlow.CORPORATE, b, code(CusFlow.CORPORATE)));
        }
    }
    @Test void remainingCorporateSupersessionBetweenConsumptionAndIssuanceRejectsLateJwt() throws Exception {
        String a = start(CusFlow.CORPORATE), otp = code(CusFlow.CORPORATE); long before = sessionCount(CusFlow.CORPORATE);
        try (CusSqlGate gate = sql.arm("cus-corporate-gap", this::corporateCredentialSelect, 2);
             CusJob login = job("cus-corporate-gap", () -> verify(CusFlow.CORPORATE, a, otp))) {
            gate.await(); // verify's transaction committed; issuance has not locked credentials yet
            assertEquals(OtpStatus.CONSUMED, latest(CusFlow.CORPORATE).getStatus());
            assertEquals(before, sessionCount(CusFlow.CORPORATE));
            String b = start(CusFlow.CORPORATE);
            gate.release(); assertInstanceOf(CusOtpException.class, login.result().error);
            assertEquals(before, sessionCount(CusFlow.CORPORATE));
            assertEquals(b, latest(CusFlow.CORPORATE).getChallengeGroupId());
            verifiedSuccessfully(CusFlow.CORPORATE, verify(CusFlow.CORPORATE, b, code(CusFlow.CORPORATE)));
        }
    }
    @Test void remainingCorporateIssuanceWinsBeforeNewGroupAndCannotReplayAfterwards() throws Exception {
        String a = start(CusFlow.CORPORATE), otp = code(CusFlow.CORPORATE);
        corporateOtp.verifyLoginOtp(dto(CusCorporateOtpVerifyRequest.class, "challengeGroupId", a, "otp", otp));
        long before = sessionCount(CusFlow.CORPORATE);
        List<CusOutcome> results = ordered(CusFlow.CORPORATE, () -> corporate.completeFirstLogin(a), () -> start(CusFlow.CORPORATE));
        succeeded(results.getFirst()); succeeded(results.getLast());
        verifiedSuccessfully(CusFlow.CORPORATE, results.getFirst().value);
        assertEquals(before + 1, sessionCount(CusFlow.CORPORATE));
        assertEquals(results.getLast().value, latest(CusFlow.CORPORATE).getChallengeGroupId());
        assertThrows(CusOtpException.class, () -> corporate.completeFirstLogin(a));
    }
    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> remainingResetOrders() {
        return java.util.stream.Stream.of(CusFlow.PASSWORD, CusFlow.PIN).flatMap(flow -> java.util.stream.Stream.of(true, false)
                .map(completionFirst -> org.junit.jupiter.params.provider.Arguments.of(flow, completionFirst)));
    }
    @ParameterizedTest @org.junit.jupiter.params.provider.MethodSource("remainingResetOrders")
    void remainingResetCompletionAndNewResetRespectBothCommitOrders(CusFlow flow, boolean completionFirst) throws Exception {
        String a = start(flow), verified = verifiedGroup(flow, verify(flow, a, code(flow)));
        Long oldId = latest(flow).getOtpId();
        CustomerCredentials before = credentials.findById(customerId).orElseThrow();
        Supplier<?> complete = () -> { complete(flow, verified); return true; }, next = () -> start(flow);
        List<CusOutcome> results = completionFirst ? ordered(flow, complete, next) : ordered(flow, next, complete);
        CusOutcome creation = results.get(completionFirst ? 1 : 0), completion = results.get(completionFirst ? 0 : 1);
        succeeded(creation);
        if (completionFirst) succeeded(completion); else assertInstanceOf(CusOtpException.class, completion.error);
        OtpChallenge current = latest(flow), old = tx(() -> em.find(OtpChallenge.class, oldId));
        assertEquals(creation.value, current.getChallengeGroupId()); assertEquals(OtpStatus.ACTIVE, current.getStatus());
        assertEquals(0, current.getResendNo()); assertEquals(0, current.getAttemptCount());
        assertEquals(OtpStatus.CONSUMED, old.getStatus());
        if (completionFirst) assertNotEquals(verified, old.getChallengeGroupId()); else assertEquals(verified, old.getChallengeGroupId());
        CustomerCredentials after = credentials.findById(customerId).orElseThrow();
        assertEquals(before.getTokenVersion() + (completionFirst && flow == CusFlow.PASSWORD ? 1 : 0), after.getTokenVersion());
        if (!completionFirst) {
            assertEquals(before.getPasswordHash(), after.getPasswordHash());
            assertEquals(before.getTransactionPinHash(), after.getTransactionPinHash());
        }
        assertThrows(CusOtpException.class, () -> complete(flow, verified));
        verifiedSuccessfully(flow, verify(flow, (String) creation.value, code(flow)));
    }

    enum CusResetStage { REQUEST, RESEND, VERIFY, COMPLETE }
    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> remainingPendingStages() {
        return java.util.stream.Stream.of(CusFlow.PASSWORD, CusFlow.PIN).flatMap(flow -> Arrays.stream(CusResetStage.values())
                .flatMap(stage -> java.util.stream.Stream.of(true, false).map(rollback -> org.junit.jupiter.params.provider.Arguments.of(flow, stage, rollback))));
    }
    private Object resetAt(CusFlow flow, CusResetStage stage, String group) {
        return switch (stage) {
            case REQUEST -> start(flow);
            case RESEND -> resend(flow, group);
            case VERIFY -> verify(flow, group, code(flow));
            case COMPLETE -> { complete(flow, group); yield true; }
        };
    }
    @ParameterizedTest @org.junit.jupiter.params.provider.MethodSource("remainingPendingStages")
    void remainingJoinedPendingChangesAndResetWritesCommitOrRollbackTogether(CusFlow flow, CusResetStage stage, boolean rollback) {
        String group = stage == CusResetStage.REQUEST ? null : start(flow);
        if (stage == CusResetStage.COMPLETE) group = verifiedGroup(flow, verify(flow, group, code(flow)));
        final String requestedGroup = group;
        Long id = tx(() -> {
            JwtRevokedTokens unrelated = JwtRevokedTokens.builder().jti(UUID.randomUUID().toString())
                    .subjectType(SessionSubjectType.CUSTOMER).tokenExpiresAt(LocalDateTime.now().plusHours(1)).reason("before").build();
            em.persist(unrelated); em.flush(); return unrelated.getRevocationId();
        });
        List<Map<String, Object>> otpBefore = jdbc.queryForList("SELECT otp_id,challenge_group_id,status,attempt_count,resend_no FROM otp_challenges WHERE customer_id=UNHEX(?) ORDER BY otp_id", customerId.toString().replace("-", ""));
        CustomerCredentials credentialBefore = credentials.findById(customerId).orElseThrow();
        AuthSession sessionBefore = sessionRow();
        Supplier<?> action = () -> tx(() -> {
            JwtRevokedTokens managed = em.find(JwtRevokedTokens.class, id);
            managed.setReason("pending caller change");
            resetAt(flow, stage, requestedGroup);
            if (rollback) throw new IllegalStateException("Synthetic outer rollback");
            return true;
        });
        if (rollback) assertThrows(IllegalStateException.class, action::get); else assertEquals(true, action.get());
        assertEquals(rollback ? "before" : "pending caller change", tx(() -> em.find(JwtRevokedTokens.class, id).getReason()));
        if (rollback) {
            assertEquals(otpBefore, jdbc.queryForList("SELECT otp_id,challenge_group_id,status,attempt_count,resend_no FROM otp_challenges WHERE customer_id=UNHEX(?) ORDER BY otp_id", customerId.toString().replace("-", "")));
            CustomerCredentials after = credentials.findById(customerId).orElseThrow();
            assertEquals(credentialBefore.getPasswordHash(), after.getPasswordHash());
            assertEquals(credentialBefore.getTransactionPinHash(), after.getTransactionPinHash());
            assertEquals(credentialBefore.getTokenVersion(), after.getTokenVersion());
            assertEquals(sessionBefore.getRevokedAt(), sessionRow().getRevokedAt());
            assertEquals(sessionBefore.getLastSeenAt(), sessionRow().getLastSeenAt());
        } else {
            OtpChallenge current = latest(flow);
            assertEquals(stage == CusResetStage.COMPLETE || stage == CusResetStage.VERIFY ? OtpStatus.CONSUMED : OtpStatus.ACTIVE, current.getStatus());
            assertEquals(stage == CusResetStage.RESEND ? 1 : 0, current.getResendNo()); assertEquals(0, current.getAttemptCount());
        }
    }

    record CusOtherCustomer(UUID id, String code, String authorization) { }
    private CusOtherCustomer seedOther(UUID id) {
        return tx(() -> {
            String code = "OT-" + UUID.randomUUID().toString().substring(0, 8);
            Customers customer = Customers.builder().customerId(id).customerCode(code).customerType(CustomerType.PERSONAL)
                    .fullName("Synthetic Concurrency Customer").email(id + "@example.invalid").status(CustomerStatus.ACTIVE).build(); em.persist(customer);
            CustomerCredentials credential = CustomerCredentials.builder().customerId(id).customer(customer).passwordHash(encoder.encode(PASSWORD))
                    .transactionPinHash(encoder.encode("123456")).mustChangePassword(false).build(); em.persist(credential);
            String authorization = "Bearer " + issuer.createAuthenticatedSession(customer, credential).getAccessToken();
            return new CusOtherCustomer(id, code, authorization);
        });
    }
    private Object startOther(CusFlow flow, CusOtherCustomer customer) {
        return flow == CusFlow.PASSWORD ? auth.requestPasswordReset(new CusPasswordResetRequest(customer.code)) : auth.requestPinReset(customer.authorization);
    }
    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> remainingHistories() {
        return java.util.stream.Stream.of(CusFlow.PASSWORD, CusFlow.PIN).flatMap(flow -> java.util.stream.Stream.of(true, false)
                .map(sparse -> org.junit.jupiter.params.provider.Arguments.of(flow, sparse)));
    }
    @ParameterizedTest @org.junit.jupiter.params.provider.MethodSource("remainingHistories")
    void remainingDifferentCustomersWithEmptyOrSparseHistoriesDoNotDeadlock(CusFlow flow, boolean sparse) throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        CusOtherCustomer a = seedOther(UUID.fromString("fffffff0-0000-4000-8000-" + suffix + "10"));
        CusOtherCustomer b = seedOther(UUID.fromString("fffffff0-0000-4000-8000-" + suffix + "20"));
        if (sparse) tx(() -> {
            for (CusOtherCustomer c : List.of(a, b)) {
                OtpChallenge row = OtpChallenge.builder().customer(em.find(Customers.class, c.id)).subjectType(OtpSubjectType.CUSTOMER)
                        .purpose(purpose(flow)).challengeGroupId(UUID.randomUUID().toString()).otpHash(encoder.encode(FIXED_OTP))
                        .status(OtpStatus.EXPIRED).deliveryChannel(DeliveryChannel.EMAIL).expiresAt(LocalDateTime.now().minusMinutes(1))
                        .resendNo(0).maxResendAttempts(5).attemptCount(0).maxAttempts(5).build(); em.persist(row);
            }
            return null;
        });
        System.out.println("CUS_PLAN " + flow + " sparse=" + sparse + " " + jdbc.queryForList(
                "EXPLAIN SELECT * FROM otp_challenges WHERE customer_id=UNHEX(?) AND purpose=? AND status='ACTIVE' FOR UPDATE", a.id.toString().replace("-", ""), purpose(flow).name()));
        Predicate<String> insert = statement -> statement.startsWith("insert into otp_challenges ");
        try (CusSqlGate ga = sql.arm("cus-different-a", insert, 1); CusSqlGate gb = sql.arm("cus-different-b", insert, 1);
             CusJob first = job("cus-different-a", () -> startOther(flow, a))) {
            ga.await();
            try (CusJob second = job("cus-different-b", () -> startOther(flow, b))) {
                // Both statements may hold compatible gap locks. A sparse
                // range may instead block B's scan; observe either actual path.
                boolean bothAtInsert = gb.reached.await(2, TimeUnit.SECONDS);
                if (!bothAtInsert) { awaitBlocked(1); ga.release(); gb.await(); }
                ga.release(); gb.release();
                CusOutcome one = first.result(), two = second.result();
                System.out.println("CUS_DIFFERENT " + flow + " sparse=" + sparse + " bothInsert=" + bothAtInsert
                        + " deadlockA=" + deadlock(one.error) + " deadlockB=" + deadlock(two.error));
                if (deadlock(one.error) || deadlock(two.error)) {
                    String graph = (String) jdbc.queryForMap("SHOW ENGINE INNODB STATUS").get("Status");
                    int begin = graph.indexOf("LATEST DETECTED DEADLOCK"), end = graph.indexOf("TRANSACTIONS", begin);
                    String latestDeadlock = graph.substring(begin, end < 0 ? graph.length() : end);
                    assertTrue(latestDeadlock.contains("fk_otp_customer"));
                    assertTrue(latestDeadlock.contains("insert intention"));
                    // Retain lock/index evidence only. Do not print SQL bound
                    // values or row dumps, even for these synthetic fixtures.
                    latestDeadlock.lines().filter(line -> line.startsWith("RECORD LOCKS") || line.startsWith("*** ("))
                            .forEach(line -> System.out.println("CUS_LOCK_DETAIL " + line));
                }
                for (int index = 0; index < 2; index++) {
                    CusOtherCustomer c = index == 0 ? a : b; CusOutcome outcome = index == 0 ? one : two;
                    int active = jdbc.queryForObject("SELECT COUNT(*) FROM otp_challenges WHERE customer_id=UNHEX(?) AND purpose=? AND status='ACTIVE'", Integer.class, c.id.toString().replace("-", ""), purpose(flow).name());
                    assertEquals(outcome.ok() ? 1 : 0, active, "A failed transaction must not leave a partially created active OTP");
                    if (outcome.ok()) {
                        String returned = flow == CusFlow.PASSWORD ? ((CusPasswordResetStartResponse) outcome.value).getChallengeGroupId() : ((CusPinResetStartResponse) outcome.value).getChallengeGroupId();
                        assertEquals(returned, jdbc.queryForObject("SELECT challenge_group_id FROM otp_challenges WHERE customer_id=UNHEX(?) AND purpose=? ORDER BY otp_id DESC LIMIT 1", String.class, c.id.toString().replace("-", ""), purpose(flow).name()));
                    }
                }
                assertAll(() -> succeeded(one), () -> succeeded(two));
            }
        }
    }

    @ParameterizedTest @org.junit.jupiter.params.provider.MethodSource("remainingResetOrders")
    void remainingPendingProfileDataIsNotDiscardedByOwnerReload(CusFlow flow, boolean rollback) {
        tx(() -> {
            Customers owner = em.find(Customers.class, customerId);
            PersonalInfo profile = PersonalInfo.builder().customer(owner).customerId(customerId).firstName("Synthetic")
                    .lastName("Customer").email(customerId + "@profile.invalid").phone("000000000").country("Myanmar").city("before").build();
            em.persist(profile); em.flush(); return null;
        });
        Supplier<?> action = () -> tx(() -> {
            Customers owner = em.find(Customers.class, customerId);
            PersonalInfo profile = owner.getPersonalInfo();
            assertNotNull(profile);
            profile.setCity("pending caller city");
            start(flow);
            if (rollback) throw new IllegalStateException("Synthetic profile rollback");
            return true;
        });
        if (rollback) assertThrows(IllegalStateException.class, action::get); else assertEquals(true, action.get());
        assertEquals(rollback ? "before" : "pending caller city", tx(() -> em.find(PersonalInfo.class, customerId).getCity()));
    }

    enum CusSessionMutation { LOGOUT, SYSTEM, ROTATION }
    private Object individualMutation(CusSessionMutation mutation) {
        return switch (mutation) {
            case LOGOUT -> { auth.logout(bearer); yield true; }
            case SYSTEM -> {
                tx(() -> { sessions.revokeSession(sessionRepository.findBySessionUuid(sid()).orElseThrow(), "IDLE_TIMEOUT"); return true; });
                yield true;
            }
            case ROTATION -> auth.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", refreshToken));
        };
    }
    private boolean guardedActivityUpdate(String statement) {
        return statement.startsWith("update auth_sessions ") && statement.contains("last_seen_at=greatest");
    }
    @ParameterizedTest @EnumSource(CusSessionMutation.class)
    void approvedActivityOwnsRowBeforeRevocationOrRotation(CusSessionMutation mutation) throws Exception {
        AuthSession before = sessionRow();
        try (CusSqlGate gate = sql.arm("cus-approved-first", this::guardedActivityUpdate, 1);
             CusJob activity = job("cus-approved-first", () -> auth.requestPinReset(bearer))) {
            gate.await();
            try (CusJob other = job("cus-approved-second", () -> individualMutation(mutation))) {
                awaitBlocked(1); // competing UPDATE is waiting on activity's real session-row lock
                gate.release(); succeeded(activity.result());
                CusOutcome changed = other.result(); succeeded(changed);
                AuthSession committed = sessionRow();
                assertEquals(before.getIssuedAt(), committed.getIssuedAt());
                assertEquals(before.getRefreshExpiresAt(), committed.getRefreshExpiresAt());
                assertTrue(committed.getLastSeenAt().isAfter(before.getLastSeenAt()));
                if (mutation == CusSessionMutation.ROTATION) {
                    CusTokenResponse rotated = (CusTokenResponse) changed.value;
                    assertNull(committed.getRevokedAt());
                    assertEquals(sessions.hashRefreshToken(rotated.getRefreshToken()), committed.getRefreshTokenHash());
                    assertDoesNotThrow(() -> sessions.validateRefreshSession(jwt.getClaims(rotated.getRefreshToken()), rotated.getRefreshToken()));
                    assertThrows(CusAuthenticationException.class, () -> auth.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", refreshToken)));
                } else {
                    assertNotNull(committed.getRevokedAt());
                    assertEquals(mutation == CusSessionMutation.LOGOUT ? "USER_LOGOUT" : "IDLE_TIMEOUT", committed.getRevokeReason());
                    assertEquals(before.getRefreshTokenHash(), committed.getRefreshTokenHash());
                    assertThrows(CusAuthenticationException.class, () -> auth.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", refreshToken)));
                    String action = mutation == CusSessionMutation.LOGOUT ? "CUSTOMER_LOGOUT" : "SESSION_REVOKED";
                    assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE entity_id=? AND action_type=?", Integer.class, sid(), action));
                }
            }
        }
    }

    enum CusActivityDeadline { IDLE, ABSOLUTE }
    @ParameterizedTest @EnumSource(CusActivityDeadline.class)
    void approvedActivitySamplesTimeAfterSessionLockWait(CusActivityDeadline deadline) throws Exception {
        AuthSession before = sessionRow();
        LocalDateTime edge = deadline == CusActivityDeadline.IDLE ? before.getLastSeenAt().plusMinutes(5) : before.getIssuedAt().plusHours(24);
        java.util.concurrent.atomic.AtomicReference<LocalDateTime> clock = new java.util.concurrent.atomic.AtomicReference<>(LocalDateTime.now());
        List<CusJob> pending = new ArrayList<>();
        try {
            tx(() -> {
                sessionRepository.findForActivity(sid(), SessionSubjectType.CUSTOMER).orElseThrow();
                pending.add(job("cus-approved-expiry", () -> {
                    try (var time = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS)) {
                        time.when(LocalDateTime::now).thenAnswer(call -> clock.get());
                        return sessions.validateAccessSession(jwt.getClaims(bearer.substring(7)));
                    }
                }));
                awaitBlocked(1);
                clock.set(edge); // advance a controlled clock only after the activity transaction is blocked
                return null;
            });
            assertInstanceOf(CusSessionExpiredException.class, pending.getFirst().result().error);
            AuthSession committed = sessionRow();
            assertNotNull(committed.getRevokedAt());
            assertEquals(deadline == CusActivityDeadline.IDLE ? "IDLE_TIMEOUT" : "SESSION_EXPIRED", committed.getRevokeReason());
            assertEquals(before.getLastSeenAt(), committed.getLastSeenAt());
            assertEquals(before.getRefreshTokenHash(), committed.getRefreshTokenHash());
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE entity_id=? AND action_type='SESSION_REVOKED'", Integer.class, sid()));
        } finally { pending.forEach(CusJob::close); }
    }

    enum CusCorporateActivityPath { APPLICATION, SHARED_ENTRY_POINT }
    private CusCorporateOtpVerifyResponse corporateTokens() {
        String group = start(CusFlow.CORPORATE);
        CusCorporateOtpVerifyResponse tokens = (CusCorporateOtpVerifyResponse) verify(CusFlow.CORPORATE, group, code(CusFlow.CORPORATE));
        assertTrue(tokens.isSuccess()); assertNotNull(tokens.getAccessToken()); assertNotNull(tokens.getRefreshToken());
        return tokens;
    }
    private AuthSession corporateRow(String uuid) { return tx(() -> sessionRepository.findBySessionUuid(uuid).orElseThrow()); }
    private Object corporateMutation(CusSessionMutation mutation, CusCorporateOtpVerifyResponse tokens) {
        String uuid = jwt.getClaims(tokens.getAccessToken()).get("sid", String.class);
        return switch (mutation) {
            case LOGOUT -> { corporate.logout("Bearer " + tokens.getAccessToken()); yield true; }
            case SYSTEM -> {
                tx(() -> { sessions.revokeSession(sessionRepository.findBySessionUuid(uuid).orElseThrow(), "IDLE_TIMEOUT"); return true; });
                yield true;
            }
            case ROTATION -> corporate.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", tokens.getRefreshToken()));
        };
    }
    private AuthSession corporateActivity(CusCorporateActivityPath path, CusCorporateOtpVerifyResponse tokens) {
        return path == CusCorporateActivityPath.APPLICATION
                ? corporateSessions.validateAccessSession(jwt.getClaims(tokens.getAccessToken()))
                : sessions.validateCorporateAccessSession(jwt.getClaims(tokens.getAccessToken()));
    }
    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> approvedCorporateCases() {
        return Arrays.stream(CusCorporateActivityPath.values()).flatMap(path -> Arrays.stream(CusSessionMutation.values())
                .map(mutation -> org.junit.jupiter.params.provider.Arguments.of(path, mutation)));
    }
    @ParameterizedTest @org.junit.jupiter.params.provider.MethodSource("approvedCorporateCases")
    void approvedCorporateActivityCannotOverwriteEarlierRevocationOrRotation(CusCorporateActivityPath path, CusSessionMutation mutation) throws Exception {
        CusCorporateOtpVerifyResponse tokens = corporateTokens();
        String uuid = jwt.getClaims(tokens.getAccessToken()).get("sid", String.class);
        AuthSession individualBefore = sessionRow(), corporateBefore = corporateRow(uuid);
        CusSqlGate entry = new CusSqlGate(statement -> true, 1);
        if (path == CusCorporateActivityPath.APPLICATION) {
            // Synchronization only: the existing repository still executes its
            // complete real JDBC implementation inside its real Spring proxy.
            doAnswer(call -> {
                if (Thread.currentThread().getName().equals("cus-approved-corporate")) {
                    entry.reached.countDown(); assertTrue(entry.proceed.await(15, TimeUnit.SECONDS));
                }
                return call.callRealMethod();
            }).when(corporateActivityTarget()).touchIfActive(anyString(), anyLong());
        }
        try (CusSqlGate gate = path == CusCorporateActivityPath.SHARED_ENTRY_POINT
                ? sql.arm("cus-approved-corporate", this::sessionActivityBoundary, 1) : entry;
             CusJob activity = job("cus-approved-corporate", () -> corporateActivity(path, tokens))) {
            gate.await();
            Object changed = corporateMutation(mutation, tokens); assertNotNull(changed);
            gate.release(); CusOutcome result = activity.result();
            AuthSession committed = corporateRow(uuid);
            assertEquals(corporateBefore.getIssuedAt(), committed.getIssuedAt());
            assertEquals(corporateBefore.getRefreshExpiresAt(), committed.getRefreshExpiresAt());
            if (mutation == CusSessionMutation.ROTATION) {
                succeeded(result); CusTokenResponse rotated = (CusTokenResponse) changed;
                assertNull(committed.getRevokedAt());
                assertEquals(sessions.hashRefreshToken(rotated.getRefreshToken()), committed.getRefreshTokenHash());
                assertDoesNotThrow(() -> corporateSessions.validateRefreshSession(jwt.getClaims(rotated.getRefreshToken()), rotated.getRefreshToken()));
                assertThrows(CusAuthenticationException.class, () -> corporate.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", tokens.getRefreshToken())));
            } else {
                assertTrue(result.error instanceof CusAuthenticationException || result.error instanceof CusSessionExpiredException);
                assertNotNull(committed.getRevokedAt());
                assertEquals(mutation == CusSessionMutation.LOGOUT ? "USER_LOGOUT" : "IDLE_TIMEOUT", committed.getRevokeReason());
                assertEquals(corporateBefore.getRefreshTokenHash(), committed.getRefreshTokenHash());
            }
            if (path == CusCorporateActivityPath.APPLICATION) org.mockito.Mockito.verify(corporateActivityTarget(), atLeastOnce()).touchIfActive(eq(uuid), anyLong());
        }
        AuthSession individualAfter = sessionRow();
        assertEquals(individualBefore.getLastSeenAt(), individualAfter.getLastSeenAt());
        assertEquals(individualBefore.getRefreshTokenHash(), individualAfter.getRefreshTokenHash());
        assertEquals(individualBefore.getRevokedAt(), individualAfter.getRevokedAt());
    }
    private CusCorporateSessionActivityRepository corporateActivityTarget() {
        return org.springframework.test.util.AopTestUtils.getUltimateTargetObject(corporateActivityRepository);
    }

    private boolean rotationUpdate(String statement) {
        return statement.startsWith("update auth_sessions ") && statement.contains("set refresh_token_hash=");
    }
    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"LOGIN", "CORPORATE"})
    void approvedDelayedRotationMustNotMoveNewerActivityBackwards(CusFlow flow) throws Exception {
        CusCorporateOtpVerifyResponse companyTokens = flow == CusFlow.CORPORATE ? corporateTokens() : null;
        String access = flow == CusFlow.LOGIN ? bearer.substring(7) : companyTokens.getAccessToken();
        String originalRefresh = flow == CusFlow.LOGIN ? refreshToken : companyTokens.getRefreshToken();
        String uuid = jwt.getClaims(access).get("sid", String.class);
        LocalDateTime earlier = LocalDateTime.now().withNano(0), later = earlier.plusSeconds(1);
        tx(() -> {
            AuthSession row = sessionRepository.findBySessionUuid(uuid).orElseThrow();
            row.setIssuedAt(earlier.minusHours(1)); row.setLastSeenAt(earlier.minusSeconds(10)); row.setRefreshExpiresAt(earlier.plusHours(23));
            return null;
        });
        try (CusSqlGate gate = sql.arm("cus-approved-delayed-rotation", this::rotationUpdate, 1);
             CusJob rotation = job("cus-approved-delayed-rotation", () -> {
                 try (var clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS)) {
                     clock.when(LocalDateTime::now).thenReturn(earlier);
                     return flow == CusFlow.LOGIN ? auth.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", originalRefresh))
                             : corporate.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", originalRefresh));
                 }
             })) {
            gate.await();
            try (var clock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS)) {
                clock.when(LocalDateTime::now).thenReturn(later);
                if (flow == CusFlow.LOGIN) sessions.validateAccessSession(jwt.getClaims(access));
                else corporateSessions.validateAccessSession(jwt.getClaims(access));
            }
            assertEquals(later, corporateRow(uuid).getLastSeenAt());
            gate.release(); CusOutcome result = rotation.result(); succeeded(result);
            CusTokenResponse rotated = (CusTokenResponse) result.value;
            AuthSession committed = corporateRow(uuid);
            assertAll(() -> assertEquals(later, committed.getLastSeenAt(), "Rotation must preserve newer committed activity"),
                    () -> assertEquals(sessions.hashRefreshToken(rotated.getRefreshToken()), committed.getRefreshTokenHash()),
                    () -> assertNull(committed.getRevokedAt()),
                    () -> assertEquals(earlier.minusHours(1), committed.getIssuedAt()),
                    () -> assertEquals(earlier.plusHours(23), committed.getRefreshExpiresAt()));
        }
    }

    @ParameterizedTest @org.junit.jupiter.params.provider.MethodSource("approvedCorporateCases")
    void approvedCorporateActivityOwnsRowBeforeRevocationOrRotation(CusCorporateActivityPath path, CusSessionMutation mutation) throws Exception {
        CusCorporateOtpVerifyResponse tokens = corporateTokens();
        String uuid = jwt.getClaims(tokens.getAccessToken()).get("sid", String.class);
        AuthSession before = corporateRow(uuid), individualBefore = sessionRow();
        CusSqlGate entry = new CusSqlGate(statement -> true, 1);
        if (path == CusCorporateActivityPath.APPLICATION) doAnswer(call -> {
            Object updated = call.callRealMethod(); // SQL has run; the Spring transaction has not committed yet
            if (Thread.currentThread().getName().equals("cus-approved-corporate-first")) {
                entry.reached.countDown(); assertTrue(entry.proceed.await(15, TimeUnit.SECONDS));
            }
            return updated;
        }).when(corporateActivityTarget()).touchIfActive(anyString(), anyLong());
        try (CusSqlGate gate = path == CusCorporateActivityPath.SHARED_ENTRY_POINT
                ? sql.arm("cus-approved-corporate-first", this::guardedActivityUpdate, 1) : entry;
             CusJob activity = job("cus-approved-corporate-first", () -> corporateActivity(path, tokens))) {
            gate.await();
            try (CusJob other = job("cus-approved-corporate-second", () -> corporateMutation(mutation, tokens))) {
                awaitBlocked(1); gate.release(); succeeded(activity.result());
                CusOutcome changed = other.result(); succeeded(changed);
                AuthSession committed = corporateRow(uuid);
                assertEquals(before.getIssuedAt(), committed.getIssuedAt());
                assertEquals(before.getRefreshExpiresAt(), committed.getRefreshExpiresAt());
                assertFalse(committed.getLastSeenAt().isBefore(before.getLastSeenAt()));
                if (mutation == CusSessionMutation.ROTATION) {
                    CusTokenResponse rotated = (CusTokenResponse) changed.value;
                    assertNull(committed.getRevokedAt());
                    assertEquals(sessions.hashRefreshToken(rotated.getRefreshToken()), committed.getRefreshTokenHash());
                    assertThrows(CusAuthenticationException.class, () -> corporate.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", tokens.getRefreshToken())));
                } else {
                    assertNotNull(committed.getRevokedAt());
                    assertEquals(mutation == CusSessionMutation.LOGOUT ? "USER_LOGOUT" : "IDLE_TIMEOUT", committed.getRevokeReason());
                    assertEquals(before.getRefreshTokenHash(), committed.getRefreshTokenHash());
                }
            }
        }
        assertEquals(individualBefore.getLastSeenAt(), sessionRow().getLastSeenAt());
        assertEquals(individualBefore.getRefreshTokenHash(), sessionRow().getRefreshTokenHash());
        assertEquals(individualBefore.getRevokedAt(), sessionRow().getRevokedAt());
    }

    @Test void approvedStaleSessionIsDetachedAndCannotAutoFlushOverRotation() throws Exception {
        String oldHash = sessionRow().getRefreshTokenHash();
        try (CusSqlGate gate = sql.arm("cus-approved-clean", this::sessionActivityBoundary, 1);
             CusJob activity = job("cus-approved-clean", () -> tx(() -> {
                 AuthSession stale = sessionRepository.findBySessionUuid(sid()).orElseThrow();
                 AuthSession fresh = sessions.validateAccessSession(jwt.getClaims(bearer.substring(7)));
                 assertNotSame(stale, fresh); assertFalse(em.contains(stale)); assertTrue(em.contains(fresh));
                 stale.setRefreshTokenHash(oldHash); stale.setRevokedAt(null); stale.setLastSeenAt(LocalDateTime.now().minusMinutes(3));
                 em.flush(); // forcing a flush must ignore this detached, obsolete instance
                 return fresh;
             }))) {
            gate.await();
            CusTokenResponse rotated = auth.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", refreshToken));
            gate.release(); succeeded(activity.result());
            assertEquals(sessions.hashRefreshToken(rotated.getRefreshToken()), sessionRow().getRefreshTokenHash());
            assertThrows(CusAuthenticationException.class, () -> auth.refreshToken(dto(CusRefreshTokenRequest.class, "refreshToken", refreshToken)));
        }
        List<String> writes = sql.activityWrites("cus-approved-clean");
        assertEquals(1, writes.size());
        String assignments = writes.getFirst().substring(0, writes.getFirst().indexOf(" where "));
        for (String protectedColumn : List.of("refresh_token_hash", "refresh_expires_at", "issued_at", "revoked_at", "revoke_reason")) {
            assertFalse(assignments.contains(protectedColumn), protectedColumn + " must never be assigned by activity");
        }
    }

    // Real servlet MVC -> controller -> production transactional facade/services
    // -> Hibernate/MySQL audit rows. This deliberately does not install the JWT
    // filter chain; authenticated PIN requests are validated by the real service.
    private String recoveryHttp(CusFlow flow, String operation, Map<String, String> body,
                                String ip, String agent, int expectedStatus) {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new CusAuthController(auth))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
        var json = new tools.jackson.databind.ObjectMapper();
        try {
            var request = post("/api/customer/auth/" + (flow == CusFlow.PASSWORD ? "password" : "pin")
                    + "-reset/" + operation).contentType("application/json")
                    .content(json.writeValueAsString(body)).header("Authorization", bearer)
                    .header("X-Forwarded-For", "198.51.100.199")
                    .header("Forwarded", "for=198.51.100.198")
                    .with(servlet -> { servlet.setRemoteAddr(ip); return servlet; });
            if (agent != null) request.header("User-Agent", agent);
            return mvc.perform(request).andExpect(status().is(expectedStatus))
                    .andReturn().getResponse().getContentAsString();
        } catch (Exception ex) { throw new AssertionError("Isolated recovery HTTP request failed", ex); }
    }
    private String recoveryGroup(String response, CusFlow flow, boolean verified) {
        return new tools.jackson.databind.ObjectMapper().readTree(response)
                .get(verified && flow == CusFlow.PIN ? "verifiedChallengeGroupId" : "challengeGroupId").asText();
    }
    private String recoveryPrefix(CusFlow flow) { return flow == CusFlow.PASSWORD ? "PASSWORD_RESET" : "PIN_RESET"; }
    private long recoveryAuditFloor() { return jdbc.queryForObject("SELECT COALESCE(MAX(audit_id),0) FROM audit_logs", Long.class); }
    private Map<String, String> recoveryStartBody(CusFlow flow) {
        return flow == CusFlow.PASSWORD ? Map.of("loginIdentifier", customerCode) : Map.of();
    }
    private Map<String, String> recoveryCompletionBody(CusFlow flow, String group) {
        return flow == CusFlow.PASSWORD
                ? Map.of("verifiedChallengeGroupId", group, "newPassword", NEW_PASSWORD, "confirmPassword", NEW_PASSWORD)
                : Map.of("verifiedChallengeGroupId", group, "newPin", "246810", "confirmPin", "246810");
    }
    private Map<String, Object> recoveryAudit(long floor, CusFlow flow, String suffix, ActorType actor,
                                            String ip, String agent) {
        var rows = jdbc.queryForList("SELECT audit_id, action_type, actor_type, HEX(actor_customer_id) AS owner, "
                + "actor_staff_id, actor_corporate_user_id, entity_type, entity_id, ip_address, user_agent, "
                + "CAST(old_values AS CHAR) AS before_json, CAST(new_values AS CHAR) AS after_json "
                + "FROM audit_logs WHERE audit_id>? AND action_type=? ORDER BY audit_id", floor, recoveryPrefix(flow) + suffix);
        assertEquals(1, rows.size(), "Expected one committed audit for this request");
        Map<String, Object> row = rows.getFirst();
        assertEquals(actor.name(), row.get("actor_type"));
        assertEquals(actor == ActorType.SYSTEM ? null : customerId.toString().replace("-", "").toUpperCase(Locale.ROOT), row.get("owner"));
        assertNull(row.get("actor_staff_id")); assertNull(row.get("actor_corporate_user_id"));
        assertEquals(suffix.equals("_SUCCESS") ? "CUSTOMER_CREDENTIALS" : "OTP_CHALLENGE", row.get("entity_type"));
        assertNotNull(row.get("entity_id"));
        assertEquals(ip, row.get("ip_address")); assertEquals(agent, row.get("user_agent"));
        for (String column : List.of("before_json", "after_json")) {
            String value = String.valueOf(row.get(column));
            for (String secret : List.of(PASSWORD, NEW_PASSWORD, "246810", bearer, refreshToken)) assertFalse(value.contains(secret));
            for (String key : List.of("\"otp\"", "\"newPassword\"", "\"newPin\"", "\"accessToken\"", "\"refreshToken\"")) assertFalse(value.contains(key));
        }
        return row;
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void recoveryAuditHttpMetadataTraversesAllEightResetEndpoints(CusFlow flow) {
        long floor = recoveryAuditFloor();
        String group = recoveryGroup(recoveryHttp(flow, "request", recoveryStartBody(flow), "203.0.113.10", "Request browser", 200), flow, false);
        Map<String, Object> sent = recoveryAudit(floor, flow, "_OTP_SENT", ActorType.CUSTOMER, "203.0.113.10", "Request browser");
        recoveryHttp(flow, "verify-otp", Map.of("challengeGroupId", group, "otp", "wrong"), "203.0.113.11", "Wrong OTP browser", 400);
        Map<String, Object> failed = recoveryAudit(floor, flow, "_OTP_VERIFY_FAILED", ActorType.CUSTOMER, "203.0.113.11", "Wrong OTP browser");
        assertEquals(1, latest(flow).getAttemptCount()); assertEquals(OtpStatus.ACTIVE, latest(flow).getStatus());
        recoveryHttp(flow, "resend-otp", Map.of("challengeGroupId", group), "203.0.113.12", "Resend browser", 200);
        Map<String, Object> resent = recoveryAudit(floor, flow, "_OTP_RESENT", ActorType.CUSTOMER, "203.0.113.12", "Resend browser");
        String actualCode = code(flow);
        String verified = recoveryGroup(recoveryHttp(flow, "verify-otp", Map.of("challengeGroupId", group, "otp", actualCode),
                "203.0.113.13", "Verify browser", 200), flow, true);
        Map<String, Object> accepted = recoveryAudit(floor, flow, "_OTP_VERIFIED", ActorType.CUSTOMER, "203.0.113.13", "Verify browser");
        recoveryHttp(flow, "confirm", recoveryCompletionBody(flow, verified), "203.0.113.14", "Completion browser", 200);
        Map<String, Object> completed = recoveryAudit(floor, flow, "_SUCCESS", ActorType.CUSTOMER, "203.0.113.14", "Completion browser");
        assertEquals(5, jdbc.queryForObject("SELECT COUNT(*) FROM audit_logs WHERE audit_id>? AND action_type LIKE ?", Integer.class, floor, recoveryPrefix(flow) + "%"));
        // Later requests must never update metadata on earlier insert-only rows.
        for (Map<String, Object> row : List.of(sent, failed, resent, accepted, completed)) {
            assertEquals(row.get("ip_address"), jdbc.queryForObject("SELECT ip_address FROM audit_logs WHERE audit_id=?", String.class, row.get("audit_id")));
            assertEquals(row.get("user_agent"), jdbc.queryForObject("SELECT user_agent FROM audit_logs WHERE audit_id=?", String.class, row.get("audit_id")));
            assertFalse(String.valueOf(row.get("after_json")).contains(actualCode));
        }
        assertThrows(CusOtpException.class, () -> complete(flow, verified));
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void recoveryAuditHttpExpiredOtpKeepsSystemActorAndCommitsMetadata(CusFlow flow) {
        String group = start(flow); long floor = recoveryAuditFloor();
        tx(() -> { latest(flow).setExpiresAt(LocalDateTime.now().minusSeconds(1)); return null; });
        recoveryHttp(flow, "verify-otp", Map.of("challengeGroupId", group, "otp", code(flow)), "2001:db8::12", "Expiry browser", 400);
        recoveryAudit(floor, flow, "_OTP_EXPIRED", ActorType.SYSTEM, "2001:db8::12", "Expiry browser");
        assertEquals(OtpStatus.EXPIRED, latest(flow).getStatus());
    }

    static java.util.stream.Stream<org.junit.jupiter.params.provider.Arguments> recoveryMailCases() {
        return java.util.stream.Stream.of(CusFlow.PASSWORD, CusFlow.PIN).flatMap(flow -> java.util.stream.Stream.of(false, true)
                .map(resend -> org.junit.jupiter.params.provider.Arguments.of(flow, resend)));
    }
    @ParameterizedTest @org.junit.jupiter.params.provider.MethodSource("recoveryMailCases")
    void recoveryAuditHttpMailFailureKeepsRequestMetadataAndNoRollbackPolicy(CusFlow flow, boolean resend) {
        String group = resend ? start(flow) : null; long floor = recoveryAuditFloor();
        if (flow == CusFlow.PASSWORD) doThrow(new MailSendException("Synthetic unavailable mail")).when(email).sendPasswordResetOtp(anyString(), anyString());
        else doThrow(new MailSendException("Synthetic unavailable mail")).when(email).sendPinResetOtp(anyString(), anyString());
        recoveryHttp(flow, resend ? "resend-otp" : "request", resend ? Map.of("challengeGroupId", group) : recoveryStartBody(flow),
                "203.0.113.20", "Offline mail browser", 503);
        recoveryAudit(floor, flow, resend ? "_OTP_RESEND_FAILED" : "_OTP_SEND_FAILED", ActorType.SYSTEM, "203.0.113.20", "Offline mail browser");
        assertEquals(OtpStatus.EXPIRED, latest(flow).getStatus());
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void recoveryAuditHttpMissingAgentAndBoundsUseExistingMetadataPolicy(CusFlow flow) {
        long floor = recoveryAuditFloor();
        String group = recoveryGroup(recoveryHttp(flow, "request", recoveryStartBody(flow), "2001:db8::21", null, 200), flow, false);
        recoveryAudit(floor, flow, "_OTP_SENT", ActorType.CUSTOMER, "2001:db8::21", null);
        String agent = "Synthetic browser/" + "x".repeat(300), remote = "2001:db8:" + "a".repeat(45);
        recoveryHttp(flow, "resend-otp", Map.of("challengeGroupId", group), remote, agent, 200);
        recoveryAudit(floor, flow, "_OTP_RESENT", ActorType.CUSTOMER, remote.substring(0, 45), agent.substring(0, 255));
    }

    @ParameterizedTest @org.junit.jupiter.params.provider.MethodSource("recoveryMailCases")
    void recoveryAuditLegacyAndExplicitNullCallersRemainSafe(CusFlow flow, boolean explicitNull) {
        long floor = recoveryAuditFloor();
        String group = !explicitNull ? start(flow) : flow == CusFlow.PASSWORD
                ? auth.requestPasswordReset(new CusPasswordResetRequest(customerCode), null).getChallengeGroupId()
                : auth.requestPinReset(bearer, null).getChallengeGroupId();
        if (!explicitNull) {
            assertThrows(CusOtpException.class, () -> verify(flow, group, "wrong"));
            resend(flow, group);
        } else if (flow == CusFlow.PASSWORD) {
            assertThrows(CusOtpException.class, () -> auth.verifyPasswordResetOtp(new CusPasswordResetOtpVerifyRequest(group, "wrong"), null));
            auth.resendPasswordResetOtp(dto(CusOtpResendRequest.class, "challengeGroupId", group), null);
        } else {
            assertThrows(CusOtpException.class, () -> auth.verifyPinResetOtp(bearer, dto(CusPinResetOtpVerifyRequest.class, "challengeGroupId", group, "otp", "wrong"), null));
            auth.resendPinResetOtp(bearer, dto(CusOtpResendRequest.class, "challengeGroupId", group), null);
        }
        Object result = !explicitNull ? verify(flow, group, code(flow)) : flow == CusFlow.PASSWORD
                ? auth.verifyPasswordResetOtp(new CusPasswordResetOtpVerifyRequest(group, code(flow)), null)
                : auth.verifyPinResetOtp(bearer, dto(CusPinResetOtpVerifyRequest.class, "challengeGroupId", group, "otp", code(flow)), null);
        String verified = verifiedGroup(flow, result);
        if (!explicitNull) complete(flow, verified);
        else if (flow == CusFlow.PASSWORD) auth.resetPassword(dto(CusPasswordResetConfirmRequest.class, "verifiedChallengeGroupId", verified, "newPassword", NEW_PASSWORD, "confirmPassword", NEW_PASSWORD), null);
        else auth.resetTransactionPin(bearer, dto(CusPinResetConfirmRequest.class, "verifiedChallengeGroupId", verified, "newPin", "246810", "confirmPin", "246810"), null);
        for (String suffix : List.of("_OTP_SENT", "_OTP_VERIFY_FAILED", "_OTP_RESENT", "_OTP_VERIFIED", "_SUCCESS")) {
            recoveryAudit(floor, flow, suffix, ActorType.CUSTOMER, null, null);
        }
    }

    @ParameterizedTest @EnumSource(value = CusFlow.class, names = {"PASSWORD", "PIN"})
    void recoveryAuditConcurrentHttpResendsKeepIndependentMetadata(CusFlow flow) {
        String group = start(flow); long floor = recoveryAuditFloor();
        var outcomes = race(flow,
                () -> recoveryHttp(flow, "resend-otp", Map.of("challengeGroupId", group), "203.0.113.30", "Browser A", 200),
                () -> recoveryHttp(flow, "resend-otp", Map.of("challengeGroupId", group), "203.0.113.31", "Browser B", 200));
        assertTrue(outcomes.stream().allMatch(CusOutcome::ok));
        var rows = jdbc.queryForList("SELECT ip_address, user_agent FROM audit_logs WHERE audit_id>? AND action_type=?", floor, recoveryPrefix(flow) + "_OTP_RESENT");
        assertEquals(2, rows.size());
        assertEquals(Set.of(Map.of("ip_address", "203.0.113.30", "user_agent", "Browser A"), Map.of("ip_address", "203.0.113.31", "user_agent", "Browser B")), new HashSet<>(rows));
        assertEquals(2, latest(flow).getResendNo()); assertEquals(0, latest(flow).getAttemptCount());
    }

    static final class CusSqlProbe implements org.hibernate.resource.jdbc.spi.StatementInspector {
        private final Map<String, CusSqlGate> gates = new ConcurrentHashMap<>();
        private final Queue<String> statements = new ConcurrentLinkedQueue<>();
        void reset() { gates.clear(); statements.clear(); }
        List<String> activityWrites(String worker) {
            String prefix = worker + " :: ";
            return statements.stream().filter(line -> line.startsWith(prefix + "update auth_sessions "))
                    .map(line -> line.substring(prefix.length())).toList();
        }
        CusSqlGate arm(String worker, Predicate<String> condition, int occurrence) {
            CusSqlGate gate = new CusSqlGate(condition, occurrence); gates.put(worker, gate); return gate;
        }
        @Override public String inspect(String statement) {
            String name = Thread.currentThread().getName();
            statements.add(name + " :: " + statement.replaceAll("\\s+", " ").toLowerCase(Locale.ROOT));
            if (name.startsWith("cus-")) System.out.println("CUS_SQL " + name + " :: " + statement);
            CusSqlGate gate = gates.get(name);
            if (gate != null && gate.condition.test(statement.replaceAll("\\s+", " ").toLowerCase(Locale.ROOT)) && gate.matches.incrementAndGet() == gate.occurrence) {
                gate.reached.countDown();
                try { assertTrue(gate.proceed.await(15, TimeUnit.SECONDS), "SQL gate was not released"); }
                catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw new AssertionError(ex); }
            }
            return statement;
        }
    }
    static final class CusSqlGate implements AutoCloseable {
        final Predicate<String> condition; final int occurrence;
        final AtomicInteger matches = new AtomicInteger();
        final CountDownLatch reached = new CountDownLatch(1), proceed = new CountDownLatch(1);
        CusSqlGate(Predicate<String> condition, int occurrence) { this.condition = condition; this.occurrence = occurrence; }
        void await() throws InterruptedException { assertTrue(reached.await(10, TimeUnit.SECONDS), "Expected SQL gate was not reached"); }
        void release() { proceed.countDown(); }
        @Override public void close() { release(); }
    }
    static final class CusJob implements AutoCloseable {
        final ExecutorService executor; final Future<CusOutcome> future;
        CusJob(String name, Supplier<?> call) {
            executor = Executors.newSingleThreadExecutor(r -> new Thread(r, name));
            future = executor.submit(() -> { try { return new CusOutcome(call.get(), null); } catch (Throwable error) { return new CusOutcome(null, error); } });
        }
        CusOutcome result() throws Exception { return future.get(20, TimeUnit.SECONDS); }
        @Override public void close() { executor.shutdownNow(); }
    }

    @Configuration @EnableTransactionManagement
    @EnableJpaRepositories(basePackages = "com.corebanking.repository", includeFilters = @ComponentScan.Filter(type = FilterType.ASSIGNABLE_TYPE,
            classes = {CusCredentialsRepository.class, CusCorporateCredentialRepository.class, CusOtpChallengesRepository.class,
                    CusCustomerRepository.class, CusAccountsRepository.class, CusCorporateUserRepository.class, CusAuthSessionsRepository.class,
                    CusLoginAttemptsRepository.class, CusAuditLogsRepository.class, CusJwtRevokedTokensRepository.class}))
    @Import({CusAuthService.class, CusCustomerPasswordResetService.class, CusCustomerPinResetService.class, CusCustomerSessionService.class,
            CusCustomerSessionIssuanceService.class, CusCustomerLoginAttemptService.class, CusSessionService.class, CusJwtService.class,
            CusCorporateAuthService.class, CusCorporateOtpService.class, CusCorporateCredentialService.class, CusCorporateSessionService.class,
            CusCorporateFirstLoginService.class})
    static class CusConfig {
        @Bean static org.springframework.context.support.PropertySourcesPlaceholderConfigurer testProperties() {
            var bean = new org.springframework.context.support.PropertySourcesPlaceholderConfigurer(); Properties p = new Properties();
            p.setProperty("jwt.secret", Base64.getEncoder().encodeToString(new byte[64])); p.setProperty("jwt.issuer", "cus-otp-isolated-test"); p.setProperty("jwt.expiration", "600000"); bean.setProperties(p); return bean;
        }
        @Bean DataSource dataSource() {
            String url = System.getProperty("cus.otp.jdbcUrl");
            if (url == null || !url.matches("jdbc:mysql://127\\.0\\.0\\.1:[0-9]+/cus_otp_security_test\\?.*")) throw new IllegalStateException("Disposable MySQL database URL required");
            return new DriverManagerDataSource(url, "root", "cus-otp-isolated-test-only");
        }
        @Bean CusSqlProbe sqlProbe() { return new CusSqlProbe(); }
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource ds, CusSqlProbe probe) {
            var bean = new LocalContainerEntityManagerFactoryBean(); bean.setDataSource(ds); bean.setPackagesToScan("com.corebanking.entity"); bean.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            bean.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop", "hibernate.connection.isolation", "4", "hibernate.session_factory.statement_inspector", probe)); return bean;
        }
        @Bean PlatformTransactionManager transactionManager(EntityManagerFactory emf) { return new JpaTransactionManager(emf); }
        @Bean JdbcTemplate jdbcTemplate(DataSource ds) { return new JdbcTemplate(ds); }
        @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(4); }
        @Bean CusEmailService email() { return mock(CusEmailService.class); }
        @Bean CusCorporateSessionActivityRepository corporateActivity(JdbcTemplate jdbc) { return spy(new CusCorporateSessionActivityRepository(jdbc)); }
    }
}
