package com.corebanking.service;

import com.corebanking.controller.CusAuthController;
import com.corebanking.controller.CusCorporateAuthController;
import com.corebanking.dto.CusSessionClientMetadata;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.repository.*;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Request propagation through real controllers/facades/writers; mocked persistence,
 * password/JWT/Corporate OTP collaborators. No datasource or real customer records. */
class CusAuthenticationEventMetadataTest {
    private static final UUID ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String GROUP = "22222222-2222-4222-8222-222222222222";
    private static final String OTP_BODY = "{\"challengeGroupId\":\"" + GROUP + "\",\"otp\":\"123456\"}";
    private static final String IP = "203.0.113.9";
    private static final String IPV6 = "2001:db8:1234:5678:90ab:cdef:1234:5678";


    @ParameterizedTest @ValueSource(strings = {"identifier", "password", "inactive", "locked", "fifth"})
    void individualFailedLoginRecordsTheLoginRequest(String scenario) throws Exception {
        Fixture f = new Fixture(false, CorporateRole.CEO);
        if (scenario.equals("inactive")) f.customer.setStatus(CustomerStatus.INACTIVE);
        if (scenario.equals("locked")) f.credential.setLockedUntil(LocalDateTime.now().plusMinutes(15));
        if (scenario.equals("fifth")) f.credential.setFailedLoginCount(4);
        String identifier = scenario.equals("identifier") ? "UNKNOWN" : "TEST-001";
        String body = "{\"loginIdentifier\":\"" + identifier + "\",\"password\":\"WrongPass1!\",\"ipAddress\":\"198.51.100.99\"}";
        assertThrows(jakarta.servlet.ServletException.class, () -> f.mvc.perform(request("/api/customer/auth/login", body, IP, "Login agent")));
        assertEquals(1, f.attemptsWritten.size());
        LoginAttempt attempt = f.attemptsWritten.getFirst();
        assertFalse(attempt.isSuccess()); assertMeta(attempt.getIpAddress(), attempt.getUserAgent(), IP, "Login agent");
        String reason = switch(scenario) { case "identifier" -> "INVALID_IDENTIFIER"; case "inactive" -> "ACCOUNT_INACTIVE"; case "locked", "fifth" -> "ACCOUNT_LOCKED"; default -> "INVALID_PASSWORD"; };
        assertEquals(reason, attempt.getFailureReason());
        if (scenario.equals("fifth")) { assertEquals(5, f.credential.getFailedLoginCount()); assertNotNull(f.credential.getLockedUntil()); }
        assertNull(f.saved.get()); assertSafe(f);
    }

    @ParameterizedTest @ValueSource(strings = {"identifier", "password", "user-inactive", "company-inactive", "locked", "fifth"})
    void corporateFailedLoginRecordsTheLoginRequest(String scenario) throws Exception {
        Fixture f = new Fixture(false, CorporateRole.CEO);
        if (scenario.equals("user-inactive")) f.corporateCredential.getCorporateUser().setStatus(CorporateUserStatus.INACTIVE);
        if (scenario.equals("company-inactive")) f.corporateCredential.getCorporateUser().getCompanyInfo().getCustomer().setStatus(CustomerStatus.INACTIVE);
        if (scenario.equals("locked")) f.corporateCredential.setLockedUntil(LocalDateTime.now().plusMinutes(15));
        if (scenario.equals("fifth")) f.corporateCredential.setFailedLoginCount(4);
        String company = scenario.equals("identifier") ? "UNKNOWN" : "COMPANY-001";
        String body = "{\"companyCustomerCode\":\"" + company + "\",\"corporateUserCode\":\"USER-001\",\"password\":\"WrongPass1!\"}";
        assertThrows(jakarta.servlet.ServletException.class, () -> f.mvc.perform(request("/api/corporate/auth/login", body, IPV6, "Corporate login agent")));
        assertEquals(1, f.attemptsWritten.size()); LoginAttempt attempt = f.attemptsWritten.getFirst();
        assertFalse(attempt.isSuccess()); assertMeta(attempt.getIpAddress(), attempt.getUserAgent(), IPV6, "Corporate login agent");
        assertEquals(SessionSubjectType.CORPORATE_USER, attempt.getActorType());
        assertEquals(scenario.equals("identifier") ? "INVALID_IDENTIFIER" : scenario.contains("inactive") ? "ACCOUNT_INACTIVE" : scenario.equals("locked") || scenario.equals("fifth") ? "ACCOUNT_LOCKED" : "INVALID_PASSWORD", attempt.getFailureReason());
        assertNull(f.saved.get()); assertSafe(f);
    }

    @ParameterizedTest @ValueSource(strings = {"individual", "CEO", "MAKER"})
    void authenticatedSuccessWritesAttemptAndSessionAuditFromFinalRequest(String kind) throws Exception {
        boolean corporate = !kind.equals("individual"); Fixture f = new Fixture(false, corporate ? CorporateRole.valueOf(kind) : CorporateRole.CEO);
        f.mvc.perform(request(corporate ? "/api/corporate/auth/verify-otp" : "/api/customer/auth/verify-otp", OTP_BODY, IPV6, "Final agent")).andExpect(status().isOk());
        assertEquals(1, f.attemptsWritten.size()); assertTrue(f.attemptsWritten.getFirst().isSuccess());
        assertMeta(f.attemptsWritten.getFirst().getIpAddress(), f.attemptsWritten.getFirst().getUserAgent(), IPV6, "Final agent");
        assertAudit(f, "AUTH_SESSION_CREATED", IPV6, "Final agent");
        if (!corporate) assertAudit(f, "OTP_VERIFIED", IPV6, "Final agent");
        assertMeta(f.saved.get().getIpAddress(), f.saved.get().getUserAgent(), IPV6, "Final agent"); assertSafe(f);
    }

    @ParameterizedTest @ValueSource(booleans = {false,true})
    void firstLoginSuccessUsesCompletionRequest(boolean corporate) throws Exception {
        Fixture f = new Fixture(true, CorporateRole.MAKER);
        f.mvc.perform(request(corporate ? "/api/corporate/auth/verify-otp" : "/api/customer/auth/verify-otp", OTP_BODY, IP, "OTP agent")).andExpect(status().isOk());
        assertTrue(f.attemptsWritten.isEmpty()); assertNull(f.saved.get());
        if (corporate) {
            f.corporateCredential.setMustChangePassword(false); f.corporateCredential.setTransactionPinHash("test-pin-hash");
            f.mvc.perform(request("/api/corporate/auth/first-login/complete", "", IPV6, "Completion agent").param("challengeGroupId", GROUP)).andExpect(status().isOk());
        } else {
            f.mvc.perform(request("/api/customer/auth/first-login/change-password", "{\"challengeGroupId\":\""+GROUP+"\",\"newPassword\":\"NewPass1!\",\"confirmPassword\":\"NewPass1!\"}", IP, "Password agent")).andExpect(status().isOk());
            assertAudit(f,"FIRST_LOGIN_PASSWORD_CHANGED",IP,"Password agent");
            f.mvc.perform(request("/api/customer/auth/first-login/setup-pin", "{\"challengeGroupId\":\""+GROUP+"\",\"pin\":\"246810\",\"confirmPin\":\"246810\"}", IPV6, "Completion agent")).andExpect(status().isOk());
        }
        assertEquals(1,f.attemptsWritten.size()); assertTrue(f.attemptsWritten.getFirst().isSuccess());
        assertMeta(f.attemptsWritten.getFirst().getIpAddress(), f.attemptsWritten.getFirst().getUserAgent(), IPV6,"Completion agent");
        assertAudit(f,"AUTH_SESSION_CREATED",IPV6,"Completion agent"); assertSafe(f);
    }

    @ParameterizedTest @ValueSource(strings = {"sent", "send-failed", "resent", "resend-failed", "expired", "wrong", "blocked"})
    void individualOtpAuditEventsUseTriggeringRequest(String scenario) throws Exception {
        Fixture f = new Fixture(false, CorporateRole.CEO); String path; String body; String action;
        if (scenario.startsWith("send") || scenario.equals("sent")) {
            path="/api/customer/auth/login";body="{\"loginIdentifier\":\"TEST-001\",\"password\":\"GoodPass1!\"}"; action=scenario.equals("sent")?"OTP_SENT":"OTP_SEND_FAILED";
        } else if(scenario.startsWith("res")) {
            path="/api/customer/auth/resend-otp";body="{\"challengeGroupId\":\""+GROUP+"\"}";action=scenario.equals("resent")?"OTP_RESENT":"OTP_RESEND_FAILED";
        } else {
            path="/api/customer/auth/verify-otp";body=OTP_BODY;action=scenario.equals("expired")?"OTP_EXPIRED":scenario.equals("blocked")?"OTP_BLOCKED":"OTP_VERIFY_FAILED";
            if(scenario.equals("expired")) f.challenge.setExpiresAt(LocalDateTime.now().minusSeconds(1));
            else { when(f.encoder.matches("123456","otp-hash")).thenReturn(false); if(scenario.equals("blocked"))f.challenge.setAttemptCount(4); }
        }
        if(scenario.endsWith("failed"))doThrow(new org.springframework.mail.MailSendException("test-only offline")).when(f.email).sendLoginOtp(anyString(),anyString());
        if(scenario.equals("sent")||scenario.equals("resent"))f.mvc.perform(request(path,body,IPV6,"OTP event agent")).andExpect(status().isOk());
        else assertThrows(jakarta.servlet.ServletException.class,()->f.mvc.perform(request(path,body,IPV6,"OTP event agent")));
        assertAudit(f,action,IPV6,"OTP event agent"); assertTrue(f.attemptsWritten.isEmpty()); assertSafe(f);
    }

    @ParameterizedTest @ValueSource(booleans = {false,true})
    void missingAndLongAgentAreSafeForFailedAttempts(boolean corporate) throws Exception {
        for(String agent:new String[]{null,"A".repeat(5000)}){
            Fixture f=new Fixture(false,CorporateRole.CEO);
            String path=corporate?"/api/corporate/auth/login":"/api/customer/auth/login";
            String body=corporate?"{\"companyCustomerCode\":\"UNKNOWN\",\"corporateUserCode\":\"USER-001\",\"password\":\"WrongPass1!\"}":"{\"loginIdentifier\":\"UNKNOWN\",\"password\":\"WrongPass1!\"}";
            assertThrows(jakarta.servlet.ServletException.class,()->f.mvc.perform(request(path,body,IP,agent)));
            LoginAttempt a=f.attemptsWritten.getFirst();assertMeta(a.getIpAddress(),a.getUserAgent(),IP,agent==null?null:"A".repeat(255));
        }
    }

    @ParameterizedTest @ValueSource(booleans = {false,true})
    void refreshAndLogoutAuditsUseTheirOwnRequestsWithoutChangingSessionMetadata(boolean corporate) throws Exception {
        Fixture f = new Fixture(false, CorporateRole.CEO);
        String endpoint = corporate ? "/api/corporate/auth/verify-otp" : "/api/customer/auth/verify-otp";
        f.mvc.perform(request(endpoint, OTP_BODY, IP, "Original browser")).andExpect(status().isOk());
        AuthSession session = f.saved.get();
        var validation = new CusSessionService(f.sessions, f.individualCredentials, f.audit, f.corporateCredentials);
        ReflectionTestUtils.setField(f.individualAuth, "customerSessionService", new CusCustomerSessionService(f.individualCredentials, f.sessions, f.jwt, f.shared, f.revoked, f.audit));
        String refresh = corporate ? "synthetic-corporate-refresh" : "synthetic-refresh";
        String access = corporate ? "synthetic-corporate-access" : "synthetic-access";
        session.setRefreshTokenHash(validation.hashRefreshToken(refresh));
        when(f.sessions.findBySessionUuid(session.getSessionUuid())).thenReturn(Optional.of(session));
        io.jsonwebtoken.Claims accessClaims = claims(session, "ACCESS", corporate);
        io.jsonwebtoken.Claims refreshClaims = claims(session, "REFRESH", corporate);
        when(f.jwt.getClaims(access)).thenReturn(accessClaims);
        when(f.jwt.getClaims(refresh)).thenReturn(refreshClaims);
        when(f.shared.validateRefreshSession(any(), eq(refresh))).thenAnswer(call -> validation.validateRefreshSession(call.getArgument(0), refresh));
        when(f.shared.validateCorporateRefreshSession(any(), eq(refresh))).thenAnswer(call -> validation.validateCorporateRefreshSession(call.getArgument(0), refresh));
        when(f.shared.validateAccessSessionForLogout(any())).thenAnswer(call -> validation.validateAccessSessionForLogout(call.getArgument(0)));
        when(f.shared.validateCorporateAccessSessionForLogout(any())).thenAnswer(call -> validation.validateCorporateAccessSessionForLogout(call.getArgument(0)));
        when(f.shared.revokeSession(any(), anyString(), any(), any())).thenAnswer(call ->
                validation.revokeSession(call.getArgument(0), call.getArgument(1), call.getArgument(2), call.getArgument(3)));
        when(f.sessions.rotateRefreshTokenIfMatch(anyString(), anyString(), anyString(), any(), any(), any(), any())).thenReturn(1);
        when(f.sessions.revokeIfActive(anyString(), anyString(), any(), any(), any(), any())).thenReturn(1);
        when(f.activity.touchIfActive(session.getSessionUuid(), 7L)).thenReturn(1);

        if (corporate) f.corporateSessions.validateAccessSession(accessClaims);
        else validation.validateAccessSession(accessClaims);
        assertMeta(session.getIpAddress(), session.getUserAgent(), IP, "Original browser");
        var refreshRequest = new com.corebanking.dto.CusRefreshTokenRequest(); refreshRequest.setRefreshToken(refresh);
        f.mvc.perform(request(corporate ? "/api/corporate/auth/refresh" : "/api/customer/auth/refresh",
                "{\"refreshToken\":\"" + refresh + "\"}", IPV6, "Refresh agent")).andExpect(status().isOk());
        assertAudit(f, "TOKEN_REFRESHED", IPV6, "Refresh agent");
        assertMeta(session.getIpAddress(), session.getUserAgent(), IP, "Original browser");
        f.mvc.perform(request(corporate ? "/api/corporate/auth/logout" : "/api/customer/auth/logout",
                "", "192.0.2.88", "Logout agent").header("Authorization", "Bearer " + access)).andExpect(status().isOk());
        assertAudit(f, "CUSTOMER_LOGOUT", "192.0.2.88", "Logout agent");
        assertSafe(f);
        assertMeta(session.getIpAddress(), session.getUserAgent(), IP, "Original browser");
        verify(f.sessions).rotateRefreshTokenIfMatch(anyString(), anyString(), anyString(), any(), any(), any(), any());
        verify(f.sessions).revokeIfActive(anyString(), eq("USER_LOGOUT"), any(), any(), any(), any());
        }

    private static io.jsonwebtoken.Claims claims(AuthSession session, String type, boolean corporate) {
        var result = io.jsonwebtoken.Jwts.claims();
        result.setSubject(ID.toString()); result.setId("test-only-jti");
        result.setExpiration(new java.util.Date(System.currentTimeMillis() + 300000));
        result.put("sid", session.getSessionUuid()); result.put("tokenVersion", 7L);
        result.put("tokenType", type); result.put("subjectType", corporate ? "CORPORATE_USER" : "CUSTOMER");
        return result;
    }

    @Test void callsWithoutHttpContextKeepNullMetadata() {
        Fixture f=new Fixture(false,CorporateRole.CEO);
        new CusCustomerLoginAttemptService(f.attempts).saveInvalidLoginAttempt("UNKNOWN","INVALID_IDENTIFIER");
        assertNull(f.attemptsWritten.getFirst().getIpAddress());assertNull(f.attemptsWritten.getFirst().getUserAgent());
    }

    @Test void metadataOverloadsPreserveExistingTransactionPolicies() throws Exception {
        var source=new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource();
        for(Class<?> type:java.util.List.of(CusAuthService.class,CusCorporateAuthService.class,CusCorporateCredentialService.class,
                CusCustomerSessionService.class,CusCorporateSessionService.class,CusCustomerSessionIssuanceService.class,CusCustomerLoginAttemptService.class)) {
            for(var method:type.getDeclaredMethods()) {
                var parameters=method.getParameterTypes();
                if(!java.lang.reflect.Modifier.isPublic(method.getModifiers()) || parameters.length==0 || parameters[parameters.length-1]!=CusSessionClientMetadata.class)continue;
                var original=type.getMethod(method.getName(),java.util.Arrays.copyOf(parameters,parameters.length-1));
                var before=source.getTransactionAttribute(original,type);var after=source.getTransactionAttribute(method,type);
                if(before==null){assertNull(after);continue;}
                assertNotNull(after);assertEquals(before.getPropagationBehavior(),after.getPropagationBehavior());
                assertEquals(before.getIsolationLevel(),after.getIsolationLevel());assertEquals(before.isReadOnly(),after.isReadOnly());
                for(RuntimeException error:java.util.List.of(new com.corebanking.exception.CusAuthenticationException("test"),new com.corebanking.exception.CusAccountLockedException("test"),
                        new com.corebanking.exception.CusOtpException("test"),new com.corebanking.exception.CusSessionExpiredException("test"),new com.corebanking.exception.CusEmailException("test"),new IllegalStateException("test")))
                    assertEquals(before.rollbackOn(error),after.rollbackOn(error),type.getSimpleName()+"."+method.getName());
            }
        }
    }

    private static MockHttpServletRequestBuilder request(String endpoint,String body,String ip,String agent){
        var req=post(endpoint).contentType("application/json").content(body).header("X-Forwarded-For","198.51.100.99").with(r->{r.setRemoteAddr(ip);return r;});
        if(agent!=null)req.header("User-Agent",agent);return req;
    }
    private static void assertMeta(String actualIp,String actualAgent,String ip,String agent){assertEquals(ip,actualIp);assertEquals(agent,actualAgent);}
    private static void assertAudit(Fixture f,String action,String ip,String agent){
        var matching=f.auditsWritten.stream().filter(a->action.equals(a.getActionType())).toList();assertFalse(matching.isEmpty(),action);
        matching.forEach(a->assertMeta(a.getIpAddress(),a.getUserAgent(),ip,agent));
    }
    private static void assertSafe(Fixture f){
        for(AuditLogs a:f.auditsWritten){String json=String.valueOf(a.getOldValues())+a.getNewValues();
            for(String secret:java.util.List.of("GoodPass1!","WrongPass1!","NewPass1!","246810","123456","synthetic-access","synthetic-refresh","synthetic-corporate-access","synthetic-corporate-refresh"))assertFalse(json.contains(secret),a.getActionType());
        }
    }
    static class Fixture {
        final AtomicReference<AuthSession> saved = new AtomicReference<>();
        final CorporateCredential corporateCredential;
        final MockMvc mvc;
        final java.util.List<LoginAttempt> attemptsWritten = new java.util.ArrayList<>();
        final java.util.List<AuditLogs> auditsWritten = new java.util.ArrayList<>();
        final CusLoginAttemptsRepository attempts;
        final CusOtpChallengesRepository challenges;
        final PasswordEncoder encoder;
        final CusAuthService individualAuth;
        final CusCorporateAuthService corporateAuth;
        final CusCorporateCredentialService corporateLogin;
        final CusCustomerRepository customers;
        final CusCorporateUserRepository corporateUsers;
        final CusEmailService email;
        final Customers customer;
        final CustomerCredentials credential;
        final OtpChallenge challenge;
        final CusAuthSessionsRepository sessions;
        final CusCredentialsRepository individualCredentials;
        final CusCorporateCredentialRepository corporateCredentials;
        final CusAuditLogsRepository audit;
        final CusJwtRevokedTokensRepository revoked;
        final CusJwtService jwt;
        final CusSessionService shared;
        final CusCorporateSessionService corporateSessions;
        final CusCorporateSessionActivityRepository activity;
        Fixture(boolean firstLogin, CorporateRole role) {
            customers = mock(CusCustomerRepository.class); corporateUsers = mock(CusCorporateUserRepository.class);
            email = mock(CusEmailService.class);
            sessions = mock(CusAuthSessionsRepository.class); individualCredentials = mock(CusCredentialsRepository.class);
            corporateCredentials = mock(CusCorporateCredentialRepository.class); challenges = mock(CusOtpChallengesRepository.class);
            audit = mock(CusAuditLogsRepository.class); attempts = mock(CusLoginAttemptsRepository.class);
            revoked = mock(CusJwtRevokedTokensRepository.class); jwt = mock(CusJwtService.class);
            shared = mock(CusSessionService.class); encoder = mock(PasswordEncoder.class);
            when(encoder.matches("123456", "otp-hash")).thenReturn(true); when(encoder.encode(anyString())).thenReturn("test-encoded-value");
            when(jwt.generateAccessToken(eq(ID), anyString(), anyLong())).thenReturn("synthetic-access");
            when(jwt.generateRefreshToken(eq(ID), anyString(), anyLong(), any())).thenReturn("synthetic-refresh");
            when(jwt.generateCorporateAccessToken(eq(ID), anyString(), anyLong())).thenReturn("synthetic-corporate-access");
            when(jwt.generateCorporateRefreshToken(eq(ID), anyString(), anyLong(), any())).thenReturn("synthetic-corporate-refresh");
            when(shared.hashRefreshToken(anyString())).thenReturn("test-refresh-hash");
            when(sessions.save(any(AuthSession.class))).thenAnswer(call -> { saved.set(call.getArgument(0)); return saved.get(); });
            when(sessions.saveAndFlush(any(AuthSession.class))).thenAnswer(call -> { saved.set(call.getArgument(0)); return saved.get(); });
            customer = Customers.builder().customerId(ID).customerCode("TEST-001").customerType(CustomerType.PERSONAL).email("test@example.test").status(CustomerStatus.ACTIVE).build();
            credential = CustomerCredentials.builder().customerId(ID).customer(customer).tokenVersion(7L).passwordHash("old-hash")
                    .mustChangePassword(firstLogin).transactionPinHash(firstLogin ? null : "test-pin-hash").build();
            when(customers.findByCustomerCode("TEST-001")).thenReturn(Optional.of(customer));
            when(encoder.matches("GoodPass1!", "old-hash")).thenReturn(true);
            when(individualCredentials.findById(ID)).thenReturn(Optional.of(credential));
            when(individualCredentials.findByCustomerIdForUpdate(ID)).thenReturn(Optional.of(credential));
            challenge = OtpChallenge.builder().otpId(1L).challengeGroupId(GROUP).subjectType(OtpSubjectType.CUSTOMER).purpose(OtpPurpose.LOGIN)
                    .customer(customer).status(OtpStatus.ACTIVE).otpHash("otp-hash").maxAttempts(5).attemptCount(0).expiresAt(LocalDateTime.now().plusMinutes(5)).maxResendAttempts(5).resendNo(0).build();
            when(challenges.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(challenge));
            when(challenges.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(challenge));
            when(challenges.findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0)).thenReturn(Optional.of(challenge));
            individualAuth = new CusAuthService(customers, mock(CusAccountsRepository.class), individualCredentials,
                    new CusCustomerLoginAttemptService(attempts), challenges, encoder, sessions, jwt, shared, revoked, email, audit, null, null, null);
            ReflectionTestUtils.setField(individualAuth, "entityManager", mock(EntityManager.class));
            Customers company = Customers.builder().customerId(UUID.randomUUID()).customerCode("COMPANY-001").customerType(CustomerType.COMPANY).status(CustomerStatus.ACTIVE).build();
            CorporateUser user = CorporateUser.builder().corporateUserId(ID).corporateUserCode("USER-001").corporateRole(role).status(CorporateUserStatus.ACTIVE)
                    .companyInfo(CompanyInfo.builder().customer(company).build()).build();
            corporateCredential = CorporateCredential.builder().corporateUserId(ID).corporateUser(user).passwordHash("old-hash").tokenVersion(7L).mustChangePassword(firstLogin)
                    .transactionPinHash(firstLogin ? null : "test-pin-hash").build();
            when(corporateCredentials.findById(ID)).thenReturn(Optional.of(corporateCredential));
            when(corporateCredentials.findByCorporateUserIdForUpdate(ID)).thenReturn(Optional.of(corporateCredential));
            OtpChallenge corporateChallenge = OtpChallenge.builder().otpId(2L).challengeGroupId(GROUP).subjectType(OtpSubjectType.CORPORATE_USER)
                    .purpose(OtpPurpose.LOGIN).corporateUser(user).status(OtpStatus.CONSUMED).consumedAt(LocalDateTime.now()).build();
            when(challenges.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(GROUP, OtpSubjectType.CORPORATE_USER, OtpPurpose.LOGIN)).thenReturn(Optional.of(corporateChallenge));
            when(challenges.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(GROUP, OtpSubjectType.CORPORATE_USER, OtpPurpose.LOGIN)).thenReturn(Optional.of(corporateChallenge));
            when(challenges.findFirstByCorporateUser_CorporateUserIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(ID, OtpSubjectType.CORPORATE_USER, OtpPurpose.LOGIN, 0)).thenReturn(Optional.of(corporateChallenge));
            activity = mock(CusCorporateSessionActivityRepository.class);
            corporateSessions = new CusCorporateSessionService(shared, jwt, challenges, corporateCredentials, sessions, attempts, audit, revoked, activity);
            ReflectionTestUtils.setField(corporateSessions, "entityManager", mock(EntityManager.class));
            var corporateOtp = mock(CusCorporateOtpService.class); when(corporateOtp.verifyLoginOtp(any())).thenReturn(ID);
            when(corporateUsers.findForLogin("COMPANY-001", "USER-001")).thenReturn(Optional.of(user));
            corporateLogin = new CusCorporateCredentialService(corporateUsers, corporateCredentials, attempts, encoder);
            when(corporateOtp.createLoginOtp(ID)).thenReturn(corporateChallenge);
            corporateAuth = new CusCorporateAuthService(corporateLogin, corporateOtp, corporateSessions, corporateCredentials);
            when(attempts.save(any(LoginAttempt.class))).thenAnswer(c -> { attemptsWritten.add(c.getArgument(0)); return c.getArgument(0); });
            when(attempts.saveAndFlush(any(LoginAttempt.class))).thenAnswer(c -> { attemptsWritten.add(c.getArgument(0)); return c.getArgument(0); });
            when(audit.save(any(AuditLogs.class))).thenAnswer(c -> { auditsWritten.add(c.getArgument(0)); return c.getArgument(0); });
            when(audit.saveAndFlush(any(AuditLogs.class))).thenAnswer(c -> { auditsWritten.add(c.getArgument(0)); return c.getArgument(0); });
            when(challenges.save(any(OtpChallenge.class))).thenAnswer(c -> { OtpChallenge value = c.getArgument(0); if (value.getOtpId() == null) value.setOtpId(99L); return value; });
            mvc = MockMvcBuilders.standaloneSetup(new CusAuthController(individualAuth), new CusCorporateAuthController(corporateAuth, mock(CusCorporateFirstLoginService.class))).build();
        }
    }
}
