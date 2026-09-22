package com.corebanking.repository;

import com.corebanking.entity.Accounts;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountRepository extends JpaRepository<Accounts, UUID> {

    // 1. Regular lookup by account number
    Optional<Accounts> findByAccountNumber(String accountNumber);

    // 2. Check if an account number already exists (used during account creation)
    boolean existsByAccountNumber(String accountNumber);

    // 3. Concurrency-safe lookup by account number (locks row for balance update)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Accounts a WHERE a.accountNumber = :accountNumber")
    Optional<Accounts> findByAccountNumberForUpdate(@Param("accountNumber") String accountNumber);

    // 4. Concurrency-safe lookup by account ID (locks row for balance update)
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT a FROM Accounts a WHERE a.accountId = :accountId")
    Optional<Accounts> findByAccountIdForUpdate(@Param("accountId") UUID accountId);

    // 5. Retrieve all accounts belonging to a specific customer
    List<Accounts> findByCustomerCustomerId(UUID customerId);
    
 // Customer Code ဖြင့် အကောင့်အားလုံးကို ရှာဖွေသည့် Method (အသစ်ထည့်သွင်းပါ)
    List<Accounts> findByCustomerCustomerCode(String customerCode);
}