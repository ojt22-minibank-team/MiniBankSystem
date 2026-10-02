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
    // ATOMIC SESSION REVOKE
    // =========================================================
    //
    // revoked_at IS NULL ဖြစ်တဲ့ session ကိုပဲ update လုပ်မယ်.
    //
    // Concurrent requests 4 ခုလာရင်:
    //
    // first request  -> updated rows = 1
    // other requests -> updated rows = 0
    //
    // ဒါကြောင့် revoke + audit တစ်ခါပဲ ဖြစ်မယ်.
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
}