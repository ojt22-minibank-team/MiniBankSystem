package com.corebanking.integration.port;

import com.corebanking.dto.PaymentDetailsResponse;
import java.util.UUID;

public interface GatewayOutboundPort {
    PaymentDetailsResponse fetchPaymentDetails(String paymentToken);
    String dispatchAuthorizationOutcome(String paymentToken, String transactionStatus, String sourceAccountNumber, String errorCode, String errorMessage);
}
