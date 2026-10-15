package com.corebanking.repository;

import com.corebanking.entity.AuthSession;

import jakarta.persistence.LockModeType; // အသစ်ထည့်ရန်
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock; // အသစ်ထည့်ရန်
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

    // =========================================================
    // AuthService တွင် Error မတက်စေရန် ဤ Method ကို မဖြစ်မနေ ထည့်ပါ
    // =========================================================
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<AuthSession> findByRefreshTokenHash(
            String refreshTokenHash
    );
    
    
    @Modifying
    @Query("UPDATE AuthSession a SET a.revokedAt = CURRENT_TIMESTAMP, a.revokeReason = 'Security Breach: Token Reuse Detected' WHERE a.staff.staffId = :staffId AND a.revokedAt IS NULL")
    void revokeAllActiveSessionsByStaffId(@Param("staffId") UUID staffId);
}
