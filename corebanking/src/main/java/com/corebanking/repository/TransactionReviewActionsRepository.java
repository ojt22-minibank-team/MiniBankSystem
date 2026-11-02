package com.corebanking.repository;

import com.corebanking.entity.TransactionReviewActions;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA Repository for {@link TransactionReviewActions}.
 */
@Repository
public interface TransactionReviewActionsRepository extends JpaRepository<TransactionReviewActions, UUID> {

    /**
     * Retrieve all review actions recorded for a specific transaction in reverse chronological order.
     *
     * @param transactionId UUID of the transaction
     * @return list of review actions
     */
    List<TransactionReviewActions> findByTransactionTransactionIdOrderByPerformedAtDesc(UUID transactionId);
}
