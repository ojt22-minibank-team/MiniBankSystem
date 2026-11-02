package com.corebanking.service;

import com.corebanking.dto.AccountFreezeRequestDto;
import com.corebanking.dto.AccountFreezeResponseDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Implementation of {@link AccountFreezeService} providing fraud mitigation control
 * and immutable audit trail logging for state transitions.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AccountFreezeServiceImpl implements AccountFreezeService {

    private final AccountRepository accountRepository;
    private final AuditTrailService auditTrailService;

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public AccountFreezeResponseDto freezeAccount(UUID accountId, AccountFreezeRequestDto request) {
        log.info("Processing account freeze request for accountId={}", accountId);

        Accounts account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + accountId));

        if (account.getStatus() == AccountStatus.FROZEN) {
            throw new IllegalStateException("Account is already frozen");
        }

        if (account.getStatus() == AccountStatus.CLOSED) {
            throw new IllegalStateException("Cannot freeze a closed account");
        }

        String oldStatus = account.getStatus() != null ? account.getStatus().name() : "UNKNOWN";
        Map<String, Object> oldSnapshot = Map.of(
                "accountNumber", account.getAccountNumber(),
                "status", oldStatus
        );

        account.setStatus(AccountStatus.FROZEN);
        account.setUpdatedByType(UpdatedByType.STAFF);
        account.setUpdatedAt(LocalDateTime.now());

        Accounts saved = accountRepository.save(account);

        Map<String, Object> newSnapshot = Map.of(
                "accountNumber", saved.getAccountNumber(),
                "status", AccountStatus.FROZEN.name(),
                "reason", request.getReason()
        );

        auditTrailService.logDataChange(
                "FREEZE_ACCOUNT",
                "ACCOUNT",
                saved.getAccountNumber(),
                oldSnapshot,
                newSnapshot,
                "Account frozen: " + request.getReason()
        );

        log.info("Account freeze completed successfully for accountId={}, accountNumber={}",
                accountId, saved.getAccountNumber());

        return AccountFreezeResponseDto.builder()
                .accountId(saved.getAccountId())
                .accountNumber(saved.getAccountNumber())
                .previousStatus(oldStatus)
                .currentStatus(saved.getStatus().name())
                .reason(request.getReason())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional
    public AccountFreezeResponseDto unfreezeAccount(UUID accountId, AccountFreezeRequestDto request) {
        log.info("Processing account unfreeze request for accountId={}", accountId);

        Accounts account = accountRepository.findById(accountId)
                .orElseThrow(() -> new AccountNotFoundException("Account not found with ID: " + accountId));

        if (account.getStatus() != AccountStatus.FROZEN) {
            throw new IllegalStateException("Only frozen accounts can be unfrozen. Current status: " + account.getStatus());
        }

        String oldStatus = account.getStatus().name();
        Map<String, Object> oldSnapshot = Map.of(
                "accountNumber", account.getAccountNumber(),
                "status", oldStatus
        );

        account.setStatus(AccountStatus.ACTIVE);
        account.setUpdatedByType(UpdatedByType.STAFF);
        account.setUpdatedAt(LocalDateTime.now());

        Accounts saved = accountRepository.save(account);

        Map<String, Object> newSnapshot = Map.of(
                "accountNumber", saved.getAccountNumber(),
                "status", AccountStatus.ACTIVE.name(),
                "reason", request.getReason()
        );

        auditTrailService.logDataChange(
                "UNFREEZE_ACCOUNT",
                "ACCOUNT",
                saved.getAccountNumber(),
                oldSnapshot,
                newSnapshot,
                "Account unfrozen: " + request.getReason()
        );

        log.info("Account unfreeze completed successfully for accountId={}, accountNumber={}",
                accountId, saved.getAccountNumber());

        return AccountFreezeResponseDto.builder()
                .accountId(saved.getAccountId())
                .accountNumber(saved.getAccountNumber())
                .previousStatus(oldStatus)
                .currentStatus(saved.getStatus().name())
                .reason(request.getReason())
                .updatedAt(saved.getUpdatedAt())
                .build();
    }
}
