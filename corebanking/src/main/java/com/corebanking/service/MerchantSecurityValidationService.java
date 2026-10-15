package com.corebanking.service;

import com.corebanking.entity.CustomerCredentials;
import com.corebanking.exception.CusAccountLockedException;
import com.corebanking.exception.InvalidPinException;
import com.corebanking.repository.CustomerCredentialsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.locks.ReentrantLock;

/**
 * MerchantSecurityValidationService
 * Dedicated PIN validation and security enforcement for Merchant Payment Authorization.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class MerchantSecurityValidationService {

    private final CustomerCredentialsRepository credentialsRepository;
    private final PasswordEncoder passwordEncoder;

    private final ConcurrentHashMap<UUID, ReentrantLock> customerPinLocks = new ConcurrentHashMap<>();

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            noRollbackFor = {SecurityException.class, CusAccountLockedException.class, InvalidPinException.class}
    )
    public void validateTransactionPin(UUID customerId, String rawPin) {
        ReentrantLock lock = customerPinLocks.computeIfAbsent(customerId, k -> new ReentrantLock());
        lock.lock();
        try {
            CustomerCredentials credentials = credentialsRepository.findById(customerId)
                    .orElseThrow(() -> new SecurityException("Customer credentials not found"));

            LocalDateTime now = LocalDateTime.now();

            if (credentials.getPinLockedUntil() != null) {
                if (credentials.getPinLockedUntil().isAfter(now)) {
                    log.warn("PIN validation blocked: Customer {} is locked until {}", customerId, credentials.getPinLockedUntil());
                    throw new CusAccountLockedException("PIN locked due to excessive failed attempts. Please try again after 5 minutes.");
                } else {
                    // 5-minute lock has expired -> reset counter back to 0 so customer gets 3 fresh attempts
                    credentials.setFailedPinAttemptCount(0);
                    credentials.setPinLockedUntil(null);
                }
            }

            if (credentials.getTransactionPinHash() == null || !passwordEncoder.matches(rawPin, credentials.getTransactionPinHash())) {
                log.warn("Invalid transaction PIN for customer {}", customerId);
                recordFailedPinAttemptAndCheckLock(credentials, now);
            }

            // PIN is correct, reset failure counter
            resetFailedPinCount(credentials);
        } finally {
            lock.unlock();
        }
    }

    private void recordFailedPinAttemptAndCheckLock(CustomerCredentials credentials, LocalDateTime now) {
        int attempts = credentials.getFailedPinAttemptCount() + 1;
        credentials.setFailedPinAttemptCount(attempts);

        if (attempts >= 3) {
            credentials.setPinLockedUntil(now.plusMinutes(5));
            credentialsRepository.saveAndFlush(credentials);
            log.warn("Customer {} exceeded max PIN attempts. Locked until {}", credentials.getCustomerId(), credentials.getPinLockedUntil());
            throw new CusAccountLockedException("PIN locked due to 3 failed attempts. Please try again after 5 minutes.");
        }

        credentialsRepository.saveAndFlush(credentials);
        throw new InvalidPinException("Invalid Transaction PIN. Please try again. (" + (3 - attempts) + " attempt(s) remaining)");
    }

    private void resetFailedPinCount(CustomerCredentials credentials) {
        if (credentials.getFailedPinAttemptCount() > 0 || credentials.getPinLockedUntil() != null) {
            credentials.setFailedPinAttemptCount(0);
            credentials.setPinLockedUntil(null);
            credentialsRepository.saveAndFlush(credentials);
        }
    }
}