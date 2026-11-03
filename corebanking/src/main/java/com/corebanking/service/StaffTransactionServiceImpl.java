package com.corebanking.service;

import com.corebanking.dto.StaffTransactionDetailDto;
import com.corebanking.dto.StaffTransactionResponseDto;
import com.corebanking.dto.StaffTransactionSearchCriteria;
import com.corebanking.dto.StaffTransactionStatsDto;
import com.corebanking.dto.TransactionOverrideResponseDto;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.exception.TransactionException;
import com.corebanking.repository.BankTransactionRepository;
import com.corebanking.repository.BankTransactionSearchSpecification;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class StaffTransactionServiceImpl implements StaffTransactionService {

    private final BankTransactionRepository bankTransactionRepository;
    private final TransactionOverrideService transactionOverrideService;

    @Override
    @Transactional(readOnly = true)
    public Page<StaffTransactionResponseDto> searchTransactions(StaffTransactionSearchCriteria criteria, Pageable pageable) {
        log.debug("Executing staff transaction search with criteria: {}", criteria);
        Specification<BankTransactions> spec = BankTransactionSearchSpecification.build(criteria);
        Page<BankTransactions> entities = bankTransactionRepository.findAll(spec, pageable);
        return entities.map(StaffTransactionResponseDto::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public StaffTransactionDetailDto getTransactionDetail(String identifier) {
        log.debug("Fetching transaction detail for identifier: {}", identifier);
        if (identifier == null || identifier.isBlank()) {
            throw new TransactionException("Transaction identifier is required");
        }

        Optional<BankTransactions> txOpt;

        // Try parsing identifier as UUID first
        try {
            UUID uuid = UUID.fromString(identifier.trim());
            txOpt = bankTransactionRepository.findWithDetailsByTransactionId(uuid);
        } catch (IllegalArgumentException e) {
            // Not a UUID, search by transactionRef
            txOpt = bankTransactionRepository.findWithDetailsByTransactionRef(identifier.trim());
        }

        // If not found yet and was UUID, check if it happens to match transactionRef string
        if (txOpt.isEmpty()) {
            txOpt = bankTransactionRepository.findWithDetailsByTransactionRef(identifier.trim());
        }

        BankTransactions tx = txOpt.orElseThrow(() ->
                new TransactionException("Transaction not found for identifier: " + identifier));

        List<TransactionOverrideResponseDto> reviewHistory = Collections.emptyList();
        try {
            reviewHistory = transactionOverrideService.getTransactionReviewHistory(tx.getTransactionId());
        } catch (Exception ex) {
            log.warn("Could not load review history for transaction {}: {}", tx.getTransactionId(), ex.getMessage());
        }

        return StaffTransactionDetailDto.fromEntity(tx, reviewHistory);
    }

    @Override
    @Transactional(readOnly = true)
    public StaffTransactionStatsDto getTransactionStats() {
        log.debug("Calculating staff transactions stats overview");
        long total = bankTransactionRepository.count();
        long completed = bankTransactionRepository.countByStatus(TransactionStatus.COMPLETED);
        long heldOrPending = bankTransactionRepository.countHeldOrPending();
        long failed = bankTransactionRepository.countFailedOrRejected();
        BigDecimal volume = bankTransactionRepository.calculateTotalCompletedVolume();

        return StaffTransactionStatsDto.builder()
                .totalCount(total)
                .completedCount(completed)
                .heldOrPendingCount(heldOrPending)
                .failedCount(failed)
                .totalCompletedVolume(volume != null ? volume : BigDecimal.ZERO)
                .build();
    }
}
