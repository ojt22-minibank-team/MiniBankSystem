package com.corebanking.repository;

import com.corebanking.entity.StaffUsers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;
import java.util.UUID;

public interface StaffUsersRepository extends JpaRepository<StaffUsers, UUID> {

    // ပုံမှန် Find By Username
    Optional<StaffUsers> findByUsername(String username);

    boolean existsByEmailIgnoreCase(String email);
    // Brute-force Attack တွင် Race Condition ကို ကာကွယ်ရန် Pessimistic Write Lock ဖြင့် ရှာဖွေခြင်း
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM StaffUsers s WHERE s.username = :username")
    Optional<StaffUsers> findByUsernameWithLock(@Param("username") String username);

    @Query("""
            SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
            FROM StaffUsers s
            WHERE s.username = :username
            """)
    boolean existsByUsernameCustom(
            @Param("username") String username
    );

    @Query("""
            SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
            FROM StaffUsers s
            WHERE s.staffNo = :staffNo
            """)
    boolean existsByStaffNo(
            @Param("staffNo") String staffNo
    );
}