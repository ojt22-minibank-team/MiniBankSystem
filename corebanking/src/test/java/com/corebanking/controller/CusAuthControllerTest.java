package com.corebanking.controller;

import com.corebanking.dto.*;
import com.corebanking.exception.*;
import com.corebanking.service.CusAuthService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.http.converter.HttpMessageNotReadableException;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;
import java.util.LinkedHashMap;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** MVC contracts only: no Spring Boot context, security filters, database or SMTP.
 * GlobalExceptionHandler is selected explicitly; application-wide advice ordering
 * and the authentication performed by the mocked facade are outside this fixture. */
@ExtendWith(MockitoExtension.class)
class CusAuthControllerTest {
    private static final String BASE = "/api/customer/auth";
    private static final String GROUP = "11111111-1111-4111-8111-111111111111";
    private static final String VERIFIED = "22222222-2222-4222-8222-222222222222";
    private static final String IP = "203.0.113.21";
    private static final String AGENT = "SyntheticControllerBrowser/1.0";
    private static final CusSessionClientMetadata META = new CusSessionClientMetadata(IP, AGENT);
    private static final String AUTHORIZATION = "Bearer synthetic-individual-access";
    private static final String ACCESS = "synthetic-new-access";
    private static final String REFRESH = "synthetic-new-refresh";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Mock private CusAuthService auth;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        mvc = MockMvcBuilders.standaloneSetup(new CusAuthController(auth))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void noUnexpectedServiceCalls() {
        verifyNoMoreInteractions(auth);
    }

    @ParameterizedTest
    @ValueSource(strings = {"SYNTHETIC-CUSTOMER", "1234567890123456"})
    void loginBindsEitherIdentifierAndTrustedServletMetadata(String identifier) throws Exception {
        var response = new CusLoginResponse(true, "OTP requested", true, GROUP, "s***@example.test");
        when(auth.authenticateCredentials(any(CusLoginRequest.class), eq(META))).thenReturn(response);
        var result = mvc.perform(request("/login", Map.of("loginIdentifier", identifier, "password", "TestPass1!",
                        "ipAddress", "198.51.100.99", "userAgent", "Untrusted body")))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "OTP requested", "otpRequired", true,
                "challengeGroupId", GROUP, "maskedEmail", "s***@example.test"));
        var dto = ArgumentCaptor.forClass(CusLoginRequest.class);
        verify(auth).authenticateCredentials(dto.capture(), eq(META));
        assertEquals(identifier, dto.getValue().getLoginIdentifier());
        assertEquals("TestPass1!", dto.getValue().getPassword());
    }

    static Stream<Arguments> otpResponses() {
        return Stream.of(
                Arguments.of(false, false, false, ACCESS, REFRESH),
                Arguments.of(true, true, true, null, null),
                Arguments.of(true, true, false, null, null),
                Arguments.of(true, false, true, null, null));
    }

    @ParameterizedTest
    @MethodSource("otpResponses")
    void verifyOtpPreservesReturningAndFirstLoginResponseContracts(boolean firstLogin, boolean password,
            boolean pin, String access, String refresh) throws Exception {
        var response = new CusOtpVerifyResponse(true, "Verified", firstLogin, password, pin, access, refresh);
        when(auth.verifyLoginOtp(any(CusOtpVerifyRequest.class), eq(META))).thenReturn(response);
        var result = mvc.perform(request("/verify-otp", Map.of("challengeGroupId", GROUP, "otp", "123456")))
                .andExpect(status().isOk()).andReturn();
        var expected = new LinkedHashMap<String, Object>(Map.of("success", true, "message", "Verified",
                "firstLoginSetupRequired", firstLogin, "passwordChangeRequired", password, "pinSetupRequired", pin));
        expected.put("accessToken", access);
        expected.put("refreshToken", refresh);
        assertJson(result, expected);
        var dto = ArgumentCaptor.forClass(CusOtpVerifyRequest.class);
        verify(auth).verifyLoginOtp(dto.capture(), eq(META));
        assertEquals(GROUP, dto.getValue().getChallengeGroupId());
        assertEquals("123456", dto.getValue().getOtp());
    }

    @ParameterizedTest
    @ValueSource(strings = {"/resend-otp", "/password-reset/resend-otp", "/pin-reset/resend-otp"})
    void resendEndpointsDelegateToTheirOwnServiceAndPreserveResponse(String path) throws Exception {
        var response = new CusOtpResendResponse(true, "Resent", VERIFIED, "s***@example.test", 3);
        switch (path) {
            case "/resend-otp" -> when(auth.resendLoginOtp(any(), eq(META))).thenReturn(response);
            case "/password-reset/resend-otp" -> when(auth.resendPasswordResetOtp(any(), eq(META))).thenReturn(response);
            case "/pin-reset/resend-otp" -> when(auth.resendPinResetOtp(eq(AUTHORIZATION), any(), eq(META))).thenReturn(response);
            default -> throw new AssertionError(path);
        }
        var result = mvc.perform(request(path, Map.of("challengeGroupId", GROUP))
                        .header("Authorization", AUTHORIZATION))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Resent", "challengeGroupId", VERIFIED,
                "maskedEmail", "s***@example.test", "resendNo", 3));
        var dto = ArgumentCaptor.forClass(CusOtpResendRequest.class);
        switch (path) {
            case "/resend-otp" -> verify(auth).resendLoginOtp(dto.capture(), eq(META));
            case "/password-reset/resend-otp" -> verify(auth).resendPasswordResetOtp(dto.capture(), eq(META));
            case "/pin-reset/resend-otp" -> verify(auth).resendPinResetOtp(eq(AUTHORIZATION), dto.capture(), eq(META));
            default -> throw new AssertionError(path);
        }
        assertEquals(GROUP, dto.getValue().getChallengeGroupId());
    }

    @Test
    void firstLoginPasswordForwardsAllFieldsAndExactSuccessText() throws Exception {
        mvc.perform(request("/first-login/change-password", Map.of("challengeGroupId", GROUP,
                        "newPassword", "NewPass1!", "confirmPassword", "NewPass1!")))
                .andExpect(status().isOk()).andExpect(content().string("Password changed successfully."));
        verify(auth).changeFirstLoginPassword(GROUP, "NewPass1!", "NewPass1!", META);
    }

    @Test
    void firstLoginPinForwardsIndividualPinFieldNamesAndReturnsTokens() throws Exception {
        var response = tokens();
        when(auth.setupTransactionPin(GROUP, "246810", "246810", META)).thenReturn(response);
        var result = mvc.perform(request("/first-login/setup-pin", Map.of("challengeGroupId", GROUP,
                        "pin", "246810", "confirmPin", "246810")))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Authenticated", "accessToken", ACCESS, "refreshToken", REFRESH));
        verify(auth).setupTransactionPin(GROUP, "246810", "246810", META);
    }

    @Test
    void passwordResetRequestBindsIdentifierAndForwardsMetadata() throws Exception {
        var response = new CusPasswordResetStartResponse(true, "Recovery requested", GROUP, "s***@example.test");
        when(auth.requestPasswordReset(any(CusPasswordResetRequest.class), eq(META))).thenReturn(response);
        var result = mvc.perform(request("/password-reset/request", Map.of("loginIdentifier", "SYNTHETIC-CUSTOMER")))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Recovery requested", "challengeGroupId", GROUP,
                "destinationMasked", "s***@example.test"));
        var dto = ArgumentCaptor.forClass(CusPasswordResetRequest.class);
        verify(auth).requestPasswordReset(dto.capture(), eq(META));
        assertEquals("SYNTHETIC-CUSTOMER", dto.getValue().getLoginIdentifier());
    }

    @Test
    void passwordResetVerificationReturnsChallengeGroupIdContract() throws Exception {
        var response = new CusPasswordResetOtpVerifyResponse(true, "Verified", VERIFIED);
        when(auth.verifyPasswordResetOtp(any(CusPasswordResetOtpVerifyRequest.class), eq(META))).thenReturn(response);
        var result = mvc.perform(request("/password-reset/verify-otp", Map.of("challengeGroupId", GROUP, "otp", "654321")))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Verified", "challengeGroupId", VERIFIED));
        var dto = ArgumentCaptor.forClass(CusPasswordResetOtpVerifyRequest.class);
        verify(auth).verifyPasswordResetOtp(dto.capture(), eq(META));
        assertEquals(GROUP, dto.getValue().getChallengeGroupId());
        assertEquals("654321", dto.getValue().getOtp());
    }

    @Test
    void passwordResetConfirmationForwardsVerifiedAuthorizationAndPasswordFields() throws Exception {
        mvc.perform(request("/password-reset/confirm", Map.of("verifiedChallengeGroupId", VERIFIED,
                        "newPassword", "ResetPass1!", "confirmPassword", "ResetPass1!")))
                .andExpect(status().isOk()).andExpect(content().string("Password reset successfully."));
        var dto = ArgumentCaptor.forClass(CusPasswordResetConfirmRequest.class);
        verify(auth).resetPassword(dto.capture(), eq(META));
        assertEquals(VERIFIED, dto.getValue().getVerifiedChallengeGroupId());
        assertEquals("ResetPass1!", dto.getValue().getNewPassword());
        assertEquals("ResetPass1!", dto.getValue().getConfirmPassword());
    }

    @Test
    void pinResetRequestNeedsNoBodyAndForwardsExactAuthorization() throws Exception {
        var response = new CusPinResetStartResponse(true, "PIN recovery requested", GROUP, "s***@example.test");
        when(auth.requestPinReset(AUTHORIZATION, META)).thenReturn(response);
        var result = mvc.perform(request("/pin-reset/request", null).header("Authorization", AUTHORIZATION))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "PIN recovery requested", "challengeGroupId", GROUP,
                "destinationMasked", "s***@example.test"));
        verify(auth).requestPinReset(AUTHORIZATION, META);
    }

    @Test
    void pinResetVerificationReturnsVerifiedChallengeGroupIdContract() throws Exception {
        var response = new CusPinResetOtpVerifyResponse(true, "Verified", VERIFIED);
        when(auth.verifyPinResetOtp(eq(AUTHORIZATION), any(CusPinResetOtpVerifyRequest.class), eq(META))).thenReturn(response);
        var result = mvc.perform(request("/pin-reset/verify-otp", Map.of("challengeGroupId", GROUP, "otp", "654321"))
                        .header("Authorization", AUTHORIZATION))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Verified", "verifiedChallengeGroupId", VERIFIED));
        var dto = ArgumentCaptor.forClass(CusPinResetOtpVerifyRequest.class);
        verify(auth).verifyPinResetOtp(eq(AUTHORIZATION), dto.capture(), eq(META));
        assertEquals(GROUP, dto.getValue().getChallengeGroupId());
        assertEquals("654321", dto.getValue().getOtp());
    }

    @Test
    void pinResetConfirmationForwardsHeaderVerifiedAuthorizationAndPinFields() throws Exception {
        mvc.perform(request("/pin-reset/confirm", Map.of("verifiedChallengeGroupId", VERIFIED,
                        "newPin", "246810", "confirmPin", "246810")).header("Authorization", AUTHORIZATION))
                .andExpect(status().isOk()).andExpect(content().string("Transaction PIN reset successfully."));
        var dto = ArgumentCaptor.forClass(CusPinResetConfirmRequest.class);
        verify(auth).resetTransactionPin(eq(AUTHORIZATION), dto.capture(), eq(META));
        assertEquals(VERIFIED, dto.getValue().getVerifiedChallengeGroupId());
        assertEquals("246810", dto.getValue().getNewPin());
        assertEquals("246810", dto.getValue().getConfirmPin());
    }

    @Test
    void refreshForwardsRawRefreshTokenAndMetadata() throws Exception {
        when(auth.refreshToken(any(CusRefreshTokenRequest.class), eq(META))).thenReturn(tokens());
        var result = mvc.perform(request("/refresh", Map.of("refreshToken", "synthetic-old-refresh")))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Authenticated", "accessToken", ACCESS, "refreshToken", REFRESH));
        var dto = ArgumentCaptor.forClass(CusRefreshTokenRequest.class);
        verify(auth).refreshToken(dto.capture(), eq(META));
        assertEquals("synthetic-old-refresh", dto.getValue().getRefreshToken());
    }

    @Test
    void logoutForwardsCapturedAuthorizationAndExactSuccessText() throws Exception {
        mvc.perform(request("/logout", null).header("Authorization", AUTHORIZATION))
                .andExpect(status().isOk()).andExpect(content().string("Logged out successfully."));
        verify(auth).logout(AUTHORIZATION, META);
    }

    @Test
    void keepAliveReturnsFixedContractWithoutCallingFacade() throws Exception {
        var result = mvc.perform(get(BASE + "/session/keep-alive")).andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Session is active."));
        verifyNoInteractions(auth); // This fixture deliberately does not install authorization filters.
    }

    @Test
    void protectedTestEndpointReturnsFixedMessageWithoutCallingFacade() throws Exception {
        mvc.perform(get(BASE + "/test")).andExpect(status().isOk())
                .andExpect(content().string("Customer authentication is working."));
        verifyNoInteractions(auth);
    }

    @Test
    void emptyLoginFieldsReachServiceValidationRatherThanInventedBeanValidation() throws Exception {
        when(auth.authenticateCredentials(any(CusLoginRequest.class), eq(META)))
                .thenThrow(new CusValidationException("Synthetic required-field validation"));
        mvc.perform(request("/login", Map.of())).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message").value("Synthetic required-field validation"));
        var dto = ArgumentCaptor.forClass(CusLoginRequest.class);
        verify(auth).authenticateCredentials(dto.capture(), eq(META));
        assertNull(dto.getValue().getLoginIdentifier());
        assertNull(dto.getValue().getPassword());
    }

    static Stream<Arguments> serviceFailures() {
        return Stream.of(
                Arguments.of(new CusAuthenticationException("Synthetic failure"), 401, "UNAUTHORIZED"),
                Arguments.of(new CusAccountLockedException("Synthetic failure"), 423, "ACCOUNT_LOCKED"),
                Arguments.of(new CusValidationException("Synthetic failure"), 400, "VALIDATION_ERROR"),
                Arguments.of(new CusOtpException("Synthetic failure"), 400, "OTP_ERROR"),
                Arguments.of(new CusSessionExpiredException("Synthetic failure"), 401, "SESSION_EXPIRED"),
                Arguments.of(new CusOtpResendLimitException("Synthetic failure"), 429, "OTP_RESEND_LIMIT_REACHED"),
                Arguments.of(new CusEmailException("Synthetic failure"), 503, "EMAIL_SERVICE_UNAVAILABLE"),
                Arguments.of(new IllegalStateException("Synthetic failure"), 500, "INTERNAL_SERVER_ERROR"));
    }

    @ParameterizedTest
    @MethodSource("serviceFailures")
    void mockedServiceExceptionsUseActualGlobalAdvice(RuntimeException failure, int status, String code) throws Exception {
        when(auth.verifyLoginOtp(any(CusOtpVerifyRequest.class), eq(META))).thenThrow(failure);
        mvc.perform(request("/verify-otp", Map.of("challengeGroupId", GROUP, "otp", "123456")))
                .andExpect(status().is(status)).andExpect(jsonPath("$.status").value(status))
                .andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.message").value("Synthetic failure"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
        verify(auth).verifyLoginOtp(argThat(r -> GROUP.equals(r.getChallengeGroupId()) && "123456".equals(r.getOtp())), eq(META));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "{", "null"})
    void missingOrMalformedBodyCurrentlyUsesGeneric500Advice(String body) throws Exception {
        var result = mvc.perform(request("/login", null).content(body))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR")).andReturn();
        assertInstanceOf(HttpMessageNotReadableException.class, result.getResolvedException());
        verifyNoInteractions(auth); // Characterization of existing advice, not the desired client-error policy.
    }

    @ParameterizedTest
    @ValueSource(strings = {"/pin-reset/request", "/pin-reset/resend-otp", "/pin-reset/verify-otp", "/pin-reset/confirm", "/logout"})
    void missingRequiredHeaderIsRejectedBeforeServiceAndCurrentlyMapsTo500(String path) throws Exception {
        var result = mvc.perform(request(path, Map.of()))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR")).andReturn();
        assertInstanceOf(MissingRequestHeaderException.class, result.getResolvedException());
        verifyNoInteractions(auth);
    }

    static Stream<Arguments> wrongMethods() {
        var posts = Stream.of("/login", "/verify-otp", "/resend-otp", "/first-login/change-password",
                "/first-login/setup-pin", "/password-reset/request", "/password-reset/resend-otp",
                "/password-reset/verify-otp", "/password-reset/confirm", "/pin-reset/request",
                "/pin-reset/resend-otp", "/pin-reset/verify-otp", "/pin-reset/confirm", "/refresh", "/logout")
                .map(path -> Arguments.of("GET", path));
        return Stream.concat(posts, Stream.of(Arguments.of("POST", "/session/keep-alive"), Arguments.of("POST", "/test")));
    }

    @ParameterizedTest
    @MethodSource("wrongMethods")
    void allMappingsRejectWrongHttpMethodBeforeService(String method, String path) throws Exception {
        var builder = "GET".equals(method) ? get(BASE + path) : post(BASE + path);
        var result = mvc.perform(builder).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR")).andReturn();
        assertInstanceOf(HttpRequestMethodNotSupportedException.class, result.getResolvedException());
        verifyNoInteractions(auth); // Global catch-all currently replaces MVC's usual 405 response.
    }

    static Stream<Arguments> agents() {
        return Stream.of(Arguments.of(null, null), Arguments.of("", ""),
                Arguments.of("A".repeat(5000), "A".repeat(255)),
                Arguments.of("A".repeat(254) + "\uD83D\uDE00", "A".repeat(254)));
    }

    @ParameterizedTest
    @MethodSource("agents")
    void metadataUsesServletIpv6AndExistingAgentBounds(String agent, String expectedAgent) throws Exception {
        var response = new CusLoginResponse(true, "OTP requested", true, GROUP, "s***@example.test");
        when(auth.authenticateCredentials(any(CusLoginRequest.class), any(CusSessionClientMetadata.class))).thenReturn(response);
        var builder = post(BASE + "/login").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(Map.of("loginIdentifier", "SYNTHETIC", "password", "TestPass1!")))
                .header("X-Forwarded-For", "198.51.100.99").header("Forwarded", "for=198.51.100.99")
                .with(r -> { r.setRemoteAddr("2001:db8::21"); return r; });
        if (agent != null) builder.header("User-Agent", agent);
        mvc.perform(builder).andExpect(status().isOk());
        var metadata = ArgumentCaptor.forClass(CusSessionClientMetadata.class);
        verify(auth).authenticateCredentials(any(CusLoginRequest.class), metadata.capture());
        assertEquals(new CusSessionClientMetadata("2001:db8::21", expectedAgent), metadata.getValue());
    }

    private static MockHttpServletRequestBuilder request(String path, Map<String, ?> body) {
        var builder = post(BASE + path).contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", AGENT).header("X-Forwarded-For", "198.51.100.99")
                .header("Forwarded", "for=198.51.100.99")
                .with(r -> { r.setRemoteAddr(IP); return r; });
        return body == null ? builder : builder.content(JSON.writeValueAsString(body));
    }

    private static CusTokenResponse tokens() {
        return new CusTokenResponse(true, "Authenticated", ACCESS, REFRESH);
    }

    private static void assertJson(MvcResult result, Object expected) {
        assertEquals(MediaType.APPLICATION_JSON_VALUE, result.getResponse().getContentType());
        assertEquals(JSON.readTree(JSON.writeValueAsString(expected)), JSON.readTree(result.getResponse().getContentAsByteArray()));
    }
}
