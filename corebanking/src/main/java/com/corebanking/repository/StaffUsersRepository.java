package com.corebanking.repository;

import com.corebanking.entity.StaffUsers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface StaffUsersRepository extends JpaRepository<StaffUsers, Long> {

    Optional<StaffUsers> findByUsername(String username);

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
            WHERE s.staff_no = :staffNo
            """)
    boolean existsByStaffNo(
            @Param("staffNo") String staffNo
    );
}