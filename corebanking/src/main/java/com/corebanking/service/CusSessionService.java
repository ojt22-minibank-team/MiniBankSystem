package com.corebanking.service;

import com.corebanking.entity.AuthSessions;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCredentialsRepository;

import io.jsonwebtoken.Claims;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;


@Service
@RequiredArgsConstructor
public class CusSessionService {

    private final CusAuthSessionsRepository authSessionsRepository;

    private final CusCredentialsRepository credentialsRepository;


    // =========================================================
    // 1. VALIDATE ACCESS TOKEN SESSION
    // =========================================================

    @Transactional
    public AuthSessions validateAccessSession(
            Claims claims) {

        AuthSessions session =
                validateBaseSession(
                        claims,
                        "ACCESS"
                );


        // Valid request ဖြစ်တဲ့အတွက်
        // user activity time update
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

    @Transactional
    public AuthSessions validateRefreshSession(
            Claims claims,
            String rawRefreshToken) {

        // -----------------------------------------
        // Refresh Token required
        // -----------------------------------------

        if (rawRefreshToken == null
                || rawRefreshToken.isBlank()) {

            throw new RuntimeException(
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

            throw new RuntimeException(
                    "Stored refresh token is invalid."
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

            throw new RuntimeException(
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

        if (claims == null) {

            throw new RuntimeException(
                    "Token claims are required."
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

            throw new RuntimeException(
                    "Invalid token subject."
            );
        }


        UUID customerId;

        try {

            customerId =
                    UUID.fromString(
                            subject
                    );

        } catch (IllegalArgumentException ex) {

            throw new RuntimeException(
                    "Invalid customer identity."
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

            throw new RuntimeException(
                    "Invalid token session."
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

            throw new RuntimeException(
                    "Invalid token subject type."
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

            throw new RuntimeException(
                    "Invalid token type."
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

            throw new RuntimeException(
                    "Invalid token version."
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
                                new RuntimeException(
                                        "Authentication session not found."
                                )
                        );


        // =====================================================
        // 7. SESSION SUBJECT TYPE
        // =====================================================

        if (session.getSubjectType()
                != SessionSubjectType.CUSTOMER) {

            throw new RuntimeException(
                    "Invalid customer session."
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

            throw new RuntimeException(
                    "Session customer does not match token."
            );
        }


        // =====================================================
        // 9. CUSTOMER STATUS ACTIVE ?
        // =====================================================

        if (session
                .getCustomer()
                .getStatus()
                != CustomerStatus.ACTIVE) {

            throw new RuntimeException(
                    "Customer account is not active."
            );
        }


        // =====================================================
        // 10. SESSION ALREADY REVOKED ?
        // =====================================================

        if (session.getRevokedAt()
                != null) {

            throw new RuntimeException(
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


            throw new RuntimeException(
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


            throw new RuntimeException(
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


            throw new RuntimeException(
                    "Session expired due to inactivity."
            );
        }


        // =====================================================
        // 14. SESSION TOKEN VERSION CHECK
        // =====================================================

        if (session.getTokenVersionAtIssue()
                != tokenVersion) {

            throw new RuntimeException(
                    "Token version is invalid."
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
                                new RuntimeException(
                                        "Customer credentials not found."
                                )
                        );


        if (credentials.getTokenVersion()
                != tokenVersion) {

            revokeSession(
                    session,
                    "TOKEN_VERSION_CHANGED"
            );


            throw new RuntimeException(
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

            throw new RuntimeException(
                    "Refresh token cannot be empty."
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

            throw new RuntimeException(
                    "Unable to hash refresh token.",
                    ex
            );
        }
    }
}