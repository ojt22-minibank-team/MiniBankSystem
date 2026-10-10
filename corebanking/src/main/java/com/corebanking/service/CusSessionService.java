package com.corebanking.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.corebanking.entity.AuthSessions;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCredentialsRepository;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;


@Service
@RequiredArgsConstructor
public class CusSessionService {

    private final CusAuthSessionsRepository authSessionsRepository;
    private final CusCredentialsRepository credentialsRepository;


    // =========================================================
    // 1. VALIDATE ACCESS TOKEN SESSION
    // =========================================================

    @Transactional(
            noRollbackFor = CusSessionExpiredException.class
    )
    public AuthSessions validateAccessSession(
            Claims claims) {

        AuthSessions session =
                validateBaseSession(
                        claims,
                        "ACCESS"
                );

        // Valid protected API request ဖြစ်တဲ့အတွက်
        // last activity time update
        session.setLastSeenAt(
                LocalDateTime.now()
        );

        return authSessionsRepository.save(
                session
        );
    }


    // =========================================================
    // 2. VALIDATE REFRESH TOKEN SESSION
    // =========================================================

    @Transactional(
            noRollbackFor = CusSessionExpiredException.class
    )
    public AuthSessions validateRefreshSession(
            Claims claims,
            String rawRefreshToken) {

        // -----------------------------------------
        // Refresh Token required
        // -----------------------------------------

        if (rawRefreshToken == null
                || rawRefreshToken.isBlank()) {

            throw new CusAuthenticationException(
                    "Refresh token is required."
            );
        }


        // -----------------------------------------
        // Common session validation
        // -----------------------------------------

        AuthSessions session =
                validateBaseSession(
                        claims,
                        "REFRESH"
                );


        // -----------------------------------------
        // Raw Refresh Token ကို SHA-256 hash
        // -----------------------------------------

        String incomingHash =
                hashRefreshToken(
                        rawRefreshToken
                );


        String storedHash =
                session.getRefreshTokenHash();


        if (storedHash == null
                || storedHash.isBlank()) {

            throw new CusAuthenticationException(
                    "Invalid refresh token."
            );
        }


        // -----------------------------------------
        // SHA-256 hash compare
        // -----------------------------------------

        boolean refreshTokenMatches =
                MessageDigest.isEqual(
                        incomingHash.getBytes(
                                StandardCharsets.UTF_8
                        ),
                        storedHash.getBytes(
                                StandardCharsets.UTF_8
                        )
                );


        if (!refreshTokenMatches) {

            throw new CusAuthenticationException(
                    "Invalid refresh token."
            );
        }


        // -----------------------------------------
        // Refresh request က valid activity ဖြစ်လို့
        // lastSeenAt update
        // -----------------------------------------

        session.setLastSeenAt(
                LocalDateTime.now()
        );


        return authSessionsRepository.save(
                session
        );
    }


    // =========================================================
    // 3. COMMON SESSION VALIDATION
    // =========================================================

    private AuthSessions validateBaseSession(
            Claims claims,
            String expectedTokenType) {


        // =====================================================
        // TOKEN CLAIMS REQUIRED
        // =====================================================

        if (claims == null) {

            throw new CusAuthenticationException(
                    "Invalid authentication token."
            );
        }


        LocalDateTime now =
                LocalDateTime.now();


        // =====================================================
        // 1. JWT SUBJECT = CUSTOMER UUID
        // =====================================================

        String subject =
                claims.getSubject();


        if (subject == null
                || subject.isBlank()) {

            throw new CusAuthenticationException(
                    "Invalid authentication token."
            );
        }


        UUID customerId;

        try {

            customerId =
                    UUID.fromString(
                            subject
                    );

        } catch (IllegalArgumentException ex) {

            throw new CusAuthenticationException(
                    "Invalid authentication token."
            );
        }


        // =====================================================
        // 2. SESSION UUID FROM JWT
        // =====================================================

        String sessionUuid =
                claims.get(
                        "sid",
                        String.class
                );


        if (sessionUuid == null
                || sessionUuid.isBlank()) {

            throw new CusAuthenticationException(
                    "Invalid authentication token."
            );
        }


        // =====================================================
        // 3. SUBJECT TYPE MUST BE CUSTOMER
        // =====================================================

        String subjectType =
                claims.get(
                        "subjectType",
                        String.class
                );


        if (!"CUSTOMER".equals(
                subjectType)) {

            throw new CusAuthenticationException(
                    "Invalid authentication token."
            );
        }


        // =====================================================
        // 4. ACCESS OR REFRESH TOKEN TYPE
        // =====================================================

        String tokenType =
                claims.get(
                        "tokenType",
                        String.class
                );


        if (!expectedTokenType.equals(
                tokenType)) {

            throw new CusAuthenticationException(
                    "Invalid authentication token."
            );
        }


        // =====================================================
        // 5. TOKEN VERSION FROM JWT
        // =====================================================

        Object tokenVersionObject =
                claims.get(
                        "tokenVersion"
                );


        if (!(tokenVersionObject
                instanceof Number)) {

            throw new CusAuthenticationException(
                    "Invalid authentication token."
            );
        }


        long tokenVersion =
                ((Number) tokenVersionObject)
                        .longValue();


        // =====================================================
        // 6. AUTH SESSION FROM DATABASE
        // =====================================================

        AuthSessions session =
                authSessionsRepository
                        .findBySessionUuid(
                                sessionUuid
                        )
                        .orElseThrow(() ->
                                new CusAuthenticationException(
                                        "Authentication session is invalid."
                                )
                        );


        // =====================================================
        // 7. SESSION SUBJECT TYPE
        // =====================================================

        if (session.getSubjectType()
                != SessionSubjectType.CUSTOMER) {

            throw new CusAuthenticationException(
                    "Authentication session is invalid."
            );
        }


        // =====================================================
        // 8. SESSION CUSTOMER = JWT CUSTOMER ?
        // =====================================================

        if (session.getCustomer() == null
                || session
                        .getCustomer()
                        .getCustomerId() == null
                || !session
                        .getCustomer()
                        .getCustomerId()
                        .equals(customerId)) {

            throw new CusAuthenticationException(
                    "Authentication session is invalid."
            );
        }


        // =====================================================
        // 9. CUSTOMER STATUS ACTIVE ?
        // =====================================================

        if (session
                .getCustomer()
                .getStatus()
                != CustomerStatus.ACTIVE) {

            throw new CusAuthenticationException(
                    "Customer account is not active."
            );
        }


        // =====================================================
        // 10. SESSION ALREADY REVOKED ?
        // =====================================================

        if (session.getRevokedAt()
                != null) {

            throw new CusAuthenticationException(
                    "Authentication session has been revoked."
            );
        }


        // =====================================================
        // 11. REFRESH SESSION EXPIRY CHECK
        // =====================================================

        if (session.getRefreshExpiresAt() == null
                || !session
                        .getRefreshExpiresAt()
                        .isAfter(now)) {

            revokeSession(
                    session,
                    "SESSION_EXPIRED"
            );

            throw new CusSessionExpiredException(
                    "Authentication session has expired."
            );
        }


        // =====================================================
        // 12. LAST ACTIVITY MUST EXIST
        // =====================================================

        if (session.getLastSeenAt()
                == null) {

            revokeSession(
                    session,
                    "INVALID_SESSION_ACTIVITY"
            );

            throw new CusSessionExpiredException(
                    "Authentication session is invalid."
            );
        }


        // =====================================================
        // 13. SESSION IDLE TIMEOUT
        // =====================================================

        LocalDateTime idleExpiry =
                session
                        .getLastSeenAt()
                        .plusMinutes(
                                session.getIdleTimeoutMinutes()
                        );


        if (!idleExpiry.isAfter(
                now)) {

            revokeSession(
                    session,
                    "IDLE_TIMEOUT"
            );

            throw new CusSessionExpiredException(
                    "Session expired due to inactivity."
            );
        }


        // =====================================================
        // 14. SESSION TOKEN VERSION CHECK
        // =====================================================

        if (session.getTokenVersionAtIssue()
                != tokenVersion) {

            throw new CusAuthenticationException(
                    "Authentication token is no longer valid."
            );
        }


        // =====================================================
        // 15. CURRENT CREDENTIALS TOKEN VERSION
        // =====================================================

        CustomerCredentials credentials =
                credentialsRepository
                        .findById(
                                customerId
                        )
                        .orElseThrow(() ->
                                new IllegalStateException(
                                        "Customer credentials not found."
                                )
                        );


        if (credentials.getTokenVersion()
                != tokenVersion) {

            revokeSession(
                    session,
                    "TOKEN_VERSION_CHANGED"
            );

            throw new CusSessionExpiredException(
                    "Authentication token is no longer valid."
            );
        }


        return session;
    }


    // =========================================================
    // 4. REVOKE SESSION
    // =========================================================

    @Transactional
    public void revokeSession(
            AuthSessions session,
            String reason) {

        if (session == null) {
            return;
        }


        // Already revoked ဖြစ်နေရင်
        // ထပ် update မလုပ်တော့ဘူး
        if (session.getRevokedAt()
                != null) {

            return;
        }


        session.setRevokedAt(
                LocalDateTime.now()
        );


        session.setRevokeReason(
                reason
        );


        authSessionsRepository.save(
                session
        );
    }


    // =========================================================
    // 5. SHA-256 REFRESH TOKEN HASH
    // =========================================================

    public String hashRefreshToken(
            String refreshToken) {

        if (refreshToken == null
                || refreshToken.isBlank()) {

            throw new CusAuthenticationException(
                    "Refresh token is required."
            );
        }


        try {

            MessageDigest digest =
                    MessageDigest.getInstance(
                            "SHA-256"
                    );


            byte[] hashBytes =
                    digest.digest(
                            refreshToken.getBytes(
                                    StandardCharsets.UTF_8
                            )
                    );


            return HexFormat
                    .of()
                    .formatHex(
                            hashBytes
                    );


        } catch (NoSuchAlgorithmException ex) {

            // ဒီဟာက user authentication error မဟုတ်ဘူး
            // Server/JVM internal problem
            throw new IllegalStateException(
                    "Unable to hash refresh token.",
                    ex
            );
        }
    }
}