package com.corebanking.repository;

import com.corebanking.entity.CorporateAccountAccess;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CorporateAccountAccessRepository extends JpaRepository<CorporateAccountAccess, UUID> {
    List<CorporateAccountAccess> findByAccountAccountId(UUID accountId);
    List<CorporateAccountAccess> findByCorporateUserCorporateUserId(UUID corporateUserId);
    Optional<CorporateAccountAccess> findByCorporateUserCorporateUserIdAndAccountAccountId(UUID corporateUserId, UUID accountId);
}
