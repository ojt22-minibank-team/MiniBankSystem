package com.corebanking.security;

import java.util.Optional;

/**
 * Service to resolve secret keys for authenticated merchants or payment gateways.
 */
public interface MerchantSecretService {

    /**
     * Look up the merchant's secret key by merchant ID.
     *
     * @param merchantId Merchant or Gateway identifier
     * @return Optional containing secret key if found, empty otherwise
     */
    Optional<String> getSecretKeyByMerchantId(String merchantId);
}
