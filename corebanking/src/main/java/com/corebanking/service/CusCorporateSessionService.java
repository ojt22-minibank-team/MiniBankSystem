package com.corebanking.service;

import com.corebanking.dto.CusSessionClientMetadata;

import com.corebanking.dto.CusTokenResponse;
import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.CorporateCredential;
import com.corebanking.entity.CorporateUser;
import com.corebanking.entity.Customers;
import com.corebanking.entity.LoginAttempt;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.CorporateUserStatus;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.OtpSubjectType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusOtpException;
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCorporateCredentialRepository;
import com.corebanking.repository.CusCorporateSessionActivityRepository;
import com.corebanking.repository.CusLoginAttemptsRepository;
import com.corebanking.repository.CusJwtRevokedTokensRepository;
import com.corebanking.repository.CusOtpChallengesRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.IncorrectClaimException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.security.SignatureException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CusCorporateSessionService {

    private static final int SETUP_WINDOW_MINUTES = 10;

    private final CusSessionService cusSessionService;
    private final CusJwtService cusJwtService;
    private final CusOtpChallengesRepository otpChallengesRepository;
    private final CusCorporateCredentialRepository corporateCredentialRepository;
    private final CusAuthSessionsRepository authSessionsRepository;
    private final CusLoginAttemptsRepository loginAttemptsRepository;
    private final CusAuditLogsRepository auditLogsRepository;
    private final CusJwtRevokedTokensRepository jwtRevokedTokensRepository;
    private final CusCorporateSessionActivityRepository corporateActivityRepository;

    @PersistenceContext
    private EntityManager entityManager;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public CusTokenResponse createAuthenticatedSession(String challengeGroupId) {
        return createAuthenticatedSession(challengeGroupId, CusSessionClientMetadata.EMPTY);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public CusTokenResponse createAuthenticatedSession(String challengeGroupId, CusSessionClientMetadata metadata) {
        metadata = metadata == null ? CusSessionClientMetadata.EMPTY : metadata;
        if (challengeGroupId == null || challengeGroupId.isBlank()) {
            throw new CusValidationException("OTP challenge information is required.");
        }
        String requestedGroupId = challengeGroupId.trim();
        UUID corporateUserId = resolveCorporateUserId(requestedGroupId);
        // Discard provisional entities before the authoritative locking reads.
        entityManager.clear();
        CorporateCredential credentials = corporateCredentialRepository
                .findByCorporateUserIdForUpdate(corporateUserId)
                .orElseThrow(() -> new CusAuthenticationException("Invalid login credentials."));
        validateCurrentLoginGroup(corporateUserId, requestedGroupId);

        OtpChallenge challenge = otpChallengesRepository
                .findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                        requestedGroupId, OtpSubjectType.CORPORATE_USER, OtpPurpose.LOGIN
                )
                .orElseThrow(() -> new CusOtpException("Invalid OTP challenge."));
        validateCompletionBinding(challenge);

        CorporateUser user = challenge.getCorporateUser();
        if (user == null || !corporateUserId.equals(user.getCorporateUserId())
                || challenge.getCustomer() != null) {
            throw new CusOtpException("Invalid corporate OTP challenge.");
        }
        Customers company = user.getCompanyInfo() == null
                ? null : user.getCompanyInfo().getCustomer();
        if (user.getStatus() != CorporateUserStatus.ACTIVE
                || company == null
                || company.getCustomerType() != CustomerType.COMPANY
                || company.getStatus() != CustomerStatus.ACTIVE) {
            throw new CusAuthenticationException("Corporate user or company is not active or invalid.");
        }
        validateCompletionBinding(challenge);
        if (credentials.getTokenVersion() == null) {
            throw new CusAuthenticationException("Invalid credential token version.");
        }
        boolean passwordChangeRequired = credentials.isMustChangePassword();
        boolean pinSetupRequired = credentials.getTransactionPinHash() == null
                || credentials.getTransactionPinHash().isBlank();
        if (passwordChangeRequired || pinSetupRequired) {
            throw new CusValidationException("Please complete first-time password and PIN setup.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime absoluteDeadline = now.plusHours(CusJwtService.SESSION_LIFETIME_HOURS);
        String sessionUuid = UUID.randomUUID().toString();
        String accessToken = cusJwtService.generateCorporateAccessToken(
                corporateUserId, sessionUuid, credentials.getTokenVersion()
        );
        String refreshToken = cusJwtService.generateCorporateRefreshToken(
                corporateUserId,
                sessionUuid,
                credentials.getTokenVersion(),
                Date.from(absoluteDeadline.atZone(ZoneId.systemDefault()).toInstant())
        );
        AuthSession session = AuthSession.builder()
                .sessionUuid(sessionUuid)
                .ipAddress(metadata.ipAddress())
                .userAgent(metadata.userAgent())
                .subjectType(SessionSubjectType.CORPORATE_USER)
                .corporateUser(user)
                .customer(null)
                .staff(null)
                .refreshTokenHash(cusSessionService.hashRefreshToken(refreshToken))
                .tokenVersionAtIssue(credentials.getTokenVersion())
                .issuedAt(now)
                .lastSeenAt(now)
                .refreshExpiresAt(absoluteDeadline)
                .idleTimeoutMinutes(5)
                .updatedByType(UpdatedByType.CORPORATE_USER)
                .updatedById(corporateUserId)
                .build();
        authSessionsRepository.saveAndFlush(session);

        credentials.setLastLoginAt(now);
        credentials.setUpdatedByType(UpdatedByType.CORPORATE_USER);
        credentials.setUpdatedById(corporateUserId);
        corporateCredentialRepository.saveAndFlush(credentials);

        loginAttemptsRepository.saveAndFlush(LoginAttempt.builder()
                .ipAddress(metadata == null ? null : metadata.ipAddress())
                .userAgent(metadata == null ? null : metadata.userAgent())
                .actorType(SessionSubjectType.CORPORATE_USER)
                .corporateUser(user)
                .customer(null)
                .staff(null)
                .loginIdentifier(loginIdentifier(company.getCustomerCode(), user.getCorporateUserCode()))
                .success(true)
                .failureReason(null)
                .updatedByType(UpdatedByType.CORPORATE_USER)
                .updatedById(corporateUserId)
                .build());

        auditLogsRepository.saveAndFlush(AuditLogs.builder()
                .ipAddress(metadata == null ? null : metadata.ipAddress())
                .userAgent(metadata == null ? null : metadata.userAgent())
                .actorType(ActorType.CORPORATE_USER)
                .actorCorporateUser(user)
                .actorCustomer(null)
                .actorStaff(null)
                .actionType("AUTH_SESSION_CREATED")
                .entityType("AUTH_SESSION")
                .entityId(sessionUuid)
                .newValues("{\"status\":\"ACTIVE\",\"idleTimeoutMinutes\":5}")
                .build());

        // EXPIRED also terminates this consumed setup binding after completion.
        challenge.setStatus(OtpStatus.EXPIRED);
        challenge.setUpdatedByType(UpdatedByType.CORPORATE_USER);
        challenge.setUpdatedById(corporateUserId);
        otpChallengesRepository.saveAndFlush(challenge);

        return new CusTokenResponse(true, "Login successful.", accessToken, refreshToken);
    }

    @Transactional(noRollbackFor = CusSessionExpiredException.class)
    public CusTokenResponse refreshToken(CusRefreshTokenRequest request) {
        return refreshToken(request, CusSessionClientMetadata.EMPTY);
    }

    @Transactional(noRollbackFor = CusSessionExpiredException.class)
    public CusTokenResponse refreshToken(CusRefreshTokenRequest request, CusSessionClientMetadata metadata) {
        if (request == null
                || request.getRefreshToken() == null
                || request.getRefreshToken().isBlank()) {
            throw new CusAuthenticationException("Refresh token is required.");
        }
        String oldRefreshToken = request.getRefreshToken().trim();
        Claims claims;
        try {
            claims = cusJwtService.getClaims(oldRefreshToken);
        } catch (MalformedJwtException | ExpiredJwtException
                | SignatureException | IncorrectClaimException ex) {
            // Client credential errors only; signing-key/configuration failures propagate.
            throw new CusAuthenticationException("Invalid or expired refresh token.");
        }
        AuthSession session = validateRefreshSession(claims, oldRefreshToken);
        CorporateUser user = session.getCorporateUser();
        if (user == null || user.getCorporateUserId() == null) {
            throw new CusAuthenticationException("Corporate session is invalid.");
        }
        UUID corporateUserId = user.getCorporateUserId();
        CorporateCredential credentials = corporateCredentialRepository.findById(corporateUserId)
                .orElseThrow(() -> new CusAuthenticationException("Corporate credentials not found."));
        if (credentials.getTokenVersion() == null) {
            throw new CusAuthenticationException("Invalid credential token version.");
        }

        LocalDateTime absoluteDeadline =
                session.getIssuedAt().plusHours(CusJwtService.SESSION_LIFETIME_HOURS);
        LocalDateTime effectiveDeadline =
                session.getRefreshExpiresAt().isBefore(absoluteDeadline)
                        ? session.getRefreshExpiresAt()
                        : absoluteDeadline;
        String newAccessToken = cusJwtService.generateCorporateAccessToken(
                corporateUserId, session.getSessionUuid(), credentials.getTokenVersion()
        );
        String newRefreshToken = cusJwtService.generateCorporateRefreshToken(
                corporateUserId,
                session.getSessionUuid(),
                credentials.getTokenVersion(),
                Date.from(effectiveDeadline.atZone(ZoneId.systemDefault()).toInstant())
        );
        String expectedOldHash = cusSessionService.hashRefreshToken(oldRefreshToken);
        String newRefreshHash = cusSessionService.hashRefreshToken(newRefreshToken);
        LocalDateTime now = LocalDateTime.now();
        int updatedRows = authSessionsRepository.rotateRefreshTokenIfMatch(
                session.getSessionUuid(),
                expectedOldHash,
                newRefreshHash,
                effectiveDeadline,
                now,
                UpdatedByType.CORPORATE_USER,
                corporateUserId
        );
        if (updatedRows != 1) {
            throw new CusAuthenticationException(
                    "Refresh token has already been used or is no longer valid."
            );
        }
        auditLogsRepository.save(AuditLogs.builder()
                .ipAddress(metadata == null ? null : metadata.ipAddress())
                .userAgent(metadata == null ? null : metadata.userAgent())
                .actorType(ActorType.CORPORATE_USER)
                .actorCorporateUser(user)
                .actorCustomer(null)
                .actorStaff(null)
                .actionType("TOKEN_REFRESHED")
                .entityType("AUTH_SESSION")
                .entityId(session.getSessionUuid())
                .newValues("{\"status\":\"ACTIVE\",\"refreshTokenRotated\":true}")
                .build());
        return new CusTokenResponse(
                true, "Token refreshed successfully.", newAccessToken, newRefreshToken
        );
    }

    @Transactional(noRollbackFor = CusSessionExpiredException.class)
    public void logout(String authorizationHeader) {
        logout(authorizationHeader, CusSessionClientMetadata.EMPTY);
    }

    @Transactional(noRollbackFor = CusSessionExpiredException.class)
    public void logout(String authorizationHeader, CusSessionClientMetadata metadata) {
        if (authorizationHeader == null || authorizationHeader.isBlank()
                || !authorizationHeader.startsWith("Bearer ")) {
            throw new CusAuthenticationException("Access token is required.");
        }
        String accessToken = authorizationHeader.substring(7).trim();
        if (accessToken.isBlank()) {
            throw new CusAuthenticationException("Access token is required.");
        }
        Claims claims = cusJwtService.getClaims(accessToken);
        if (!"ACCESS".equals(claims.get("tokenType", String.class))) {
            throw new CusAuthenticationException("Invalid access token.");
        }
        String jti = claims.getId();
        if (jti == null || jti.isBlank()) {
            throw new CusAuthenticationException("Invalid token ID.");
        }
        AuthSession session = validateAccessSessionForLogout(claims);
        CorporateUser user = session.getCorporateUser();
        if (user == null || user.getCorporateUserId() == null) {
            throw new CusSessionExpiredException("Corporate session is invalid.");
        }
        UUID corporateUserId = user.getCorporateUserId();
        boolean revoked = revokeSession(session, "USER_LOGOUT");
        if (!revoked) {
            return;
        }
        if (!jwtRevokedTokensRepository.existsByJti(jti)) {
            jwtRevokedTokensRepository.save(JwtRevokedTokens.builder()
                    .jti(jti)
                    .subjectType(SessionSubjectType.CORPORATE_USER)
                    .corporateUser(user)
                    .customer(null)
                    .staff(null)
                    .tokenExpiresAt(claims.getExpiration().toInstant()
                            .atZone(ZoneId.systemDefault()).toLocalDateTime())
                    .reason("USER_LOGOUT")
                    .updatedByType(UpdatedByType.CORPORATE_USER)
                    .updatedById(corporateUserId)
                    .build());
        }
        auditLogsRepository.save(AuditLogs.builder()
                .ipAddress(metadata == null ? null : metadata.ipAddress())
                .userAgent(metadata == null ? null : metadata.userAgent())
                .actorType(ActorType.CORPORATE_USER)
                .actorCorporateUser(user)
                .actorCustomer(null)
                .actorStaff(null)
                .actionType("CUSTOMER_LOGOUT")
                .entityType("AUTH_SESSION")
                .entityId(session.getSessionUuid())
                .oldValues("{\"status\":\"ACTIVE\"}")
                .newValues("{\"status\":\"REVOKED\",\"reason\":\"USER_LOGOUT\"}")
                .build());
    }

    private UUID resolveCorporateUserId(String challengeGroupId) {
        OtpChallenge provisional = otpChallengesRepository
                .findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                        challengeGroupId, OtpSubjectType.CORPORATE_USER, OtpPurpose.LOGIN)
                .orElseThrow(() -> new CusOtpException("Invalid OTP challenge."));
        CorporateUser user = provisional.getCorporateUser();
        if (user == null || user.getCorporateUserId() == null || provisional.getCustomer() != null) {
            throw new CusOtpException("Invalid corporate OTP challenge.");
        }
        return user.getCorporateUserId();
    }

    private void validateCurrentLoginGroup(UUID corporateUserId, String challengeGroupId) {
        OtpChallenge original = otpChallengesRepository
                .findFirstByCorporateUser_CorporateUserIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(
                        corporateUserId, OtpSubjectType.CORPORATE_USER, OtpPurpose.LOGIN, 0)
                .orElseThrow(() -> new CusOtpException("Invalid current login challenge. Please login again."));
        if (!challengeGroupId.equals(original.getChallengeGroupId())) {
            throw new CusOtpException("This login challenge has been superseded. Please login again.");
        }
    }

    private void validateCompletionBinding(OtpChallenge challenge) {
        if (challenge.getStatus() != OtpStatus.CONSUMED) {
            throw new CusOtpException("OTP verification is required or login has already completed.");
        }
        if (challenge.getConsumedAt() == null
                || challenge.getConsumedAt().plusMinutes(SETUP_WINDOW_MINUTES)
                        .isBefore(LocalDateTime.now())) {
            throw new CusSessionExpiredException(
                    "First-login setup session has expired. Please login again."
            );
        }
    }

    private String loginIdentifier(String companyCode, String userCode) {
        String identifier = companyCode.length() + ":" + companyCode + ":" + userCode;
        return identifier.substring(0, Math.min(identifier.length(), 191));
    }

    public AuthSession validateAccessSession(Claims claims) {
        // Reuse authoritative ACCESS validation without its shared entity-save path.
        AuthSession session = cusSessionService.validateCorporateAccessSessionForLogout(claims);
        if (corporateActivityRepository.touchIfActive(session.getSessionUuid(), session.getTokenVersionAtIssue()) != 1) {
            throw new CusSessionExpiredException("Authentication session has expired.");
        }
        // Do not mutate or save this entity: it may predate a concurrent rotation/revoke.
        return session;
    }

    public AuthSession validateRefreshSession(Claims claims, String rawRefreshToken) {
        return cusSessionService.validateCorporateRefreshSession(claims, rawRefreshToken);
    }

    public AuthSession validateAccessSessionForLogout(Claims claims) {
        return cusSessionService.validateCorporateAccessSessionForLogout(claims);
    }

    public String hashRefreshToken(String refreshToken) {
        return cusSessionService.hashRefreshToken(refreshToken);
    }

    public boolean revokeSession(AuthSession session, String reason) {
        if (session == null || session.getSubjectType() != SessionSubjectType.CORPORATE_USER
                || session.getCorporateUser() == null
                || session.getCorporateUser().getCorporateUserId() == null) {
            throw new CusAuthenticationException("Corporate session is invalid.");
        }
        return cusSessionService.revokeSession(
                session,
                reason,
                UpdatedByType.CORPORATE_USER,
                session.getCorporateUser().getCorporateUserId()
        );
    }
}
