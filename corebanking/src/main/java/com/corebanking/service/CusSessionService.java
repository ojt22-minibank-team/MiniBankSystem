package com.corebanking.service;

import com.corebanking.entity.AuthSessions;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCredentialsRepository;

import io.jsonwebtoken.Claims;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CusSessionService {

    private final CusAuthSessionsRepository authSessionsRepository;

    private final CusCredentialsRepository credentialsRepository;

    private final PasswordEncoder passwordEncoder;


    // =========================================================
    // VALIDATE ACCESS TOKEN SESSION
    // =========================================================

    public AuthSessions validateAccessSession(
            Claims claims) {

        AuthSessions session =
                validateBaseSession(
                        claims,
                        "ACCESS"
                );

        // Valid request ဖြစ်လို့
        // last activity time update
        session.setLastSeenAt(
                LocalDateTime.now()
        );

        return authSessionsRepository.save(
                session
        );
    }


    // =========================================================
    // VALIDATE REFRESH TOKEN SESSION
    // =========================================================

    public AuthSessions validateRefreshSession(
            Claims claims,
            String rawRefreshToken) {

        AuthSessions session =
                validateBaseSession(
                        claims,
                        "REFRESH"
                );


        // Refresh Token DB hash နဲ့တိုက်စစ်
        if (!passwordEncoder.matches(
                rawRefreshToken,
                session.getRefreshTokenHash())) {

            throw new RuntimeException(
                    "Invalid refresh token."
            );
        }


        session.setLastSeenAt(
                LocalDateTime.now()
        );

        return authSessionsRepository.save(
                session
        );
    }


    // =========================================================
    // COMMON SESSION VALIDATION
    // =========================================================

    private AuthSessions validateBaseSession(
            Claims claims,
            String expectedTokenType) {

        LocalDateTime now =
                LocalDateTime.now();


        // -----------------------------------------
        // 1. JWT Subject = Customer UUID
        // -----------------------------------------

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


        // -----------------------------------------
        // 2. Session ID from JWT
        // -----------------------------------------

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


        // -----------------------------------------
        // 3. CUSTOMER token only
        // -----------------------------------------

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


        // -----------------------------------------
        // 4. ACCESS / REFRESH check
        // -----------------------------------------

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


        // -----------------------------------------
        // 5. Token version claim
        // -----------------------------------------

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


        // -----------------------------------------
        // 6. Auth Session DB ရှာ
        // -----------------------------------------

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


        // -----------------------------------------
        // 7. Customer Session လား?
        // -----------------------------------------

        if (session.getSubjectType()
                != SessionSubjectType.CUSTOMER) {

            throw new RuntimeException(
                    "Invalid customer session."
            );
        }


        if (session.getCustomer() == null
                || !session
                        .getCustomer()
                        .getCustomerId()
                        .equals(customerId)) {

            throw new RuntimeException(
                    "Session customer does not match token."
            );
        }


        // -----------------------------------------
        // 8. Customer ACTIVE လား?
        // -----------------------------------------

        if (session
                .getCustomer()
                .getStatus()
                != CustomerStatus.ACTIVE) {

            throw new RuntimeException(
                    "Customer account is not active."
            );
        }


        // -----------------------------------------
        // 9. Session revoked?
        // -----------------------------------------

        if (session.getRevokedAt()
                != null) {

            throw new RuntimeException(
                    "Authentication session has been revoked."
            );
        }


        // -----------------------------------------
        // 10. Refresh session expiry
        // -----------------------------------------

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


        // -----------------------------------------
        // 11. 5-minute inactivity check
        // -----------------------------------------

        if (session.getLastSeenAt() == null) {

            revokeSession(
                    session,
                    "INVALID_SESSION_ACTIVITY"
            );

            throw new RuntimeException(
                    "Authentication session is invalid."
            );
        }


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


        // -----------------------------------------
        // 12. Session token version check
        // -----------------------------------------

        if (session.getTokenVersionAtIssue()
                != tokenVersion) {

            throw new RuntimeException(
                    "Token version is invalid."
            );
        }


        // -----------------------------------------
        // 13. Current credentials tokenVersion
        // -----------------------------------------

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
    // REVOKE SESSION
    // =========================================================

    public void revokeSession(
            AuthSessions session,
            String reason) {

        if (session.getRevokedAt()
                == null) {

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
    }
}
