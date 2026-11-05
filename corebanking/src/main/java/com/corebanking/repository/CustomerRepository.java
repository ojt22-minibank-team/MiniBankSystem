package com.corebanking.repository;

import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.CustomerType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CustomerRepository extends JpaRepository<Customers, UUID> {
    Optional<Customers> findByCustomerCode(String customerCode);
    boolean existsByCustomerCode(String customerCode);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);
    boolean existsByEmailAndCustomerType(String email, CustomerType customerType);
    boolean existsByEmailAndCustomerTypeIn(String email, Collection<CustomerType> customerTypes);
    boolean existsByPhoneAndCustomerType(String phone, CustomerType customerType);
    boolean existsByPhoneAndCustomerTypeIn(String phone, Collection<CustomerType> customerTypes);
    List<Customers> findByEmail(String email);

    // Optimized single-query fetch to eliminate secondary SELECT queries (fetches both personalInfo and companyInfo)
    @Query("SELECT DISTINCT c FROM Customers c LEFT JOIN FETCH c.personalInfo LEFT JOIN FETCH c.companyInfo ORDER BY c.createdAt DESC")
    List<Customers> findAllWithPersonalInfo();
}

