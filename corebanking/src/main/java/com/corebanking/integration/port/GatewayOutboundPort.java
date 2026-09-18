package com.corebanking.integration.port;

import com.corebanking.dto.PaymentDetailsResponse;

public interface GatewayOutboundPort {
    void dispatchAuthorizationOutcome(String paymentToken, String transactionStatus);
    
    // Future integration with Group 3 to fetch order amount before payment
    PaymentDetailsResponse fetchPaymentDetails(String paymentToken);
}
