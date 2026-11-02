package com.corebanking.repository;

import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.enums.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.UUID;

/**
 * Dedicated Repository for querying and managing transactions under managerial review and oversight.
 * Prevents git conflicts with existing transaction repositories.
 */
@Repository
public interface TransactionReviewRepository extends JpaRepository<BankTransactions, UUID> {

    /**
     * Finds transactions matching a specific status.
     *
     * @param status transaction status
     * @param pageable pagination parameters
     * @return paginated transactions
     */
    Page<BankTransactions> findByStatus(TransactionStatus status, Pageable pageable);

    /**
     * Finds transactions matching any of the specified statuses.
     *
     * @param statuses collection of statuses
     * @param pageable pagination parameters
     * @return paginated transactions
     */
    Page<BankTransactions> findByStatusIn(Collection<TransactionStatus> statuses, Pageable pageable);
}
