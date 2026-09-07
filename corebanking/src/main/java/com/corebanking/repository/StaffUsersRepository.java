package com.corebanking.repository;

import com.corebanking.entity.StaffUsers;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface StaffUsersRepository extends JpaRepository<StaffUsers, Long> {

    Optional<StaffUsers> findByUsername(String username);

}