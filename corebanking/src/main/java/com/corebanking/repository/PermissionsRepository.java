package com.corebanking.repository;

import com.corebanking.entity.Permissions;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface PermissionsRepository extends JpaRepository<Permissions, Integer> {

    @Query(value = """
            SELECT p.permission_code
            FROM permissions p
            JOIN role_permissions rp ON p.permission_id = rp.permission_id
            JOIN staff_user_roles sur ON rp.role_id = sur.role_id
            WHERE sur.staff_id = :staffId
            """, nativeQuery = true)
    List<String> findPermissionCodesByStaffId(@Param("staffId") byte[] staffId);
}
