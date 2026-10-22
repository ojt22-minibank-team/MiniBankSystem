package com.corebanking.service;

import com.corebanking.dto.CusSessionClientMetadata;

import com.corebanking.dto.CusCorporateLoginRequest;
import com.corebanking.dto.CusCorporateLoginResponse;
import com.corebanking.dto.CusCorporateOtpVerifyRequest;
import com.corebanking.dto.CusCorporateOtpVerifyResponse;
import com.corebanking.dto.CusOtpResendRequest;
import com.corebanking.dto.CusOtpResendResponse;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.entity.CorporateCredential;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.repository.CusCorporateCredentialRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CusCorporateAuthService {

    private final CusCorporateCredentialService corporateCredentialService;
    private final CusCorporateOtpService corporateOtpService;
    private final CusCorporateSessionService corporateSessionService;
    private final CusCorporateCredentialRepository corporateCredentialRepository;

    public CusCorporateLoginResponse login(CusCorporateLoginRequest request) {
        return login(request, CusSessionClientMetadata.EMPTY);
    }

    public CusCorporateLoginResponse login(CusCorporateLoginRequest request, CusSessionClientMetadata metadata) {
        UUID corporateUserId = corporateCredentialService.authenticateCredentials(request, metadata);
        OtpChallenge challenge = corporateOtpService.createLoginOtp(corporateUserId);
        return new CusCorporateLoginResponse(
                true,
                "OTP has been sent to your registered email.",
                true,
                challenge.getChallengeGroupId()
        );
    }

    public UUID authenticateCredentials(CusCorporateLoginRequest request) {
        return corporateCredentialService.authenticateCredentials(request);
    }

    public CusCorporateOtpVerifyResponse verifyLoginOtp(CusCorporateOtpVerifyRequest request) {
        return verifyLoginOtp(request, CusSessionClientMetadata.EMPTY);
    }

    public CusCorporateOtpVerifyResponse verifyLoginOtp(CusCorporateOtpVerifyRequest request, CusSessionClientMetadata metadata) {
        UUID corporateUserId = corporateOtpService.verifyLoginOtp(request);
        CorporateCredential credentials = corporateCredentialRepository.findById(corporateUserId)
                .orElseThrow(() -> new CusAuthenticationException("Invalid login credentials."));
        boolean passwordChangeRequired = credentials.isMustChangePassword();
        boolean pinSetupRequired = credentials.getTransactionPinHash() == null
                || credentials.getTransactionPinHash().isBlank();
        if (passwordChangeRequired || pinSetupRequired) {
            return new CusCorporateOtpVerifyResponse(
                    true,
                    "OTP verified. Please complete first-time setup.",
                    true,
                    passwordChangeRequired,
                    pinSetupRequired,
                    null,
                    null
            );
        }
        CusTokenResponse tokens = corporateSessionService.createAuthenticatedSession(
                request.getChallengeGroupId(), metadata
        );
        return completedLoginResponse(tokens, "OTP verified successfully.");
    }

    public CusOtpResendResponse resendLoginOtp(CusOtpResendRequest request) {
        return corporateOtpService.resendLoginOtp(request);
    }

    public CusCorporateOtpVerifyResponse completeFirstLogin(String challengeGroupId) {
        return completeFirstLogin(challengeGroupId, CusSessionClientMetadata.EMPTY);
    }

    public CusCorporateOtpVerifyResponse completeFirstLogin(String challengeGroupId, CusSessionClientMetadata metadata) {
        CusTokenResponse tokens = corporateSessionService.createAuthenticatedSession(challengeGroupId, metadata);
        return completedLoginResponse(tokens, "Login successful.");
    }

    public CusTokenResponse refreshToken(CusRefreshTokenRequest request) {
        return refreshToken(request, CusSessionClientMetadata.EMPTY);
    }

    public CusTokenResponse refreshToken(CusRefreshTokenRequest request, CusSessionClientMetadata metadata) {
        return corporateSessionService.refreshToken(request, metadata);
    }

    public void logout(String authorizationHeader) {
        logout(authorizationHeader, CusSessionClientMetadata.EMPTY);
    }

    public void logout(String authorizationHeader, CusSessionClientMetadata metadata) {
        corporateSessionService.logout(authorizationHeader, metadata);
    }

    private CusCorporateOtpVerifyResponse completedLoginResponse(CusTokenResponse tokens, String message) {
        return new CusCorporateOtpVerifyResponse(
                true, message, false, false, false, tokens.getAccessToken(), tokens.getRefreshToken()
        );
    }
}
