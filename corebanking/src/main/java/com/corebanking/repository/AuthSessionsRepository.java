
package com.corebanking.repository;

import com.corebanking.entity.AuthSession;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface AuthSessionsRepository
        extends JpaRepository<AuthSession, UUID> {

    Optional<AuthSession> findBySessionUuid(
            String sessionUuid
    );

    // Find refresh token session with pessimistic write lock
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AuthSession> findByRefreshTokenHash(
            String refreshTokenHash
    );

    // Revoke all active sessions belonging to a staff user
    @Modifying(
            flushAutomatically = true,
            clearAutomatically = true
    )
    @Query("""
        UPDATE AuthSession a
        SET a.revokedAt = CURRENT_TIMESTAMP,
            a.revokeReason = 'Security Breach: Token Reuse Detected'
        WHERE a.staff.staffId = :staffId
          AND a.revokedAt IS NULL
    """)
    int revokeAllActiveSessionsByStaffId(
            @Param("staffId") UUID staffId
    );
}
