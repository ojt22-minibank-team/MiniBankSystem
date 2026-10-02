package com.corebanking.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.AuthSessions;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCredentialsRepository;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;


@Service
@RequiredArgsConstructor
public class CusSessionService {


    // =========================================================
    // REPOSITORIES
    // =========================================================

    private final CusAuthSessionsRepository authSessionsRepository;

    private final CusCredentialsRepository credentialsRepository;

    private final CusAuditLogsRepository auditLogsRepository;


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


        // Valid protected API request
        // => customer activity ဖြစ်လို့ lastSeenAt update
        session.setLastSeenAt(
                LocalDateTime.now()
        );


        markSessionUpdatedByCustomer(
                session
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


        // =====================================================
        // REFRESH TOKEN REQUIRED
        // =====================================================

        if (rawRefreshToken == null
                || rawRefreshToken.isBlank()) {

            throw new CusAuthenticationException(
                    "Refresh token is required."
            );
        }


        // =====================================================
        // COMMON SESSION VALIDATION
        // =====================================================

        AuthSessions session =
                validateBaseSession(
                        claims,
                        "REFRESH"
                );


        // =====================================================
        // HASH INCOMING REFRESH TOKEN
        // =====================================================

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


        // =====================================================
        // CONSTANT-TIME HASH COMPARISON
        // =====================================================

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


        // ဒီ method ရဲ့တာဝန်က validate ပဲ
        // DB update / rotation ကို CusAuthService မှာ
        // atomic update နဲ့လုပ်မယ်.

        return session;
    }


    // =========================================================
    // 3. COMMON SESSION VALIDATION
    // =========================================================

    private AuthSessions validateBaseSession(
            Claims claims,
            String expectedTokenType) {


        // =====================================================
        // CLAIMS REQUIRED
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
        // 4. TOKEN TYPE
        // =====================================================
        //
        // ACCESS endpoint ဆို ACCESS ဖြစ်ရမယ်.
        // REFRESH endpoint ဆို REFRESH ဖြစ်ရမယ်.
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
        // 6. FIND AUTH SESSION
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
        // 7. SESSION MUST BELONG TO CUSTOMER
        // =====================================================

        if (session.getSubjectType()
                != SessionSubjectType.CUSTOMER) {

            throw new CusAuthenticationException(
                    "Authentication session is invalid."
            );
        }


        // =====================================================
        // 8. SESSION CUSTOMER MUST MATCH JWT CUSTOMER
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
        // 9. CUSTOMER STATUS MUST BE ACTIVE
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
        // 10. SESSION ALREADY REVOKED?
        // =====================================================

        if (session.getRevokedAt()
                != null) {

            throw new CusAuthenticationException(
                    "Authentication session has been revoked."
            );
        }


        // =====================================================
        // 11. REFRESH SESSION MAX EXPIRY
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
        // 13. IDLE TIMEOUT CHECK
        // =====================================================
        //
        // Example:
        //
        // lastSeenAt = 10:00
        // idleTimeoutMinutes = 5
        //
        // idleExpiry = 10:05
        //
        // 10:05 ကျော်ပြီး request ထပ်လာရင်
        // session revoke လုပ်မယ်.
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
        // 14. TOKEN VERSION STORED IN SESSION
        // =====================================================

        if (session.getTokenVersionAtIssue()
                != tokenVersion) {

            throw new CusAuthenticationException(
                    "Authentication token is no longer valid."
            );
        }


        // =====================================================
        // 15. CURRENT CUSTOMER TOKEN VERSION
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


        // =====================================================
        // SESSION VALID
        // =====================================================

        return session;
    }


    // =========================================================
    // 4. SYSTEM / AUTOMATIC SESSION REVOKE
    // =========================================================
    //
    // Example:
    //
    // IDLE_TIMEOUT
    // SESSION_EXPIRED
    // TOKEN_VERSION_CHANGED
    // INVALID_SESSION_ACTIVITY
    //
    // IMPORTANT:
    //
    // Java object ရဲ့ revokedAt ကိုပဲ မစစ်တော့ပါ.
    //
    // DB level atomic UPDATE သုံးပါတယ်.
    //
    // WHERE revokedAt IS NULL
    //
    // ဆိုတဲ့ condition ကြောင့် concurrent requests
    // အများကြီးတပြိုင်နက်လာလည်း
    //
    // request တစ်ခုတည်းက rows = 1 ရမယ်.
    //
    // ကျန် requests → rows = 0
    //
    // ဒီနည်းနဲ့ duplicate SESSION_REVOKED audit
    // မဖြစ်တော့ပါ.
    // =========================================================

    @Transactional
    public void revokeSession(
            AuthSessions session,
            String reason) {


        if (session == null
                || session.getSessionUuid() == null) {

            return;
        }


        LocalDateTime now =
                LocalDateTime.now();


        // =====================================================
        // ATOMIC DATABASE UPDATE
        // =====================================================

        int updatedRows =
                authSessionsRepository
                        .revokeIfActive(

                                session.getSessionUuid(),

                                reason,

                                now,

                                UpdatedByType.SYSTEM,

                                null,

                                now
                        );


        // =====================================================
        // ONLY ONE REQUEST MAY CREATE AUDIT LOG
        // =====================================================
        //
        // updatedRows == 1
        // → ဒီ request က session ကို revoke လုပ်ခဲ့တာ
        //
        // updatedRows == 0
        // → အခြား request တစ်ခုက revoke လုပ်ပြီးသား
        //
        // =====================================================

        if (updatedRows == 1) {

            saveSystemSessionRevokeAudit(
                    session,
                    reason
            );
        }
    }


    // =========================================================
    // 4A. CUSTOMER / EXPLICIT ACTOR SESSION REVOKE
    // =========================================================
    //
    // Customer Logout အတွက်သုံးမယ်.
    //
    // Example:
    //
    // updatedByType = CUSTOMER
    // updatedById   = customerId
    //
    // boolean return:
    //
    // true  → session ကို ဒီ request က revoke လုပ်ခဲ့တယ်
    // false → session revoke ဖြစ်ပြီးသား
    //
    // CusAuthService မှာ true ဖြစ်မှ
    // CUSTOMER_LOGOUT audit record create လုပ်နိုင်မယ်.
    // =========================================================

    @Transactional
    public boolean revokeSession(
            AuthSessions session,
            String reason,
            UpdatedByType updatedByType,
            UUID updatedById) {


        if (session == null
                || session.getSessionUuid() == null) {

            return false;
        }


        LocalDateTime now =
                LocalDateTime.now();


        int updatedRows =
                authSessionsRepository
                        .revokeIfActive(

                                session.getSessionUuid(),

                                reason,

                                now,

                                updatedByType,

                                updatedById,

                                now
                        );


        return updatedRows == 1;
    }


    // =========================================================
    // 5. MARK SESSION UPDATED BY CUSTOMER
    // =========================================================

    private void markSessionUpdatedByCustomer(
            AuthSessions session) {


        if (session == null
                || session.getCustomer() == null
                || session
                        .getCustomer()
                        .getCustomerId() == null) {

            return;
        }


        session.setUpdatedByType(
                UpdatedByType.CUSTOMER
        );


        session.setUpdatedById(
                session
                        .getCustomer()
                        .getCustomerId()
        );
    }


    // =========================================================
    // 6. SAVE SYSTEM SESSION REVOKE AUDIT
    // =========================================================

    private void saveSystemSessionRevokeAudit(
            AuthSessions session,
            String reason) {


        if (session == null
                || session.getSessionUuid() == null) {

            return;
        }


        AuditLogs auditLog =
                AuditLogs.builder()

                        // -------------------------------------
                        // Automatic system action
                        // -------------------------------------

                        .actorType(
                                ActorType.SYSTEM
                        )

                        .actorCustomer(
                                null
                        )

                        .actorStaff(
                                null
                        )

                        // -------------------------------------
                        // Audit action
                        // -------------------------------------

                        .actionType(
                                "SESSION_REVOKED"
                        )

                        // -------------------------------------
                        // Affected entity
                        // -------------------------------------

                        .entityType(
                                "AUTH_SESSION"
                        )

                        .entityId(
                                session.getSessionUuid()
                        )

                        // -------------------------------------
                        // Before
                        // -------------------------------------

                        .oldValues(
                                "{\"status\":\"ACTIVE\"}"
                        )

                        // -------------------------------------
                        // After
                        // -------------------------------------

                        .newValues(
                                "{\"status\":\"REVOKED\","
                                        + "\"reason\":\""
                                        + reason
                                        + "\"}"
                        )

                        .build();


        auditLogsRepository.save(
                auditLog
        );
    }


    // =========================================================
    // 7. SHA-256 REFRESH TOKEN HASH
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


            // SHA-256 JVM မှာမရှိတာက
            // user authentication error မဟုတ်ဘဲ
            // server configuration/internal error ဖြစ်ပါတယ်.

            throw new IllegalStateException(
                    "Unable to hash refresh token.",
                    ex
            );
        }
    }
    @Transactional(
            noRollbackFor = CusSessionExpiredException.class
    )
    public AuthSessions validateAccessSessionForLogout(
            Claims claims) {

        return validateBaseSession(
                claims,
                "ACCESS"
        );
    }
}