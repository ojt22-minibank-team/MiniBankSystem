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

/** Real MVC controllers -> auth facades -> issuers; mocked persistence and JWT/OTP
 * collaborators. No datasource or real data. Save assertions are not durable commits. */
class CusSessionClientMetadataTest {
    private static final UUID ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String GROUP = "22222222-2222-4222-8222-222222222222";
    private static final String OTP_BODY = "{\"challengeGroupId\":\"" + GROUP + "\",\"otp\":\"123456\"}";
    private static final String IP = "203.0.113.9";
    private static final String IPV6 = "2001:db8:1234:5678:90ab:cdef:1234:5678";

    @Test void individualReturningLoginSavesServletMetadataAndIgnoresForwardedHeaders() throws Exception {
        Fixture f = new Fixture(false, CorporateRole.CEO);
        f.mvc.perform(request("/api/customer/auth/verify-otp", OTP_BODY, IP, "MetadataBrowser/1.0")
                .header("X-Forwarded-For", "198.51.100.99").header("Forwarded", "for=198.51.100.99"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.ipAddress").doesNotExist()).andExpect(jsonPath("$.userAgent").doesNotExist());
        assertMetadata(f.saved.get(), IP, "MetadataBrowser/1.0");
        assertEquals(SessionSubjectType.CUSTOMER, f.saved.get().getSubjectType());
    }

    @Test void individualFirstLoginUsesFinalPinRequestNotEarlierOtpMetadata() throws Exception {
        Fixture f = new Fixture(true, CorporateRole.CEO);
        f.mvc.perform(request("/api/customer/auth/verify-otp", OTP_BODY, IP, "Earlier OTP browser"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.firstLoginSetupRequired").value(true));
        assertNull(f.saved.get());
        f.mvc.perform(request("/api/customer/auth/first-login/change-password",
                "{\"challengeGroupId\":\"" + GROUP + "\",\"newPassword\":\"NewPass1!\",\"confirmPassword\":\"NewPass1!\"}", IP, "Password browser"))
                .andExpect(status().isOk());
        assertNull(f.saved.get());
        f.mvc.perform(request("/api/customer/auth/first-login/setup-pin",
                "{\"challengeGroupId\":\"" + GROUP + "\",\"pin\":\"246810\",\"confirmPin\":\"246810\"}", IPV6, "Final PIN browser"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        assertMetadata(f.saved.get(), IPV6, "Final PIN browser");
    }

    @ParameterizedTest @ValueSource(strings = {"CEO", "MAKER"})
    void corporateReturningLoginSavesCreationRequestMetadata(String role) throws Exception {
        Fixture f = new Fixture(false, CorporateRole.valueOf(role));
        f.mvc.perform(request("/api/corporate/auth/verify-otp", OTP_BODY, IPV6, "Corporate browser"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.ipAddress").doesNotExist()).andExpect(jsonPath("$.userAgent").doesNotExist());
        assertMetadata(f.saved.get(), IPV6, "Corporate browser");
        assertEquals(SessionSubjectType.CORPORATE_USER, f.saved.get().getSubjectType());
    }

    @ParameterizedTest @ValueSource(strings = {"CEO", "MAKER"})
    void corporateFirstLoginUsesCompletionRequestMetadata(String role) throws Exception {
        Fixture f = new Fixture(true, CorporateRole.valueOf(role));
        f.mvc.perform(request("/api/corporate/auth/verify-otp", OTP_BODY, IP, "Earlier OTP browser"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.firstLogin").value(true));
        assertNull(f.saved.get());
        // Model persisted successful password/PIN setup; those services are unchanged.
        f.corporateCredential.setMustChangePassword(false);
        f.corporateCredential.setTransactionPinHash("test-pin-hash");
        f.mvc.perform(request("/api/corporate/auth/first-login/complete", "", IPV6, "Completion browser").param("challengeGroupId", GROUP))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        assertMetadata(f.saved.get(), IPV6, "Completion browser");
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void missingAndOversizedUserAgentDoNotBreakEitherLogin(boolean corporate) throws Exception {
        String endpoint = corporate ? "/api/corporate/auth/verify-otp" : "/api/customer/auth/verify-otp";
        Fixture missing = new Fixture(false, CorporateRole.CEO);
        missing.mvc.perform(request(endpoint, OTP_BODY, IP, null)).andExpect(status().isOk());
        assertMetadata(missing.saved.get(), IP, null);
        Fixture oversized = new Fixture(false, CorporateRole.MAKER);
        oversized.mvc.perform(request(endpoint, OTP_BODY, IPV6, "A".repeat(5000))).andExpect(status().isOk());
        assertMetadata(oversized.saved.get(), IPV6, "A".repeat(255));
    }

    @Test void metadataBoundsNullAndUnicodeAreSafe() {
        assertEquals(45, new CusSessionClientMetadata("x".repeat(100), null).ipAddress().length());
        assertEquals(254, new CusSessionClientMetadata(IP, "A".repeat(254) + "\uD83D\uDE00").userAgent().length());
        MockHttpServletRequest request = new MockHttpServletRequest(); request.setRemoteAddr(IP);
        request.addHeader("X-Forwarded-For", "198.51.100.99");
        assertEquals(new CusSessionClientMetadata(IP, null), CusSessionClientMetadata.from(request));
        assertEquals(new CusSessionClientMetadata(null, null), CusSessionClientMetadata.EMPTY);
    }

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void keepAliveRefreshAndLogoutPreserveOriginalMetadata(boolean corporate) throws Exception {
        Fixture f = new Fixture(false, CorporateRole.CEO);
        String endpoint = corporate ? "/api/corporate/auth/verify-otp" : "/api/customer/auth/verify-otp";
        f.mvc.perform(request(endpoint, OTP_BODY, IP, "Original browser")).andExpect(status().isOk());
        AuthSession session = f.saved.get();
        var validation = new CusSessionService(f.sessions, f.individualCredentials, f.audit, f.corporateCredentials);
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
        var individual = new CusCustomerSessionService(f.individualCredentials, f.sessions, f.jwt, f.shared, f.revoked, f.audit);
        if (corporate) f.corporateSessions.validateAccessSession(accessClaims);
        else validation.validateAccessSession(accessClaims);
        assertMetadata(session, IP, "Original browser");
        var refreshRequest = new com.corebanking.dto.CusRefreshTokenRequest(); refreshRequest.setRefreshToken(refresh);
        if (corporate) assertTrue(f.corporateSessions.refreshToken(refreshRequest).isSuccess());
        else assertTrue(individual.refreshToken(refreshRequest).isSuccess());
        assertMetadata(session, IP, "Original browser");
        if (corporate) f.corporateSessions.logout("Bearer " + access);
        else individual.logout("Bearer " + access);
        assertMetadata(session, IP, "Original browser");
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

    @ParameterizedTest @ValueSource(booleans = {false, true})
    void bodyCannotOverrideServletMetadata(boolean corporate) throws Exception {
        Fixture f = new Fixture(false, CorporateRole.CEO);
        String body = OTP_BODY.substring(0, OTP_BODY.length() - 1) + ",\"ipAddress\":\"198.51.100.99\",\"userAgent\":\"Forged body agent\"}";
        String endpoint = corporate ? "/api/corporate/auth/verify-otp" : "/api/customer/auth/verify-otp";
        f.mvc.perform(request(endpoint, body, IP, "Real request agent")).andExpect(status().isOk());
        assertMetadata(f.saved.get(), IP, "Real request agent");
    }

    @Test void metadataOverloadsPreserveTransactionBoundaries() throws Exception {
        var source = new org.springframework.transaction.annotation.AnnotationTransactionAttributeSource();
        var otp = source.getTransactionAttribute(CusAuthService.class.getMethod("verifyLoginOtp",
                com.corebanking.dto.CusOtpVerifyRequest.class, CusSessionClientMetadata.class), CusAuthService.class);
        assertNotNull(otp);
        assertEquals(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRED, otp.getPropagationBehavior());
        assertFalse(otp.rollbackOn(new com.corebanking.exception.CusOtpException("test")));
        var pin = source.getTransactionAttribute(CusAuthService.class.getMethod("setupTransactionPin",
                String.class, String.class, String.class, CusSessionClientMetadata.class), CusAuthService.class);
        assertNotNull(pin);
        assertEquals(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRED, pin.getPropagationBehavior());
        var corporate = source.getTransactionAttribute(CusCorporateSessionService.class.getMethod("createAuthenticatedSession",
                String.class, CusSessionClientMetadata.class), CusCorporateSessionService.class);
        assertNotNull(corporate);
        assertEquals(org.springframework.transaction.TransactionDefinition.PROPAGATION_REQUIRES_NEW, corporate.getPropagationBehavior());
        assertNull(source.getTransactionAttribute(CusCustomerSessionIssuanceService.class.getMethod("createAuthenticatedSession",
                Customers.class, CustomerCredentials.class, CusSessionClientMetadata.class), CusCustomerSessionIssuanceService.class));
    }

    private static MockHttpServletRequestBuilder request(String endpoint, String body, String ip, String agent) {
        var request = post(endpoint).contentType("application/json").content(body).with(servlet -> { servlet.setRemoteAddr(ip); return servlet; });
        if (agent != null) request.header("User-Agent", agent);
        return request;
    }
    private static void assertMetadata(AuthSession session, String ip, String agent) {
        assertNotNull(session); assertEquals(ip, session.getIpAddress()); assertEquals(agent, session.getUserAgent());
        assertEquals(5, session.getIdleTimeoutMinutes()); assertEquals(session.getIssuedAt().plusHours(24), session.getRefreshExpiresAt());
    }
    private static class Fixture {
        final AtomicReference<AuthSession> saved = new AtomicReference<>();
        final CorporateCredential corporateCredential;
        final MockMvc mvc;
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
            sessions = mock(CusAuthSessionsRepository.class); individualCredentials = mock(CusCredentialsRepository.class);
            corporateCredentials = mock(CusCorporateCredentialRepository.class); var challenges = mock(CusOtpChallengesRepository.class);
            audit = mock(CusAuditLogsRepository.class); var attempts = mock(CusLoginAttemptsRepository.class);
            revoked = mock(CusJwtRevokedTokensRepository.class); jwt = mock(CusJwtService.class);
            shared = mock(CusSessionService.class); var encoder = mock(PasswordEncoder.class);
            when(encoder.matches("123456", "otp-hash")).thenReturn(true); when(encoder.encode(anyString())).thenReturn("test-encoded-value");
            when(jwt.generateAccessToken(eq(ID), anyString(), anyLong())).thenReturn("synthetic-access");
            when(jwt.generateRefreshToken(eq(ID), anyString(), anyLong(), any())).thenReturn("synthetic-refresh");
            when(jwt.generateCorporateAccessToken(eq(ID), anyString(), anyLong())).thenReturn("synthetic-corporate-access");
            when(jwt.generateCorporateRefreshToken(eq(ID), anyString(), anyLong(), any())).thenReturn("synthetic-corporate-refresh");
            when(shared.hashRefreshToken(anyString())).thenReturn("test-refresh-hash");
            when(sessions.save(any(AuthSession.class))).thenAnswer(call -> { saved.set(call.getArgument(0)); return saved.get(); });
            when(sessions.saveAndFlush(any(AuthSession.class))).thenAnswer(call -> { saved.set(call.getArgument(0)); return saved.get(); });
            Customers customer = Customers.builder().customerId(ID).customerCode("TEST-001").customerType(CustomerType.PERSONAL).status(CustomerStatus.ACTIVE).build();
            CustomerCredentials credential = CustomerCredentials.builder().customerId(ID).customer(customer).tokenVersion(7L).passwordHash("old-hash")
                    .mustChangePassword(firstLogin).transactionPinHash(firstLogin ? null : "test-pin-hash").build();
            when(individualCredentials.findById(ID)).thenReturn(Optional.of(credential));
            when(individualCredentials.findByCustomerIdForUpdate(ID)).thenReturn(Optional.of(credential));
            OtpChallenge challenge = OtpChallenge.builder().otpId(1L).challengeGroupId(GROUP).subjectType(OtpSubjectType.CUSTOMER).purpose(OtpPurpose.LOGIN)
                    .customer(customer).status(OtpStatus.ACTIVE).otpHash("otp-hash").maxAttempts(5).attemptCount(0).expiresAt(LocalDateTime.now().plusMinutes(5)).build();
            when(challenges.findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(challenge));
            when(challenges.findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(GROUP, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)).thenReturn(Optional.of(challenge));
            when(challenges.findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(ID, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0)).thenReturn(Optional.of(challenge));
            var individualAuth = new CusAuthService(mock(CusCustomerRepository.class), mock(CusAccountsRepository.class), individualCredentials,
                    new CusCustomerLoginAttemptService(attempts), challenges, encoder, sessions, jwt, shared, revoked, mock(CusEmailService.class), audit, null, null, null);
            ReflectionTestUtils.setField(individualAuth, "entityManager", mock(EntityManager.class));
            Customers company = Customers.builder().customerId(UUID.randomUUID()).customerCode("COMPANY-001").customerType(CustomerType.COMPANY).status(CustomerStatus.ACTIVE).build();
            CorporateUser user = CorporateUser.builder().corporateUserId(ID).corporateUserCode("USER-001").corporateRole(role).status(CorporateUserStatus.ACTIVE)
                    .companyInfo(CompanyInfo.builder().customer(company).build()).build();
            corporateCredential = CorporateCredential.builder().corporateUserId(ID).corporateUser(user).tokenVersion(7L).mustChangePassword(firstLogin)
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
            var corporateAuth = new CusCorporateAuthService(mock(CusCorporateCredentialService.class), corporateOtp, corporateSessions, corporateCredentials);
            mvc = MockMvcBuilders.standaloneSetup(new CusAuthController(individualAuth), new CusCorporateAuthController(corporateAuth, mock(CusCorporateFirstLoginService.class))).build();
        }
    }
}
