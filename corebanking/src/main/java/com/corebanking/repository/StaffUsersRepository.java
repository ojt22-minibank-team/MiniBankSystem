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

    @Query("""
            SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
            FROM StaffUsers s
            WHERE LOWER(s.email) = LOWER(:email)
              AND s.staffId <> :staffId
            """)
    boolean existsByEmailIgnoreCaseAndStaffIdNot(
            @Param("email") String email,
            @Param("staffId") UUID staffId
    );

    boolean existsByPhone(String phone);

    @Query("""
            SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
            FROM StaffUsers s
            WHERE s.phone = :rawPhone OR s.phone = :normalizedPhone
            """)
    boolean existsByPhoneMatching(
            @Param("rawPhone") String rawPhone,
            @Param("normalizedPhone") String normalizedPhone
    );

    @Query("""
            SELECT CASE WHEN COUNT(s) > 0 THEN true ELSE false END
            FROM StaffUsers s
            WHERE (s.phone = :rawPhone OR s.phone = :normalizedPhone)
              AND s.staffId <> :staffId
            """)
    boolean existsByPhoneMatchingAndStaffIdNot(
            @Param("rawPhone") String rawPhone,
            @Param("normalizedPhone") String normalizedPhone,
            @Param("staffId") UUID staffId
    );
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

    @Query("SELECT s.staffNo FROM StaffUsers s WHERE s.staffNo LIKE CONCAT(:prefix, '-%')")
    java.util.List<String> findStaffNosByPrefix(@Param("prefix") String prefix);

    Optional<StaffUsers> findFirstByStatus(com.corebanking.entity.enums.StaffUserStatus status);

    long countByStatus(com.corebanking.entity.enums.StaffUserStatus status);

    java.util.List<StaffUsers> findTop5ByOrderByCreatedAtDesc();

    @Query("""
            SELECT s, r
            FROM StaffUsers s
            LEFT JOIN StaffUserRoles sur ON sur.staffId = s.staffId
            LEFT JOIN Roles r ON sur.roleId = r.roleId
            ORDER BY s.createdAt DESC
            """)
    java.util.List<Object[]> findAllStaffWithRoles();

    @Query("""
            SELECT s, r
            FROM StaffUsers s
            LEFT JOIN StaffUserRoles sur ON sur.staffId = s.staffId
            LEFT JOIN Roles r ON sur.roleId = r.roleId
            WHERE s.staffId = :staffId
            """)
    java.util.List<Object[]> findStaffWithRoleById(@Param("staffId") UUID staffId);
}