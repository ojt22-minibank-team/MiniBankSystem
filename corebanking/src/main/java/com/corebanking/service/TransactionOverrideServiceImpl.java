package com.corebanking.service;

import com.corebanking.dto.TransactionFlagRequestDto;
import com.corebanking.dto.TransactionOverrideRequestDto;
import com.corebanking.dto.TransactionOverrideResponseDto;
import com.corebanking.entity.AccountHolds;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.TransactionReviewActions;
import com.corebanking.entity.enums.HoldStatus;
import com.corebanking.entity.enums.HoldType;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.repository.AccountHoldsReviewRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.repository.TransactionReviewActionsRepository;
import com.corebanking.repository.TransactionReviewRepository;
import com.corebanking.util.AuditContextUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Production implementation of {@link TransactionOverrideService}.
 * Enforces strict banking auditability, state machine integrity, and hold management.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionOverrideServiceImpl implements TransactionOverrideService {

    private final TransactionReviewRepository transactionReviewRepository;
    private final TransactionReviewActionsRepository transactionReviewActionsRepository;
    private final AccountHoldsReviewRepository accountHoldsReviewRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final AuditTrailService auditTrailService;

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public Page<TransactionOverrideResponseDto> getPendingOrFlaggedTransactions(String status, Pageable pageable) {
        log.debug("Fetching transactions for review queue, status filter: {}", status);

        Page<BankTransactions> page;
        if (status != null && !status.isBlank()) {
            try {
                TransactionStatus targetStatus = TransactionStatus.valueOf(status.toUpperCase().trim());
                page = transactionReviewRepository.findByStatus(targetStatus, pageable);
            } catch (IllegalArgumentException e) {
                log.warn("Invalid status filter supplied: {}, falling back to review queue defaults", status);
                page = transactionReviewRepository.findByStatusIn(
                        List.of(TransactionStatus.HELD, TransactionStatus.PENDING_AUTHORIZATION), pageable);
            }
        } else {
            page = transactionReviewRepository.findByStatusIn(
                    List.of(TransactionStatus.HELD, TransactionStatus.PENDING_AUTHORIZATION, TransactionStatus.INITIATED),
                    pageable);
        }

        return page.map(this::mapToSummaryDto);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public TransactionOverrideResponseDto flagSuspiciousTransaction(UUID transactionId, TransactionFlagRequestDto request) {
        log.info("Flagging suspicious transaction: transactionId={}", transactionId);

        BankTransactions tx = transactionReviewRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found with ID: " + transactionId));

        if (tx.getStatus() == TransactionStatus.COMPLETED) {
            throw new IllegalStateException("Cannot flag already COMPLETED transaction");
        }
        if (tx.getStatus() == TransactionStatus.REJECTED || tx.getStatus() == TransactionStatus.CANCELLED || tx.getStatus() == TransactionStatus.FAILED) {
            throw new IllegalStateException("Cannot flag transaction in finalized status: " + tx.getStatus());
        }
        if (tx.getStatus() == TransactionStatus.HELD) {
            throw new IllegalStateException("Transaction is already in HELD status");
        }

        String oldStatus = tx.getStatus().name();
        String risk = (request.getRiskLevel() != null && !request.getRiskLevel().isBlank())
                ? request.getRiskLevel().toUpperCase()
                : "HIGH";

        Map<String, Object> oldSnapshot = Map.of(
                "transactionRef", tx.getTransactionRef(),
                "status", oldStatus,
                "amount", tx.getAmount()
        );

        // 1. Update Transaction Status
        tx.setStatus(TransactionStatus.HELD);
        tx.setAuditNote("FLAGGED SUSPICIOUS: " + request.getReason());
        tx.setUpdatedAt(LocalDateTime.now());
        tx.setUpdatedByType(UpdatedByType.STAFF);

        StaffUsers staff = resolveCurrentStaff();
        if (staff != null) {
            tx.setUpdatedById(staff.getStaffId());
        }
        BankTransactions savedTx = transactionReviewRepository.save(tx);

        // 2. Place an administrative hold on the source account if present
        if (savedTx.getSourceAccount() != null) {
            AccountHolds hold = AccountHolds.builder()
                    .holdRef("HOLD-" + savedTx.getTransactionRef())
                    .account(savedTx.getSourceAccount())
                    .transaction(savedTx)
                    .holdType(HoldType.ADMIN_HOLD)
                    .amount(savedTx.getAmount())
                    .status(HoldStatus.ACTIVE)
                    .reason("Suspicious activity hold: " + request.getReason())
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .updatedByType(UpdatedByType.STAFF)
                    .build();
            accountHoldsReviewRepository.save(hold);
        }

        // 3. Record Review Action
        TransactionReviewActions review = TransactionReviewActions.builder()
                .transaction(savedTx)
                .action("FLAG")
                .oldStatus(oldStatus)
                .newStatus(TransactionStatus.HELD.name())
                .riskLevel(risk)
                .reason(request.getReason())
                .resolutionNote(request.getResolutionNote())
                .performedByStaff(staff)
                .performedAt(LocalDateTime.now())
                .build();
        TransactionReviewActions savedReview = transactionReviewActionsRepository.save(review);

        // 4. Capture Immutable Audit Trail Log
        Map<String, Object> newSnapshot = Map.of(
                "transactionRef", savedTx.getTransactionRef(),
                "status", TransactionStatus.HELD.name(),
                "riskLevel", risk,
                "reason", request.getReason()
        );
        auditTrailService.logDataChange(
                "FLAG_TRANSACTION",
                "TRANSACTION",
                savedTx.getTransactionRef(),
                oldSnapshot,
                newSnapshot,
                "Transaction flagged as suspicious: " + request.getReason()
        );

        log.info("Transaction flagged successfully: ref={}, status={}", savedTx.getTransactionRef(), savedTx.getStatus());
        return mapToOutcomeDto(savedTx, savedReview);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public TransactionOverrideResponseDto resolveTransaction(UUID transactionId, TransactionOverrideRequestDto request) {
        log.info("Resolving transaction: transactionId={}, action={}", transactionId, request.getAction());

        BankTransactions tx = transactionReviewRepository.findById(transactionId)
                .orElseThrow(() -> new IllegalArgumentException("Transaction not found with ID: " + transactionId));

        if (tx.getStatus() != TransactionStatus.HELD && tx.getStatus() != TransactionStatus.PENDING_AUTHORIZATION) {
            throw new IllegalStateException("Transaction is not in a reviewable state (Current status: " + tx.getStatus() + ")");
        }

        String oldStatus = tx.getStatus().name();
        String actionUpper = request.getAction().toUpperCase().trim();
        TransactionStatus newStatus;

        StaffUsers staff = resolveCurrentStaff();

        if ("RELEASE".equals(actionUpper)) {
            newStatus = TransactionStatus.COMPLETED;
            tx.setAuthorizedAt(LocalDateTime.now());
            tx.setCompletedAt(LocalDateTime.now());

            // Release any active holds associated with this transaction
            releaseActiveHolds(tx);
        } else if ("REJECT".equals(actionUpper)) {
            newStatus = TransactionStatus.REJECTED;
            tx.setFailureCode("ADMIN_REJECTED");
            tx.setFailureMessage(request.getReason());

            // Release any active holds so funds are freed back to source account
            releaseActiveHolds(tx);
        } else {
            throw new IllegalArgumentException("Unsupported override action: " + request.getAction());
        }

        tx.setStatus(newStatus);
        tx.setAuditNote("OVERRIDE " + actionUpper + ": " + request.getReason());
        tx.setUpdatedAt(LocalDateTime.now());
        tx.setUpdatedByType(UpdatedByType.STAFF);
        if (staff != null) {
            tx.setUpdatedById(staff.getStaffId());
        }

        BankTransactions savedTx = transactionReviewRepository.save(tx);

        // Record Review Action
        TransactionReviewActions review = TransactionReviewActions.builder()
                .transaction(savedTx)
                .action(actionUpper)
                .oldStatus(oldStatus)
                .newStatus(newStatus.name())
                .riskLevel(request.getRiskLevel())
                .reason(request.getReason())
                .resolutionNote(request.getResolutionNote())
                .performedByStaff(staff)
                .performedAt(LocalDateTime.now())
                .build();
        TransactionReviewActions savedReview = transactionReviewActionsRepository.save(review);

        // Capture Immutable Audit Log
        Map<String, Object> oldSnapshot = Map.of(
                "transactionRef", savedTx.getTransactionRef(),
                "status", oldStatus,
                "amount", savedTx.getAmount()
        );
        Map<String, Object> newSnapshot = Map.of(
                "transactionRef", savedTx.getTransactionRef(),
                "status", newStatus.name(),
                "action", actionUpper,
                "reason", request.getReason()
        );

        auditTrailService.logDataChange(
                "OVERRIDE_TRANSACTION_" + actionUpper,
                "TRANSACTION",
                savedTx.getTransactionRef(),
                oldSnapshot,
                newSnapshot,
                "Transaction override " + actionUpper + ": " + request.getReason()
        );

        log.info("Transaction resolved successfully: ref={}, newStatus={}", savedTx.getTransactionRef(), newStatus);
        return mapToOutcomeDto(savedTx, savedReview);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public List<TransactionOverrideResponseDto> getTransactionReviewHistory(UUID transactionId) {
        log.debug("Retrieving review history for transactionId={}", transactionId);
        List<TransactionReviewActions> actions = transactionReviewActionsRepository
                .findByTransactionTransactionIdOrderByPerformedAtDesc(transactionId);

        return actions.stream()
                .map(action -> TransactionOverrideResponseDto.builder()
                        .transactionId(action.getTransaction().getTransactionId())
                        .transactionRef(action.getTransaction().getTransactionRef())
                        .amount(action.getTransaction().getAmount())
                        .currency(action.getTransaction().getCurrency())
                        .previousStatus(action.getOldStatus())
                        .currentStatus(action.getNewStatus())
                        .action(action.getAction())
                        .reason(action.getReason())
                        .riskLevel(action.getRiskLevel())
                        .resolutionNote(action.getResolutionNote())
                        .performedByStaff(action.getPerformedByStaff() != null ? action.getPerformedByStaff().getUsername() : "SYSTEM")
                        .performedAt(action.getPerformedAt())
                        .build())
                .toList();
    }

    private void releaseActiveHolds(BankTransactions tx) {
        List<AccountHolds> holds = accountHoldsReviewRepository
                .findByTransactionTransactionIdAndStatus(tx.getTransactionId(), HoldStatus.ACTIVE);

        for (AccountHolds hold : holds) {
            hold.setStatus(HoldStatus.RELEASED);
            hold.setReleasedAt(LocalDateTime.now());
            hold.setUpdatedAt(LocalDateTime.now());
            accountHoldsReviewRepository.save(hold);
            log.info("Released account hold ref={} for transactionId={}", hold.getHoldRef(), tx.getTransactionId());
        }
    }

    private StaffUsers resolveCurrentStaff() {
        try {
            return AuditContextUtil.getCurrentStaffUsername()
                    .flatMap(staffUsersRepository::findByUsername)
                    .orElse(null);
        } catch (Exception e) {
            log.trace("Could not resolve current staff user: {}", e.getMessage());
            return null;
        }
    }

    private TransactionOverrideResponseDto mapToSummaryDto(BankTransactions tx) {
        return TransactionOverrideResponseDto.builder()
                .transactionId(tx.getTransactionId())
                .transactionRef(tx.getTransactionRef())
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .currentStatus(tx.getStatus().name())
                .performedAt(tx.getUpdatedAt())
                .build();
    }

    private TransactionOverrideResponseDto mapToOutcomeDto(BankTransactions tx, TransactionReviewActions review) {
        return TransactionOverrideResponseDto.builder()
                .transactionId(tx.getTransactionId())
                .transactionRef(tx.getTransactionRef())
                .amount(tx.getAmount())
                .currency(tx.getCurrency())
                .previousStatus(review.getOldStatus())
                .currentStatus(tx.getStatus().name())
                .action(review.getAction())
                .reason(review.getReason())
                .riskLevel(review.getRiskLevel())
                .resolutionNote(review.getResolutionNote())
                .performedByStaff(review.getPerformedByStaff() != null ? review.getPerformedByStaff().getUsername() : "SYSTEM")
                .performedAt(review.getPerformedAt())
                .build();
    }
}
