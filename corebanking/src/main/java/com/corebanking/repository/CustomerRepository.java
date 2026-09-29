package com.corebanking.repository;

import com.corebanking.entity.Customers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customers, UUID> {
    Optional<Customers> findByCustomerCode(String customerCode);
    boolean existsByCustomerCode(String customerCode);
    }
