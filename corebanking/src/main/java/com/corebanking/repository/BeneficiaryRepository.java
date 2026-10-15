package com.corebanking.repository;

import com.corebanking.entity.Accounts;
import com.corebanking.entity.Beneficiaries;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BeneficiaryRepository extends JpaRepository<Beneficiaries, UUID> {

    @Query("SELECT b FROM Beneficiaries b " +
           "JOIN FETCH b.beneficiaryAccount ba " +
           "LEFT JOIN FETCH ba.customer c " +
           "WHERE b.ownerAccount.customer.customerId = :customerId " +
           "AND b.isActive = true " +
           "ORDER BY b.createdAt DESC")
    List<Beneficiaries> findActiveByCustomerId(@Param("customerId") UUID customerId);

    Optional<Beneficiaries> findByOwnerAccountAndBeneficiaryAccount(
            Accounts ownerAccount, Accounts beneficiaryAccount
    );

    @Query("SELECT b FROM Beneficiaries b " +
           "WHERE b.beneficiaryId = :beneficiaryId " +
           "AND b.ownerAccount.customer.customerId = :customerId")
    Optional<Beneficiaries> findByIdAndCustomerId(
            @Param("beneficiaryId") UUID beneficiaryId,
            @Param("customerId") UUID customerId
    );
}