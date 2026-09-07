package com.corebanking.repository;

import com.corebanking.entity.StaffUserRoles;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StaffUserRolesRepository
        extends JpaRepository<StaffUserRoles, Long> {

    @Query("""
            SELECT s
            FROM StaffUserRoles s
            WHERE s.staff_id = :staffId
            """)
    Optional<StaffUserRoles> findByStaffId(
            @Param("staffId") Long staffId
    );
}