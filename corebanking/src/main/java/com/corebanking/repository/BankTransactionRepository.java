
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
}
