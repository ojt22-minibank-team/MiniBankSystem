package com.corebanking.repository;

import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.Customers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CompanyInfoRepository extends JpaRepository<CompanyInfo, UUID> {
    Optional<CompanyInfo> findByCustomer(Customers customer);
    Optional<CompanyInfo> findByCustomerId(UUID customerId);
}