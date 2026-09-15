package com.corebanking.integration.port;

import java.math.BigDecimal;
import java.util.UUID;

public interface LedgerFacadePort {
    String executeAtomicTransfer(UUID customerId, UUID merchantAccountId, BigDecimal amount, String paymentToken);
    
    boolean isDuplicatePayment(String paymentToken);
}
