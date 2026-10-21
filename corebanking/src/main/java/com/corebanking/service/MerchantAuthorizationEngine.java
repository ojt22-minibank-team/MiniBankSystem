package com.corebanking.service;

import com.corebanking.dto.MerchantPaymentRequest;
import com.corebanking.dto.PaymentDetailsResponse;
import com.corebanking.dto.PaymentReceiptResponse;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.CusAccountLockedException;
import com.corebanking.exception.DuplicateTransactionException;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.InvalidPinException;
import com.corebanking.exception.TransactionException;
import com.corebanking.integration.port.GatewayOutboundPort;
import com.corebanking.integration.port.LedgerFacadePort;
import com.corebanking.service.AuditTrailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class MerchantAuthorizationEngine {

    private final MerchantSecurityValidationService merchantSecurityValidationService;
    private final LedgerFacadePort ledgerFacadePort;
    private final GatewayOutboundPort gatewayOutboundPort;
    private final AuditTrailService auditTrailService;

    private final Set<String> inFlightTokens = ConcurrentHashMap.newKeySet();

    public PaymentDetailsResponse getPaymentDetails(String paymentToken) {
        return gatewayOutboundPort.fetchPaymentDetails(paymentToken);
    }

    public PaymentReceiptResponse processPaymentAuthorization(MerchantPaymentRequest request) {
        String token = request.getPaymentToken();

        if (!inFlightTokens.add(token)) {
            throw new DuplicateTransactionException("This payment request is already being processed.");
        }

        boolean shouldNotifyGatewayOnTxError = false;

        try {
            // Check for Duplicate Payment early to save processing
            if (ledgerFacadePort.isDuplicatePayment(token)) {
                throw new DuplicateTransactionException("This payment token has already been processed.");
            }

            PaymentDetailsResponse realDetails = gatewayOutboundPort.fetchPaymentDetails(token);
            shouldNotifyGatewayOnTxError = true;

            BigDecimal realAmount = realDetails.getAmount();

            if (realAmount == null || realAmount.compareTo(BigDecimal.ZERO) <= 0) {
                throw new TransactionException("Payment amount from gateway must be greater than zero");
            }

            // 1. Security: PIN Validation (Group 1's main job)
            merchantSecurityValidationService.validateTransactionPin(request.getCustomerId(), request.getTransactionPin());

            // 2. UX Pre-Check: Read-only balance check using the REAL amount for the selected account
            ledgerFacadePort.validateSufficientFundsAndLimits(request.getCustomerId(), request.getAccountId(), realAmount);

            // 3. Dispatch AUTHORIZED outcome to Group 3 and obtain real transaction reference
            shouldNotifyGatewayOnTxError = false;
            String ledgerReference = gatewayOutboundPort.dispatchAuthorizationOutcome(token, "AUTHORIZED", request.getAccountId(), null, null);

            safeAuditLog("TRANSACTION", "MERCHANT_PAYMENT_AUTHORIZED", token,
                    "Authorized merchant payment of " + realAmount + " MMK from account " + request.getAccountId());

            return PaymentReceiptResponse.builder()
                    .success(true)
                    .message("Payment authorized successfully")
                    .paymentToken(token)
                    .coreLedgerReference(ledgerReference)
                    .amount(realAmount)
                    .currency(realDetails.getCurrency() != null ? realDetails.getCurrency() : "MMK")
                    .timestamp(LocalDateTime.now())
                    .build();

        } catch (InvalidPinException pinEx) {
            // Do NOT send FAILED to Group 3 on try #1 or #2 so the token stays INITIATED for retry
            log.warn("Payment authorization failed (Invalid PIN) for token {}. Reason: {}", token, pinEx.getMessage());
            safeAuditLog("SECURITY", "MERCHANT_PAYMENT_INVALID_PIN", token, pinEx.getMessage());
            throw pinEx;

        } catch (CusAccountLockedException lockEx) {
            // 3rd wrong attempt locked the PIN -> notify Group 3 that the payment failed
            log.error("Payment authorization failed (Account Locked) for token {}. Reason: {}", token, lockEx.getMessage());
            safeAuditLog("SECURITY", "MERCHANT_PAYMENT_ACCOUNT_LOCKED", token, lockEx.getMessage());
            notifyGatewayFailure(token, "ACCOUNT_LOCKED", lockEx.getMessage());
            throw lockEx;

        } catch (AccountNotFoundException accEx) {
            log.error("Payment authorization failed (Account Not Found) for token {}. Reason: {}", token, accEx.getMessage());
            safeAuditLog("TRANSACTION", "MERCHANT_PAYMENT_ACCOUNT_NOT_FOUND", token, accEx.getMessage());
            notifyGatewayFailure(token, "ACCOUNT_NOT_FOUND", accEx.getMessage());
            throw accEx;

        } catch (InsufficientFundsException fundEx) {
            log.error("Payment authorization failed (Insufficient Funds) for token {}. Reason: {}", token, fundEx.getMessage());
            safeAuditLog("TRANSACTION", "MERCHANT_PAYMENT_INSUFFICIENT_FUNDS", token, fundEx.getMessage());
            notifyGatewayFailure(token, "INSUFFICIENT_FUNDS", fundEx.getMessage());
            throw fundEx;

        } catch (SecurityException secEx) {
            log.error("Payment authorization failed (Security) for token {}. Reason: {}", token, secEx.getMessage());
            safeAuditLog("SECURITY", "MERCHANT_PAYMENT_SECURITY_ERROR", token, secEx.getMessage());
            notifyGatewayFailure(token, "INVALID_PIN", secEx.getMessage());
            throw secEx;

        } catch (TransactionException transEx) {
            log.error("Payment authorization failed (Transaction) for token {}. Reason: {}", token, transEx.getMessage());
            safeAuditLog("TRANSACTION", "MERCHANT_PAYMENT_FAILED", token, transEx.getMessage());
            if (shouldNotifyGatewayOnTxError) {
                notifyGatewayFailure(token, "TRANSACTION_FAILED", transEx.getMessage());
            }
            throw transEx;

        } catch (DuplicateTransactionException dupEx) {
            log.error("Duplicate payment token {}.", token);
            throw dupEx;

        } catch (Exception e) {
            log.error("Payment authorization failed (System) for token {}. Reason: {}", token, e.getMessage());
            safeAuditLog("SYSTEM", "MERCHANT_PAYMENT_SYSTEM_ERROR", token, e.getMessage());
            notifyGatewayFailure(token, "SYSTEM_ERROR", "An internal error occurred.");
            throw e;
        } finally {
            inFlightTokens.remove(token);
        }
    }

    private void notifyGatewayFailure(String token, String errorCode, String message) {
        try {
            gatewayOutboundPort.dispatchAuthorizationOutcome(token, "FAILED", null, errorCode, message);
        } catch (Exception webhookEx) {
            log.error("Failed to notify Group 3 of failure ({}): {}", errorCode, webhookEx.getMessage());
        }
    }

    private void safeAuditLog(String category, String actionType, String token, String description) {
        try {
            auditTrailService.logActivity(category, actionType, "MERCHANT_PAYMENT", token, description);
        } catch (Exception auditEx) {
            log.error("Failed to write audit log for {}: {}", actionType, auditEx.getMessage());
        }
    }
}