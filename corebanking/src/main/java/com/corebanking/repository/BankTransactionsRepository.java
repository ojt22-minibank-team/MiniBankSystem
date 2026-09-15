package com.corebanking.repository;

import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.enums.TransactionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface BankTransactionsRepository extends JpaRepository<BankTransactions, UUID> {
    
    // Member 5 Duplicate Prevention Check
    boolean existsByExternalReferenceAndStatus(String externalReference, TransactionStatus status);
}