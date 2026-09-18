package com.corebanking.repository;

import com.corebanking.entity.Customers;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

// Customer entity ရဲ့ ID type က Long ဖြစ်တဲ့အတွက် Long အဖြစ် သတ်မှတ်ပါသည်
@Repository
public interface CustomerRepository extends JpaRepository<Customers, Long> {
    Optional<Customers> findByCustomerCode(String customerCode);
    
}