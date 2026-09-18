package com.corebanking.repository;

import com.corebanking.entity.StaffUserRoles;
import com.corebanking.entity.StaffUserRoles.StaffUserRoleId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface StaffUserRolesRepository extends JpaRepository<StaffUserRoles, StaffUserRoleId> {

    @Query("""
            SELECT sur
            FROM StaffUserRoles sur
            WHERE sur.staffId = :staffId
            """)
    Optional<StaffUserRoles> findByStaffId(@Param("staffId") UUID staffId);
}
