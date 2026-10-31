package com.corebanking.controller;

import com.corebanking.dto.*;
import com.corebanking.exception.*;
import com.corebanking.service.CusCorporateAuthService;
import com.corebanking.service.CusCorporateFirstLoginService;
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
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.validation.beanvalidation.LocalValidatorFactoryBean;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestHeaderException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import tools.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Stream;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Database-free HTTP/controller contracts with mocked Corporate facades.
 * No security filter is installed: JWT validity and authorization are tested in
 * the existing security suites. Explicit advice-order tests are characterizations,
 * not a claim about the order of advice beans in the complete application. */
@ExtendWith(MockitoExtension.class)
class CusCorporateAuthControllerTest {
    private static final String BASE = "/api/corporate/auth";
    private static final String GROUP = "33333333-3333-4333-8333-333333333333";
    private static final String IP = "2001:db8::31";
    private static final String AGENT = "SyntheticCorporateBrowser/1.0";
    private static final CusSessionClientMetadata META = new CusSessionClientMetadata(IP, AGENT);
    private static final String AUTHORIZATION = "Bearer synthetic-corporate-access";
    private static final String ACCESS = "synthetic-new-corporate-access";
    private static final String REFRESH = "synthetic-new-corporate-refresh";
    private static final ObjectMapper JSON = new ObjectMapper();

    @Mock private CusCorporateAuthService auth;
    @Mock private CusCorporateFirstLoginService firstLogin;
    private CusCorporateAuthController controller;
    private LocalValidatorFactoryBean validator;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        controller = new CusCorporateAuthController(auth, firstLogin);
        validator = new LocalValidatorFactoryBean();
        validator.afterPropertiesSet();
        mvc = MockMvcBuilders.standaloneSetup(controller).setValidator(validator)
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void closeValidatorAndCheckNoUnexpectedDelegation() {
        try {
            verifyNoMoreInteractions(auth, firstLogin);
        } finally {
            validator.close();
        }
    }

    @Test
    void loginBindsCorporateIdentifiersAndTrustedServletMetadata() throws Exception {
        var response = new CusCorporateLoginResponse(true, "OTP requested", true, GROUP);
        when(auth.login(any(CusCorporateLoginRequest.class), eq(META))).thenReturn(response);
        var body = new LinkedHashMap<>(validBody("/login"));
        body.put("ipAddress", "198.51.100.99");
        body.put("userAgent", "Untrusted body");
        var result = mvc.perform(request("/login", body)).andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "OTP requested", "otpRequired", true, "challengeGroupId", GROUP));
        var dto = ArgumentCaptor.forClass(CusCorporateLoginRequest.class);
        verify(auth).login(dto.capture(), eq(META));
        assertEquals("SYNTHETIC-COMPANY", dto.getValue().getCompanyCustomerCode());
        assertEquals("SYNTHETIC-USER", dto.getValue().getCorporateUserCode());
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
    void verificationPreservesCorporateFirstLoginAndTokenFields(boolean setup, boolean password,
            boolean pin, String access, String refresh) throws Exception {
        var response = new CusCorporateOtpVerifyResponse(true, "Verified", setup, password, pin, access, refresh);
        when(auth.verifyLoginOtp(any(CusCorporateOtpVerifyRequest.class), eq(META))).thenReturn(response);
        var result = mvc.perform(request("/verify-otp", validBody("/verify-otp")))
                .andExpect(status().isOk()).andReturn();
        var expected = new LinkedHashMap<String, Object>(Map.of("success", true, "message", "Verified",
                "firstLogin", setup, "passwordChangeRequired", password, "pinSetupRequired", pin));
        expected.put("accessToken", access);
        expected.put("refreshToken", refresh);
        assertJson(result, expected);
        var dto = ArgumentCaptor.forClass(CusCorporateOtpVerifyRequest.class);
        verify(auth).verifyLoginOtp(dto.capture(), eq(META));
        assertEquals(GROUP, dto.getValue().getChallengeGroupId());
        assertEquals("123456", dto.getValue().getOtp());
    }

    @Test
    void resendUsesExistingMetadataFreeFacadeContract() throws Exception {
        var response = new CusOtpResendResponse(true, "Resent", GROUP, "c***@example.test", 2);
        when(auth.resendLoginOtp(any(CusOtpResendRequest.class))).thenReturn(response);
        var result = mvc.perform(request("/resend-otp", Map.of("challengeGroupId", GROUP)))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Resent", "challengeGroupId", GROUP,
                "maskedEmail", "c***@example.test", "resendNo", 2));
        var dto = ArgumentCaptor.forClass(CusOtpResendRequest.class);
        verify(auth).resendLoginOtp(dto.capture());
        assertEquals(GROUP, dto.getValue().getChallengeGroupId());
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void passwordChangeBindsFieldsAndPreservesBothPinSetupOutcomes(boolean pinRequired) throws Exception {
        when(firstLogin.changeFirstLoginPassword(any(CusCorporateFirstLoginPasswordRequest.class))).thenReturn(pinRequired);
        var result = mvc.perform(request("/first-login/change-password", validBody("/first-login/change-password")))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Password changed successfully.", "pinSetupRequired", pinRequired));
        var dto = ArgumentCaptor.forClass(CusCorporateFirstLoginPasswordRequest.class);
        verify(firstLogin).changeFirstLoginPassword(dto.capture());
        assertEquals(GROUP, dto.getValue().getChallengeGroupId());
        assertEquals("NewPass1!", dto.getValue().getNewPassword());
        assertEquals("NewPass1!", dto.getValue().getConfirmPassword());
    }

    @Test
    void pinSetupUsesCorporateTransactionPinNamesAndExactMessage() throws Exception {
        mvc.perform(request("/first-login/setup-pin", validBody("/first-login/setup-pin")))
                .andExpect(status().isOk()).andExpect(content().string("Transaction PIN set up successfully."));
        var dto = ArgumentCaptor.forClass(CusCorporatePinSetupRequest.class);
        verify(firstLogin).setupTransactionPin(dto.capture());
        assertEquals(GROUP, dto.getValue().getChallengeGroupId());
        assertEquals("246810", dto.getValue().getTransactionPin());
        assertEquals("246810", dto.getValue().getConfirmTransactionPin());
    }

    @Test
    void completionReadsRequiredParameterAndForwardsMetadataWithoutBody() throws Exception {
        var response = new CusCorporateOtpVerifyResponse(true, "Login successful.", false, false, false, ACCESS, REFRESH);
        when(auth.completeFirstLogin(GROUP, META)).thenReturn(response);
        var result = mvc.perform(request("/first-login/complete", null).param("challengeGroupId", GROUP))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Login successful.", "firstLogin", false,
                "passwordChangeRequired", false, "pinSetupRequired", false, "accessToken", ACCESS, "refreshToken", REFRESH));
        verify(auth).completeFirstLogin(GROUP, META);
    }

    @Test
    void refreshBindsRefreshTokenAndMetadata() throws Exception {
        var response = new CusTokenResponse(true, "Refreshed", ACCESS, REFRESH);
        when(auth.refreshToken(any(CusRefreshTokenRequest.class), eq(META))).thenReturn(response);
        var result = mvc.perform(request("/refresh", Map.of("refreshToken", "synthetic-old-corporate-refresh")))
                .andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Refreshed", "accessToken", ACCESS, "refreshToken", REFRESH));
        var dto = ArgumentCaptor.forClass(CusRefreshTokenRequest.class);
        verify(auth).refreshToken(dto.capture(), eq(META));
        assertEquals("synthetic-old-corporate-refresh", dto.getValue().getRefreshToken());
    }

    @Test
    void logoutForwardsExactAuthorizationAndMetadata() throws Exception {
        mvc.perform(request("/logout", null).header("Authorization", AUTHORIZATION))
                .andExpect(status().isOk()).andExpect(content().string("Logged out successfully."));
        verify(auth).logout(AUTHORIZATION, META);
    }

    @Test
    void keepAliveReturnsFixedContractWithoutFacadeCalls() throws Exception {
        var result = mvc.perform(get(BASE + "/session/keep-alive")).andExpect(status().isOk()).andReturn();
        assertJson(result, Map.of("success", true, "message", "Corporate session is active."));
        verifyNoInteractions(auth, firstLogin); // Production authorization is not installed in this fixture.
    }

    static Stream<Arguments> invalidDtos() {
        var cases = new ArrayList<Arguments>();
        Map<String, Map<String, String>> required = Map.of(
                "/login", Map.of("companyCustomerCode", "Company customer code is required", "corporateUserCode", "Corporate user code is required", "password", "Password is required"),
                "/verify-otp", Map.of("challengeGroupId", "Challenge group ID is required", "otp", "OTP is required"),
                "/first-login/change-password", Map.of("challengeGroupId", "Challenge group ID is required", "newPassword", "New password is required", "confirmPassword", "Confirm password is required"),
                "/first-login/setup-pin", Map.of("challengeGroupId", "Challenge group ID is required", "transactionPin", "Transaction PIN is required", "confirmTransactionPin", "Confirm transaction PIN is required"));
        required.forEach((path, fields) -> fields.forEach((field, message) -> {
            for (String kind : new String[]{"missing", "null", "blank"}) {
                var body = new LinkedHashMap<>(validBody(path));
                if (kind.equals("missing")) body.remove(field);
                else body.put(field, kind.equals("null") ? null : " ");
                cases.add(Arguments.of(path, field + ":" + kind, body, message));
            }
        }));
        for (String invalid : new String[]{"12345", "1234567", "12a456", " 123456"}) {
            var otp = new LinkedHashMap<>(validBody("/verify-otp")); otp.put("otp", invalid);
            cases.add(Arguments.of("/verify-otp", "otp:" + invalid, otp, "OTP must be exactly 6 digits"));
            var pin = new LinkedHashMap<>(validBody("/first-login/setup-pin")); pin.put("transactionPin", invalid);
            cases.add(Arguments.of("/first-login/setup-pin", "transactionPin:" + invalid, pin, "Transaction PIN must be exactly 6 digits"));
        }
        return cases.stream();
    }

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("invalidDtos")
    void validatedDtosRejectMissingNullBlankAndMalformedFieldsBeforeServices(String path, String scenario,
            Map<String, String> body, String message) throws Exception {
        var result = mvc.perform(request(path, body)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message", containsString(message))).andReturn();
        assertInstanceOf(MethodArgumentNotValidException.class, result.getResolvedException(), scenario);
        verifyNoInteractions(auth, firstLogin);
    }

    @Test
    void passwordMatchingAndPolicyAreStillServiceResponsibilities() throws Exception {
        when(firstLogin.changeFirstLoginPassword(any(CusCorporateFirstLoginPasswordRequest.class)))
                .thenThrow(new CusValidationException("Synthetic password policy failure"));
        mvc.perform(request("/first-login/change-password", Map.of("challengeGroupId", GROUP,
                        "newPassword", "short", "confirmPassword", "different")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Synthetic password policy failure"));
        var dto = ArgumentCaptor.forClass(CusCorporateFirstLoginPasswordRequest.class);
        verify(firstLogin).changeFirstLoginPassword(dto.capture());
        assertEquals("short", dto.getValue().getNewPassword());
        assertEquals("different", dto.getValue().getConfirmPassword());
    }

    @Test
    void pinConfirmationMatchingIsStillAServiceResponsibility() throws Exception {
        doThrow(new CusValidationException("Synthetic PIN mismatch"))
                .when(firstLogin).setupTransactionPin(any(CusCorporatePinSetupRequest.class));
        mvc.perform(request("/first-login/setup-pin", Map.of("challengeGroupId", GROUP,
                        "transactionPin", "246810", "confirmTransactionPin", "135790")))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("Synthetic PIN mismatch"));
        var dto = ArgumentCaptor.forClass(CusCorporatePinSetupRequest.class);
        verify(firstLogin).setupTransactionPin(dto.capture());
        assertEquals("246810", dto.getValue().getTransactionPin());
        assertEquals("135790", dto.getValue().getConfirmTransactionPin());
    }

    @Test
    void resendWithoutChallengeReachesServiceValidation() throws Exception {
        when(auth.resendLoginOtp(any(CusOtpResendRequest.class))).thenThrow(new CusValidationException("Synthetic missing challenge"));
        mvc.perform(request("/resend-otp", Map.of())).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
        var dto = ArgumentCaptor.forClass(CusOtpResendRequest.class);
        verify(auth).resendLoginOtp(dto.capture());
        assertNull(dto.getValue().getChallengeGroupId());
    }

    @Test
    void refreshWithoutTokenReachesServiceAuthenticationChecks() throws Exception {
        when(auth.refreshToken(any(CusRefreshTokenRequest.class), eq(META))).thenThrow(new CusAuthenticationException("Refresh token is required."));
        mvc.perform(request("/refresh", Map.of())).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        var dto = ArgumentCaptor.forClass(CusRefreshTokenRequest.class);
        verify(auth).refreshToken(dto.capture(), eq(META));
        assertNull(dto.getValue().getRefreshToken());
    }

    static Stream<Arguments> serviceFailures() {
        return Stream.of(
                Arguments.of(new CusAuthenticationException("Synthetic failure"), 401, "UNAUTHORIZED"),
                Arguments.of(new CusAccountLockedException("Synthetic failure"), 423, "ACCOUNT_LOCKED"),
                Arguments.of(new CusValidationException("Synthetic failure"), 400, "VALIDATION_ERROR"),
                Arguments.of(new CusOtpException("Synthetic failure"), 400, "OTP_ERROR"),
                Arguments.of(new CusSessionExpiredException("Synthetic failure"), 401, "SESSION_EXPIRED"),
                Arguments.of(new CusOtpResendLimitException("Synthetic failure"), 429, "OTP_RESEND_LIMIT_REACHED"),
                Arguments.of(new CusEmailException("Synthetic failure"), 503, "EMAIL_SERVICE_UNAVAILABLE"));
    }

    @ParameterizedTest
    @MethodSource("serviceFailures")
    void corporateServiceFailuresUseGlobalAdvice(RuntimeException failure, int status, String code) throws Exception {
        when(auth.verifyLoginOtp(any(CusCorporateOtpVerifyRequest.class), eq(META))).thenThrow(failure);
        mvc.perform(request("/verify-otp", validBody("/verify-otp"))).andExpect(status().is(status))
                .andExpect(jsonPath("$.status").value(status)).andExpect(jsonPath("$.code").value(code))
                .andExpect(jsonPath("$.message").value("Synthetic failure"))
                .andExpect(jsonPath("$.timestamp").isNotEmpty());
        verify(auth).verifyLoginOtp(argThat(r -> GROUP.equals(r.getChallengeGroupId()) && "123456".equals(r.getOtp())), eq(META));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "{", "null"})
    void missingOrMalformedJsonCurrentlyFallsThroughTo500(String body) throws Exception {
        var result = mvc.perform(request("/login", null).content(body)).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR")).andReturn();
        assertInstanceOf(HttpMessageNotReadableException.class, result.getResolvedException());
        verifyNoInteractions(auth, firstLogin);
    }

    @Test
    void completionJsonBodyDoesNotReplaceRequiredRequestParameter() throws Exception {
        var result = mvc.perform(request("/first-login/complete", Map.of("challengeGroupId", GROUP)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR")).andReturn();
        assertInstanceOf(MissingServletRequestParameterException.class, result.getResolvedException());
        verifyNoInteractions(auth, firstLogin);
    }

    @Test
    void missingLogoutHeaderIsRejectedBeforeServiceAndCurrentlyReturns500() throws Exception {
        var result = mvc.perform(request("/logout", null)).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR")).andReturn();
        assertInstanceOf(MissingRequestHeaderException.class, result.getResolvedException());
        verifyNoInteractions(auth, firstLogin);
    }

    @ParameterizedTest
    @ValueSource(strings = {"/login", "/verify-otp", "/resend-otp", "/first-login/change-password",
            "/first-login/setup-pin", "/first-login/complete", "/refresh", "/logout", "/session/keep-alive"})
    void everyMappingRejectsWrongHttpMethodBeforeServices(String path) throws Exception {
        var builder = path.equals("/session/keep-alive") ? post(BASE + path) : get(BASE + path);
        var result = mvc.perform(builder).andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR")).andReturn();
        assertInstanceOf(HttpRequestMethodNotSupportedException.class, result.getResolvedException());
        verifyNoInteractions(auth, firstLogin);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void explicitAdviceRegistrationOrderChangesValidationEnvelope(boolean globalFirst) throws Exception {
        Object global = new GlobalExceptionHandler(), staff = new StaffPasswordSetupExceptionHandler();
        var ordered = MockMvcBuilders.standaloneSetup(controller).setValidator(validator)
                .setControllerAdvice(globalFirst ? new Object[]{global, staff} : new Object[]{staff, global}).build();
        var result = ordered.perform(request("/login", Map.of())).andExpect(status().isBadRequest());
        if (globalFirst) {
            result.andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                    .andExpect(jsonPath("$.status").value(400)).andExpect(jsonPath("$.timestamp").isNotEmpty());
        } else {
            result.andExpect(jsonPath("$.code").doesNotExist()).andExpect(jsonPath("$.status").doesNotExist())
                    .andExpect(jsonPath("$.timestamp").doesNotExist());
        }
        result.andExpect(jsonPath("$.message").isNotEmpty());
        verifyNoInteractions(auth, firstLogin);
    }

    @ParameterizedTest
    @ValueSource(booleans = {true, false})
    void explicitAdviceOrderAlsoChangesIllegalStateStatus(boolean globalFirst) throws Exception {
        Object global = new GlobalExceptionHandler(), staff = new StaffPasswordSetupExceptionHandler();
        var ordered = MockMvcBuilders.standaloneSetup(controller).setValidator(validator)
                .setControllerAdvice(globalFirst ? new Object[]{global, staff} : new Object[]{staff, global}).build();
        when(auth.resendLoginOtp(any(CusOtpResendRequest.class))).thenThrow(new IllegalStateException("Synthetic state failure"));
        var result = ordered.perform(request("/resend-otp", Map.of("challengeGroupId", GROUP)))
                .andExpect(status().is(globalFirst ? 500 : 409)).andExpect(jsonPath("$.message").value("Synthetic state failure"));
        if (globalFirst) result.andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"));
        else result.andExpect(jsonPath("$.code").doesNotExist());
        verify(auth).resendLoginOtp(argThat(r -> GROUP.equals(r.getChallengeGroupId())));
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void missingAndOversizedAgentsPreserveExistingMetadataPolicy(boolean oversized) throws Exception {
        var response = new CusCorporateLoginResponse(true, "OTP requested", true, GROUP);
        when(auth.login(any(CusCorporateLoginRequest.class), any(CusSessionClientMetadata.class))).thenReturn(response);
        var builder = post(BASE + "/login").contentType(MediaType.APPLICATION_JSON)
                .content(JSON.writeValueAsString(validBody("/login")))
                .header("X-Forwarded-For", "198.51.100.99").with(r -> { r.setRemoteAddr(IP); return r; });
        if (oversized) builder.header("User-Agent", "A".repeat(5000));
        mvc.perform(builder).andExpect(status().isOk());
        var metadata = ArgumentCaptor.forClass(CusSessionClientMetadata.class);
        verify(auth).login(any(CusCorporateLoginRequest.class), metadata.capture());
        assertEquals(new CusSessionClientMetadata(IP, oversized ? "A".repeat(255) : null), metadata.getValue());
    }

    private static Map<String, String> validBody(String path) {
        return switch (path) {
            case "/login" -> Map.of("companyCustomerCode", "SYNTHETIC-COMPANY", "corporateUserCode", "SYNTHETIC-USER", "password", "TestPass1!");
            case "/verify-otp" -> Map.of("challengeGroupId", GROUP, "otp", "123456");
            case "/first-login/change-password" -> Map.of("challengeGroupId", GROUP, "newPassword", "NewPass1!", "confirmPassword", "NewPass1!");
            case "/first-login/setup-pin" -> Map.of("challengeGroupId", GROUP, "transactionPin", "246810", "confirmTransactionPin", "246810");
            default -> throw new AssertionError(path);
        };
    }

    private static MockHttpServletRequestBuilder request(String path, Map<String, ?> body) {
        var builder = post(BASE + path).contentType(MediaType.APPLICATION_JSON)
                .header("User-Agent", AGENT).header("X-Forwarded-For", "198.51.100.99")
                .header("Forwarded", "for=198.51.100.99").with(r -> { r.setRemoteAddr(IP); return r; });
        return body == null ? builder : builder.content(JSON.writeValueAsString(body));
    }

    private static void assertJson(MvcResult result, Object expected) {
        assertEquals(MediaType.APPLICATION_JSON_VALUE, result.getResponse().getContentType());
        assertEquals(JSON.readTree(JSON.writeValueAsString(expected)), JSON.readTree(result.getResponse().getContentAsByteArray()));
    }
}
