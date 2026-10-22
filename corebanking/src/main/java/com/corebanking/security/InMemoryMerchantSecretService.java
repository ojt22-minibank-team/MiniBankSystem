package com.corebanking.security;

import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

/**
 * In-memory / configurable implementation of MerchantSecretService.
 * Can be configured via properties or extended with repository queries.
 */
@Service
public class InMemoryMerchantSecretService implements MerchantSecretService {

    private final Map<String, String> merchantSecrets = new ConcurrentHashMap<>();

    public InMemoryMerchantSecretService() {
        // Default mock / test credentials for Payment Gateway & Merchants
        merchantSecrets.put("GW-PAYMENT-001", "gateway_super_secret_key_hmac_256_xyz");
        merchantSecrets.put("MERCHANT-001", "merchant_super_secret_key_hmac_256_abc");
        merchantSecrets.put("MERCHANT-002", "merchant_secret_key_second_store_123");
    }

    public void registerMerchant(String merchantId, String secretKey) {
        merchantSecrets.put(merchantId, secretKey);
    }

    @Override
    public Optional<String> getSecretKeyByMerchantId(String merchantId) {
        if (merchantId == null || merchantId.isBlank()) {
            return Optional.empty();
        }
        return Optional.ofNullable(merchantSecrets.get(merchantId.trim()));
    }
}
