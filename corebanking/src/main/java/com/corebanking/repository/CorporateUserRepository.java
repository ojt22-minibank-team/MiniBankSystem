package com.corebanking.repository;

import com.corebanking.entity.CorporateUser;
import com.corebanking.entity.enums.CorporateRole;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CorporateUserRepository extends JpaRepository<CorporateUser, UUID> {
    Optional<CorporateUser> findByCorporateUserCode(String corporateUserCode);
    List<CorporateUser> findByCompanyInfoCustomerId(UUID customerId);
    Optional<CorporateUser> findByCompanyInfoCustomerIdAndCorporateRole(UUID customerId, CorporateRole corporateRole);
    boolean existsByCorporateUserCode(String corporateUserCode);
}
