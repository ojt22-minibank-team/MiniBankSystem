package com.corebanking.repository;

import com.corebanking.entity.TransactionApprovals;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface TransactionApprovalsRepository extends JpaRepository<TransactionApprovals, UUID> {
}