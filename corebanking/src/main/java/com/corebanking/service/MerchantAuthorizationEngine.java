package com.corebanking.service;

import com.corebanking.dto.MerchantPaymentRequest;
import com.corebanking.dto.PaymentDetailsResponse;
import com.corebanking.exception.TransactionException;
import com.corebanking.exception.DuplicateTransactionException;
import com.corebanking.integration.port.GatewayOutboundPort;
import com.corebanking.integration.port.LedgerFacadePort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class MerchantAuthorizationEngine {

    private final SecurityValidationService securityValidationService;
    private final LedgerFacadePort ledgerFacadePort; 
    private final GatewayOutboundPort gatewayOutboundPort;

    public PaymentDetailsResponse getPaymentDetails(String paymentToken) {
        return gatewayOutboundPort.fetchPaymentDetails(paymentToken);
    }

    public String processPaymentAuthorization(MerchantPaymentRequest request) {
        
        try {
            // Defensive Validation (Block Negative Amounts)
            if (request.getAmount() == null || request.getAmount().compareTo(java.math.BigDecimal.ZERO) <= 0) {
                throw new TransactionException("Payment amount must be greater than zero");
            }

            // Check for Duplicate Payment early to save processing
            if (ledgerFacadePort.isDuplicatePayment(request.getPaymentToken())) {
                throw new DuplicateTransactionException("This payment token has already been processed.");
            }

            // 1. Security: PIN Validation (Group 1's main job)
            securityValidationService.validateTransactionPin(request.getCustomerId(), request.getTransactionPin());

            // 2. UX Pre-Check: Read-only balance check to prevent "Lying to Customer"
            ledgerFacadePort.validateSufficientFundsAndLimits(request.getCustomerId(), request.getAmount());

            // 3. Webhook: Server-to-Server Handoff (Group 3 moves the money)
            // Added customerId to payload so Group 3 can execute the debit
            gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "AUTHORIZED", request.getCustomerId());

            return "AUTH-SUCCESS-" + request.getPaymentToken();
            
        } catch (Exception e) {
            log.error("Payment authorization failed for token {}. Reason: {}", request.getPaymentToken(), e.getMessage());
            // If PIN fails or UX check fails, we tell Group 3
            gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "FAILED", request.getCustomerId());
            throw e; 
        }
    }
}
