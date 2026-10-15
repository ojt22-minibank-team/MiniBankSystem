package com.corebanking.repository;

import com.corebanking.entity.CorporateUser;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CorporateUserRepository extends JpaRepository<CorporateUser, UUID> {
    Optional<CorporateUser> findByCorporateUserCode(String corporateUserCode);
}