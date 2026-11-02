package com.corebanking.repository;

import com.corebanking.entity.AccountHolds;
import com.corebanking.entity.enums.HoldStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Dedicated Repository for managing and releasing account holds during transaction overrides.
 */
@Repository
public interface AccountHoldsReviewRepository extends JpaRepository<AccountHolds, UUID> {

    /**
     * Finds active holds linked to a specific transaction.
     *
     * @param transactionId UUID of the transaction
     * @param status status of the hold
     * @return list of matching holds
     */
    List<AccountHolds> findByTransactionTransactionIdAndStatus(UUID transactionId, HoldStatus status);
}
