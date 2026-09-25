package com.corebanking.integration.port;

import java.math.BigDecimal;
import java.util.UUID;

public interface LedgerFacadePort {
    boolean isDuplicatePayment(String paymentToken);
    void validateSufficientFundsAndLimits(UUID customerId, BigDecimal amount);
}
