package com.corebanking.service;

import com.corebanking.entity.CustomerCredentials;
import com.corebanking.exception.InvalidPinException;
import com.corebanking.repository.CustomerCredentialsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CustomerSecurityService {

    private final CustomerCredentialsRepository customerCredentialsRepository;
   

    /**
     * PIN မှားယွင်းမှု count ကို သီးခြား Transaction ဖြင့် ချက်ချင်း commit လုပ်မည်။
     * Parent transaction rollback ဖြစ်သော်လည်း PIN count ပျောက်မသွားပါ။
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedPinAttemptAndCheckLock(UUID customerId) {
        CustomerCredentials credentials = customerCredentialsRepository.findByCustomerId(customerId)
                .orElseThrow(() -> new InvalidPinException("Customer credentials record not found."));

        int attempts = credentials.getFailedPinAttemptCount() + 1;
        credentials.setFailedPinAttemptCount(attempts);

        if (attempts >= 5) {
            credentials.setPinLockedUntil(LocalDateTime.now().plusMinutes(5)); // 5 မိနစ် Lockout
            log.warn("Customer {} PIN is locked out until {}", customerId, credentials.getPinLockedUntil());
        }

        customerCredentialsRepository.saveAndFlush(credentials);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void resetFailedPinCount(UUID customerId) {
        CustomerCredentials credentials = customerCredentialsRepository.findByCustomerId(customerId).orElse(null);
        if (credentials != null && credentials.getFailedPinAttemptCount() > 0) {
            credentials.setFailedPinAttemptCount(0);
            credentials.setPinLockedUntil(null);
            customerCredentialsRepository.saveAndFlush(credentials);
        }
    }
}