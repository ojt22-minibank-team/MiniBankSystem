package com.corebanking.integration.port;

import com.corebanking.dto.PaymentDetailsResponse;
import java.util.UUID;

public interface GatewayOutboundPort {
    PaymentDetailsResponse fetchPaymentDetails(String paymentToken);
    
    // Updated to include customerId and failure context so Group 3 knows who to debit or why it failed
    void dispatchAuthorizationOutcome(String paymentToken, String transactionStatus, UUID customerId, String errorCode, String errorMessage);
}
