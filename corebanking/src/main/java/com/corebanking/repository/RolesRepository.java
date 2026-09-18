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
            WHERE r.roleCode = :roleCode
            """)
    Optional<Roles> findByRoleCode(@Param("roleCode") String roleCode);

    @Query(value = """
            SELECT r.role_code 
            FROM roles r 
            JOIN staff_user_roles sur ON r.role_id = sur.role_id 
            WHERE sur.staff_id = :staffId
            """, nativeQuery = true)
    List<String> findRoleCodesByStaffId(@Param("staffId") byte[] staffId);
}