
package com.corebanking.repository;

import com.corebanking.entity.BankTransactions;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BankTransactionRepository extends JpaRepository<BankTransactions, UUID> {

    Optional<BankTransactions> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);
    
    // Member 5 Duplicate Prevention Check (Moved from duplicate repository)
    boolean existsByExternalReferenceAndStatus(String externalReference, com.corebanking.entity.enums.TransactionStatus status);
    
    // Safer check that ignores status
    boolean existsByExternalReference(String externalReference);

    Optional<BankTransactions> findByTransactionRef(String transactionRef);

    boolean existsByTransactionRef(String transactionRef);

    /**
     * Calculates total transferred amount by account for the current day.
     */
    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM BankTransactions t " +
           "WHERE t.sourceAccount.accountId = :accountId " +
           "AND t.status = 'COMPLETED' " +
           "AND t.completedAt >= :startOfDay AND t.completedAt <= :endOfDay")
    BigDecimal findTodayTotalTransferredAmount(
            @Param("accountId") UUID accountId,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay);

    /**
     * Finds OTC transactions processed by a specific staff member within a time range.
     */
    @Query("SELECT t FROM BankTransactions t " +
           "WHERE t.initiatedByStaff.staffId = :staffId " +
           "AND t.transactionType IN (com.corebanking.entity.enums.TransactionType.OTC_DEPOSIT, com.corebanking.entity.enums.TransactionType.OTC_WITHDRAWAL) " +
           "AND t.status = com.corebanking.entity.enums.TransactionStatus.COMPLETED " +
           "AND t.initiatedAt >= :startOfDay AND t.initiatedAt <= :endOfDay")
    java.util.List<BankTransactions> findTodayOtcTransactionsByStaff(
            @Param("staffId") UUID staffId,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay);
}
