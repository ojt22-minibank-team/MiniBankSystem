package com.corebanking.repository;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import com.corebanking.entity.AuthSession;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.entity.enums.SessionSubjectType;


public interface CusAuthSessionsRepository
        extends JpaRepository<AuthSession, UUID> {


    Optional<AuthSession> findBySessionUuid(
            String sessionUuid
    );

    /** Caller detaches its provisional session first; this is a current read. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM AuthSession s WHERE s.sessionUuid = :sessionUuid AND s.subjectType = :subjectType")
    Optional<AuthSession> findForActivity(
            @Param("sessionUuid") String sessionUuid,
            @Param("subjectType") SessionSubjectType subjectType);

    /** The session row is already locked and time is sampled after that lock. */
    @Modifying(flushAutomatically = true)
    @Query("""
            UPDATE AuthSession s
               SET s.lastSeenAt = greatest(s.lastSeenAt, :now),
                   s.updatedAt = greatest(s.updatedAt, :now),
                   s.updatedByType = :actorType,
                   s.updatedById = :ownerId
             WHERE s.sessionUuid = :sessionUuid
               AND s.subjectType = :subjectType
               AND ((s.subjectType = com.corebanking.entity.enums.SessionSubjectType.CUSTOMER
                     AND s.customer.customerId = :ownerId)
                 OR (s.subjectType = com.corebanking.entity.enums.SessionSubjectType.CORPORATE_USER
                     AND s.corporateUser.corporateUserId = :ownerId))
               AND s.tokenVersionAtIssue = :tokenVersion
               AND s.revokedAt IS NULL
               AND s.refreshExpiresAt > :now
               AND timestampadd(HOUR, 24, s.issuedAt) > :now
               AND timestampadd(MINUTE, s.idleTimeoutMinutes, s.lastSeenAt) > :now
            """)
    int touchIfValid(
            @Param("sessionUuid") String sessionUuid,
            @Param("subjectType") SessionSubjectType subjectType,
            @Param("ownerId") UUID ownerId,
            @Param("tokenVersion") long tokenVersion,
            @Param("actorType") UpdatedByType actorType,
            @Param("now") LocalDateTime now);


    // =========================================================
    // 1. ATOMIC SINGLE SESSION REVOKE
    // =========================================================

    @Modifying(
            flushAutomatically = true,
            clearAutomatically = true
    )
    @Query("""
            UPDATE AuthSession s
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
            UPDATE AuthSession s
               SET s.refreshTokenHash = :newRefreshTokenHash,
                   s.refreshExpiresAt = :newRefreshExpiresAt,
                   s.lastSeenAt = greatest(s.lastSeenAt, :now),
                   s.updatedByType = :updatedByType,
                   s.updatedById = :updatedById,
                   s.updatedAt = greatest(s.updatedAt, :now)
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
            UPDATE AuthSession s
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
