package com.corebanking.repository;

import com.corebanking.entity.ManualTransactions;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface ManualTransactionsRepository extends JpaRepository<ManualTransactions, Long> {
    boolean existsByReferenceId(String referenceId);
    Optional<ManualTransactions> findByReferenceId(String referenceId);
}
