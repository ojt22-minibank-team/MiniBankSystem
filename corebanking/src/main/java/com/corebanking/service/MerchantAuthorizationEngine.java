package com.corebanking.service;

import com.corebanking.dto.MerchantPaymentRequest;
import com.corebanking.integration.port.GatewayOutboundPort;
import com.corebanking.integration.port.LedgerFacadePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class MerchantAuthorizationEngine {

    private final SecurityValidationService securityValidationService;
    private final LedgerFacadePort ledgerFacadePort;
    private final GatewayOutboundPort gatewayOutboundPort;

    public com.corebanking.dto.PaymentDetailsResponse getPaymentDetails(String paymentToken) {
        return gatewayOutboundPort.fetchPaymentDetails(paymentToken);
    }

    @Transactional(rollbackFor = Exception.class)
    public String processPaymentAuthorization(MerchantPaymentRequest request) {
        
        // FR-5.9: Defensive Validation (Block Negative Amounts)
        if (request.getAmount() == null || request.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
            throw new IllegalStateException("Payment amount must be greater than zero");
        }

        // FR-5.8: Duplicate-Payment Prevention
        if (ledgerFacadePort.isDuplicatePayment(request.getPaymentToken())) {
            throw new IllegalStateException("Duplicate payment request for token: " + request.getPaymentToken());
        }
        
        try {
            securityValidationService.validateTransactionPin(request.getCustomerId(), request.getTransactionPin());
        } catch (SecurityException e) {
            gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "FAILED");
            throw e;
        }

        String ledgerReference = ledgerFacadePort.executeAtomicTransfer(
                request.getCustomerId(), 
                request.getMerchantAccountId(), 
                request.getAmount(),
                request.getPaymentToken()
        );

        gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "COMPLETED");

        return ledgerReference;
    }
}
