package com.corebanking.service;

import com.corebanking.dto.MerchantPaymentRequest;
import com.corebanking.dto.PaymentDetailsResponse;
import com.corebanking.dto.PaymentReceiptResponse;
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

    public PaymentReceiptResponse processPaymentAuthorization(MerchantPaymentRequest request) {
        
        try {
            
            PaymentDetailsResponse realDetails = gatewayOutboundPort.fetchPaymentDetails(request.getPaymentToken());
            java.math.BigDecimal realAmount = realDetails.getAmount();

            if (realAmount == null || realAmount.compareTo(java.math.BigDecimal.ZERO) <= 0) {
                throw new TransactionException("Payment amount from gateway must be greater than zero");
            }

            // Check for Duplicate Payment early to save processing
            if (ledgerFacadePort.isDuplicatePayment(request.getPaymentToken())) {
                throw new DuplicateTransactionException("This payment token has already been processed.");
            }

            // 1. Security: PIN Validation (Group 1's main job)
            securityValidationService.validateTransactionPin(request.getCustomerId(), request.getTransactionPin());

            // 2. UX Pre-Check: Read-only balance check using the REAL amount for the selected account
            ledgerFacadePort.validateSufficientFundsAndLimits(request.getCustomerId(), request.getAccountId(), realAmount);

            // 3. Webhook: Server-to-Server Handoff (Group 3 moves the money)
            // Added customerId to payload so Group 3 can execute the debit
            gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "AUTHORIZED", request.getCustomerId(), null, null);

            String ledgerReference = "AUTH-SUCCESS-" + request.getPaymentToken();
            
            return com.corebanking.dto.PaymentReceiptResponse.builder()
                .success(true)
                .message("Payment authorized successfully")
                .paymentToken(request.getPaymentToken())
                .coreLedgerReference(ledgerReference)
                .amount(realAmount) // CRITICAL: Use the REAL amount verified by the gateway
                .currency("MMK")
                .timestamp(java.time.LocalDateTime.now())
                .build();
            
        } catch (com.corebanking.exception.InvalidPinException pinEx) {
            log.error("Payment authorization failed (Invalid PIN) for token {}. Reason: {}", request.getPaymentToken(), pinEx.getMessage());
            try {
                gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "FAILED", request.getCustomerId(), "INVALID_PIN", pinEx.getMessage());
            } catch (Exception webhookEx) {
                log.error("Failed to notify Group 3 of security failure: {}", webhookEx.getMessage());
            }
            throw pinEx;
        } catch (com.corebanking.exception.CusAccountLockedException lockEx) {
            log.error("Payment authorization failed (Account Locked) for token {}. Reason: {}", request.getPaymentToken(), lockEx.getMessage());
            try {
                gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "FAILED", request.getCustomerId(), "ACCOUNT_LOCKED", lockEx.getMessage());
            } catch (Exception webhookEx) {
                log.error("Failed to notify Group 3 of security failure: {}", webhookEx.getMessage());
            }
            throw lockEx;
        } catch (com.corebanking.exception.AccountNotFoundException accEx) {
            log.error("Payment authorization failed (Account Not Found) for token {}. Reason: {}", request.getPaymentToken(), accEx.getMessage());
            try {
                gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "FAILED", request.getCustomerId(), "ACCOUNT_NOT_FOUND", accEx.getMessage());
            } catch (Exception webhookEx) {
                log.error("Failed to notify Group 3 of transaction failure: {}", webhookEx.getMessage());
            }
            throw accEx;
        } catch (com.corebanking.exception.InsufficientFundsException fundEx) {
            log.error("Payment authorization failed (Insufficient Funds) for token {}. Reason: {}", request.getPaymentToken(), fundEx.getMessage());
            try {
                gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "FAILED", request.getCustomerId(), "INSUFFICIENT_FUNDS", fundEx.getMessage());
            } catch (Exception webhookEx) {
                log.error("Failed to notify Group 3 of transaction failure: {}", webhookEx.getMessage());
            }
            throw fundEx;
        } catch (SecurityException secEx) {
            log.error("Payment authorization failed (Security) for token {}. Reason: {}", request.getPaymentToken(), secEx.getMessage());
            try {
                gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "FAILED", request.getCustomerId(), "INVALID_PIN", secEx.getMessage());
            } catch (Exception webhookEx) {
                log.error("Failed to notify Group 3 of security failure: {}", webhookEx.getMessage());
            }
            throw secEx;
        } catch (TransactionException transEx) {
            log.error("Payment authorization failed (Transaction) for token {}. Reason: {}", request.getPaymentToken(), transEx.getMessage());
            try {
                gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "FAILED", request.getCustomerId(), "TRANSACTION_FAILED", transEx.getMessage());
            } catch (Exception webhookEx) {
                log.error("Failed to notify Group 3 of transaction failure: {}", webhookEx.getMessage());
            }
            throw transEx;
        } catch (DuplicateTransactionException dupEx) {
            log.error("Duplicate payment token {}.", request.getPaymentToken());
            // Group 3 doesn't need a webhook for a duplicate payload it already sent, just throw.
            throw dupEx;
        } catch (Exception e) {
            log.error("Payment authorization failed (System) for token {}. Reason: {}", request.getPaymentToken(), e.getMessage());
            try {
                gatewayOutboundPort.dispatchAuthorizationOutcome(request.getPaymentToken(), "FAILED", request.getCustomerId(), "SYSTEM_ERROR", "An internal error occurred.");
            } catch (Exception webhookEx) {
                log.error("Failed to notify Group 3 of system failure: {}", webhookEx.getMessage());
            }
            throw e; 
        }
    }
}
