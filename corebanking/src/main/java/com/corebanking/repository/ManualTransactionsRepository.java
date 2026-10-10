package com.corebanking.repository;

import com.corebanking.entity.ManualTransactions;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ManualTransactionsRepository extends JpaRepository<ManualTransactions, Long> {
}