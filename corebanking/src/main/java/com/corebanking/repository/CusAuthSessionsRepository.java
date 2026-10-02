package com.corebanking.repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.corebanking.entity.AuthSessions;
import com.corebanking.entity.enums.UpdatedByType;


public interface CusAuthSessionsRepository
        extends JpaRepository<AuthSessions, UUID> {


    Optional<AuthSessions> findBySessionUuid(
            String sessionUuid
    );


    // =========================================================
    // 1. ATOMIC SINGLE SESSION REVOKE
    // =========================================================

    @Modifying(
            flushAutomatically = true,
            clearAutomatically = true
    )
    @Query("""
            UPDATE AuthSessions s
               SET s.revokedAt = :revokedAt,
                   s.revokeReason = :reason,
                   s.updatedByType = :updatedByType,
                   s.updatedById = :updatedById,
                   s.updatedAt = :updatedAt
             WHERE s.sessionUuid = :sessionUuid
               AND s.revokedAt IS NULL
            """)
    int revokeIfActive(

            @Param("sessionUuid")
            String sessionUuid,

            @Param("reason")
            String reason,

            @Param("revokedAt")
            LocalDateTime revokedAt,

            @Param("updatedByType")
            UpdatedByType updatedByType,

            @Param("updatedById")
            UUID updatedById,

            @Param("updatedAt")
            LocalDateTime updatedAt
    );


    // =========================================================
    // 2. ATOMIC REFRESH TOKEN ROTATION
    // =========================================================

    @Modifying(
            flushAutomatically = true,
            clearAutomatically = true
    )
    @Query("""
            UPDATE AuthSessions s
               SET s.refreshTokenHash = :newRefreshTokenHash,
                   s.refreshExpiresAt = :newRefreshExpiresAt,
                   s.lastSeenAt = :now,
                   s.updatedByType = :updatedByType,
                   s.updatedById = :updatedById,
                   s.updatedAt = :now
             WHERE s.sessionUuid = :sessionUuid
               AND s.refreshTokenHash = :expectedOldRefreshTokenHash
               AND s.revokedAt IS NULL
            """)
    int rotateRefreshTokenIfMatch(

            @Param("sessionUuid")
            String sessionUuid,

            @Param("expectedOldRefreshTokenHash")
            String expectedOldRefreshTokenHash,

            @Param("newRefreshTokenHash")
            String newRefreshTokenHash,

            @Param("newRefreshExpiresAt")
            LocalDateTime newRefreshExpiresAt,

            @Param("now")
            LocalDateTime now,

            @Param("updatedByType")
            UpdatedByType updatedByType,

            @Param("updatedById")
            UUID updatedById
    );


    // =========================================================
    // 3. ATOMIC REVOKE ALL ACTIVE CUSTOMER SESSIONS
    // =========================================================
    //
    // Password Reset / Change Password success ဖြစ်တဲ့အခါ
    // customer ရဲ့ active sessions အကုန် revoke လုပ်မယ်.
    //
    // WHERE revokedAt IS NULL ကြောင့်
    // already revoked session ကို ထပ်မပြင်ဘူး.
    //
    // Return:
    // 0  = active session မရှိ / already revoked
    // >0 = revoke လုပ်ခဲ့တဲ့ session အရေအတွက်
    // =========================================================

    @Modifying(
            flushAutomatically = true
    )
    @Query("""
            UPDATE AuthSessions s
               SET s.revokedAt = :revokedAt,
                   s.revokeReason = :reason,
                   s.updatedByType = :updatedByType,
                   s.updatedById = :updatedById,
                   s.updatedAt = :updatedAt
             WHERE s.customer.customerId = :customerId
               AND s.revokedAt IS NULL
            """)
    int revokeAllActiveCustomerSessions(

            @Param("customerId")
            UUID customerId,

            @Param("reason")
            String reason,

            @Param("revokedAt")
            LocalDateTime revokedAt,

            @Param("updatedByType")
            UpdatedByType updatedByType,

            @Param("updatedById")
            UUID updatedById,

            @Param("updatedAt")
            LocalDateTime updatedAt
    );
}