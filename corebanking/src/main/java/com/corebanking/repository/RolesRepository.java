package com.corebanking.repository;

import com.corebanking.entity.Roles;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RolesRepository extends JpaRepository<Roles, Integer> {

    @Query("""
            SELECT r
            FROM Roles r
            WHERE r.role_code = :roleCode
            """)
    Optional<Roles> findByRoleCode(
            @Param("roleCode") String roleCode
    );

    @Query("""
            SELECT r.role_code
            FROM Roles r
            JOIN StaffUserRoles sur
            ON r.role_id = sur.role_id
            WHERE sur.staff_id = :staffId
            """)
    List<String> findRoleCodesByStaffId(
            @Param("staffId") Long staffId
    );
}