package com.corebanking.service;

import com.corebanking.dto.TransactionFlagRequestDto;
import com.corebanking.dto.TransactionOverrideRequestDto;
import com.corebanking.dto.TransactionOverrideResponseDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

/**
 * Service contract for managerial transaction review, suspicious activity flagging,
 * and administrative override (release/reject).
 */
public interface TransactionOverrideService {

    /**
     * Retrieve paginated transactions pending review or under administrative hold.
     *
     * @param status optional transaction status filter (e.g. HELD, PENDING_AUTHORIZATION)
     * @param pageable pagination parameters
     * @return paginated transaction response DTOs
     */
    Page<TransactionOverrideResponseDto> getPendingOrFlaggedTransactions(String status, Pageable pageable);

    /**
     * Flags a transaction as suspicious, placing it on immediate administrative hold.
     *
     * @param transactionId UUID of the transaction
     * @param request flag request containing mandatory reason and risk level
     * @return outcome response DTO
     */
    TransactionOverrideResponseDto flagSuspiciousTransaction(UUID transactionId, TransactionFlagRequestDto request);

    /**
     * Resolves and overrides a held/pending transaction by either releasing it to proceed or rejecting it.
     *
     * @param transactionId UUID of the transaction
     * @param request override request containing action (RELEASE or REJECT) and reason
     * @return outcome response DTO
     */
    TransactionOverrideResponseDto resolveTransaction(UUID transactionId, TransactionOverrideRequestDto request);

    /**
     * Retrieves the chronological audit review history for a specific transaction.
     *
     * @param transactionId UUID of the transaction
     * @return list of review actions
     */
    List<TransactionOverrideResponseDto> getTransactionReviewHistory(UUID transactionId);
}
