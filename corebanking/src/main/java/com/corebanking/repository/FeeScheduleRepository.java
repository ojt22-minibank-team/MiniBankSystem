package com.corebanking.repository;

import com.corebanking.entity.FeeSchedules;
import com.corebanking.entity.enums.TransactionType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FeeScheduleRepository extends JpaRepository<FeeSchedules, Integer> {

    Optional<FeeSchedules> findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(TransactionType transactionType);
}
