package com.corebanking.repository;

import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.enums.TransactionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface BankTransactionRepository extends JpaRepository<BankTransactions, UUID>, JpaSpecificationExecutor<BankTransactions> {

    @Override
    @EntityGraph(attributePaths = {
        "sourceAccount",
        "sourceAccount.customer",
        "destinationAccount",
        "destinationAccount.customer",
        "initiatedByStaff",
        "initiatedByCustomer"
    })
    Page<BankTransactions> findAll(Specification<BankTransactions> spec, Pageable pageable);

    @EntityGraph(attributePaths = {
        "sourceAccount",
        "sourceAccount.customer",
        "destinationAccount",
        "destinationAccount.customer",
        "initiatedByStaff",
        "initiatedByCustomer"
    })
    Optional<BankTransactions> findWithDetailsByTransactionRef(String transactionRef);

    @EntityGraph(attributePaths = {
        "sourceAccount",
        "sourceAccount.customer",
        "destinationAccount",
        "destinationAccount.customer",
        "initiatedByStaff",
        "initiatedByCustomer"
    })
    Optional<BankTransactions> findWithDetailsByTransactionId(UUID transactionId);

    Optional<BankTransactions> findByIdempotencyKey(String idempotencyKey);

    boolean existsByIdempotencyKey(String idempotencyKey);
    
    // Member 5 Duplicate Prevention Check (Moved from duplicate repository)
    boolean existsByExternalReferenceAndStatus(String externalReference, TransactionStatus status);
    
    // Safer check that ignores status
    boolean existsByExternalReference(String externalReference);

    Optional<BankTransactions> findByTransactionRef(String transactionRef);

    boolean existsByTransactionRef(String transactionRef);

    @Query("SELECT COUNT(t) FROM BankTransactions t WHERE t.status = :status")
    long countByStatus(@Param("status") TransactionStatus status);

    @Query("SELECT COUNT(t) FROM BankTransactions t WHERE t.status IN (com.corebanking.entity.enums.TransactionStatus.HELD, com.corebanking.entity.enums.TransactionStatus.PENDING_AUTHORIZATION)")
    long countHeldOrPending();

    @Query("SELECT COUNT(t) FROM BankTransactions t WHERE t.status IN (com.corebanking.entity.enums.TransactionStatus.FAILED, com.corebanking.entity.enums.TransactionStatus.REJECTED, com.corebanking.entity.enums.TransactionStatus.CANCELLED)")
    long countFailedOrRejected();

    @Query("SELECT COALESCE(SUM(t.amount), 0) FROM BankTransactions t WHERE t.status = com.corebanking.entity.enums.TransactionStatus.COMPLETED")
    BigDecimal calculateTotalCompletedVolume();

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
