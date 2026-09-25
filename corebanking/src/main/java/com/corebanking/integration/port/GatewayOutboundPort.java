package com.corebanking.integration.port;

import com.corebanking.dto.PaymentDetailsResponse;
import java.util.UUID;

public interface GatewayOutboundPort {
    PaymentDetailsResponse fetchPaymentDetails(String paymentToken);
    
    // Updated to include customerId so Group 3 knows who to debit
    void dispatchAuthorizationOutcome(String paymentToken, String transactionStatus, UUID customerId);
}
