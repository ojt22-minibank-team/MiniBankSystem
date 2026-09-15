package com.corebanking.integration.port;

public interface GatewayOutboundPort {
    void dispatchAuthorizationOutcome(String paymentToken, String transactionStatus);
}
