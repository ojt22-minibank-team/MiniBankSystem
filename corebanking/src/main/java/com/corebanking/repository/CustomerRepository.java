package com.corebanking.repository;

import com.corebanking.entity.Customers;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface CustomerRepository
        extends JpaRepository<Customers, UUID> {

    Optional<Customers> findByCustomerCode(String customerCode);
}

// Customer ID entered
//↓
//customer_code နဲ့ customers table မှာရှာ