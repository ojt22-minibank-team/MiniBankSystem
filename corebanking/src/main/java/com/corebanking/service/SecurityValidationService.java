package com.corebanking.service;

import com.corebanking.entity.CustomerCredentials;
import com.corebanking.repository.CustomerCredentialsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SecurityValidationService {

    private final CustomerCredentialsRepository credentialsRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = SecurityException.class)
    public void validateTransactionPin(UUID customerId, String rawPin) {
        CustomerCredentials credentials = credentialsRepository.findById(customerId)
                .orElseThrow(() -> new SecurityException("Customer credentials not found"));

        if (credentials.getPinLockedUntil() != null && credentials.getPinLockedUntil().isAfter(LocalDateTime.now())) {
            throw new SecurityException("PIN locked due to excessive failed attempts");
        }

        if (credentials.getTransactionPinHash() == null || !passwordEncoder.matches(rawPin, credentials.getTransactionPinHash())) {
            int failedAttempts = credentials.getFailedPinAttemptCount() + 1;
            credentials.setFailedPinAttemptCount(failedAttempts);

            if (failedAttempts >= 5) {
                credentials.setPinLockedUntil(LocalDateTime.now().plusMinutes(15));
            }
            credentialsRepository.save(credentials);
            throw new SecurityException("Invalid PIN");
        }

        // PIN is correct, reset failures
        credentials.setFailedPinAttemptCount(0);
        credentials.setPinLockedUntil(null);
        credentialsRepository.save(credentials);
    }
}
