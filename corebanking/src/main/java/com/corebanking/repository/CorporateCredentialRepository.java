package com.corebanking.repository;

import com.corebanking.entity.CorporateCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CorporateCredentialRepository extends JpaRepository<CorporateCredential, UUID> {
    Optional<CorporateCredential> findByCorporateUserId(UUID corporateUserId);
}
