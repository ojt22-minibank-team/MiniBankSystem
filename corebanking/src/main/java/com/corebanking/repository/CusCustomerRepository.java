package com.corebanking.repository;

import com.corebanking.entity.Customers;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CusCustomerRepository
        extends JpaRepository<Customers, UUID> {

    Optional<Customers> findByCustomerCode(String customerCode);
}