
package com.corebanking.repository;

import com.corebanking.entity.StaffPasswordSetupToken;

import jakarta.persistence.LockModeType;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

public interface StaffPasswordSetupTokenRepository
        extends JpaRepository<StaffPasswordSetupToken, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT t
        FROM StaffPasswordSetupToken t
        WHERE t.tokenHash = :tokenHash
    """)
    Optional<StaffPasswordSetupToken> findByTokenHashForUpdate(
            @Param("tokenHash") String tokenHash
    );

    @Modifying
    @Query("""
        UPDATE StaffPasswordSetupToken t
        SET t.revokedAt = :now
        WHERE t.staff.staffId = :staffId
          AND t.usedAt IS NULL
          AND t.revokedAt IS NULL
    """)
    int revokeUnusedTokensByStaffId(
            @Param("staffId") UUID staffId,
            @Param("now") LocalDateTime now
    );
}