package com.corebanking.controller;

import com.corebanking.dto.AccountLookupResponseDto;
import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.dto.P2PTransferResponseDto;
import com.corebanking.exception.CusAccountLockedException;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.InvalidPinException;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.service.AsyncNotificationService;
import com.corebanking.service.AuditTrailService;
import com.corebanking.service.P2PTransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/customer/transfers")
@RequiredArgsConstructor
public class P2PTransferController {

    private final P2PTransferService p2pTransferService;
    private final CustomerRepository customerRepository;
    private final AsyncNotificationService asyncNotificationService;
    private final AuditTrailService auditTrailService;

    @GetMapping("/lookup/{accountNumber}")
    public ResponseEntity<AccountLookupResponseDto> lookupAccount(
            @PathVariable String accountNumber) {
        AccountLookupResponseDto response = p2pTransferService.lookupAccount(accountNumber);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/p2p")
    public ResponseEntity<P2PTransferResponseDto> executeP2PTransfer(
            @AuthenticationPrincipal String customerId,
            @RequestHeader(value = "Idempotency-Key", required = false) String headerIdempotencyKey,
            @Valid @RequestBody P2PTransferRequestDto request) {
        
        String idempotencyKey = (headerIdempotencyKey != null && !headerIdempotencyKey.isBlank()) 
                ? headerIdempotencyKey 
                : request.getIdempotencyKey();

        try {
            P2PTransferResponseDto response = p2pTransferService.processP2PTransfer(
                    customerId,
                    request, 
                    idempotencyKey
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logTransferFailureAudit(customerId, request, e);
            try {
                if (!(e instanceof InvalidPinException || e instanceof CusAccountLockedException)) {
                    customerRepository.findById(UUID.fromString(customerId)).ifPresent(sender -> {
                        asyncNotificationService.sendFailedTransferNotificationAsync(
                                sender,
                                request.getDestinationAccountNumber(),
                                request.getAmount(),
                                request.getCurrency(),
                                e.getMessage()
                        );
                    });
                }
            } catch (Exception notifEx) {
                // Ignore notification dispatch failure so original exception is returned
            }
            throw e;
        }
    }

    @PostMapping("/p2p/queued")
    public ResponseEntity<P2PTransferResponseDto> executeP2PTransferQueued(
            @AuthenticationPrincipal String customerId,
            @RequestHeader(value = "Idempotency-Key", required = false) String headerIdempotencyKey,
            @Valid @RequestBody P2PTransferRequestDto request) {

        String idempotencyKey = (headerIdempotencyKey != null && !headerIdempotencyKey.isBlank()) 
                ? headerIdempotencyKey 
                : request.getIdempotencyKey();

        try {
            P2PTransferResponseDto response = p2pTransferService.enqueueP2PTransfer(
                    customerId,
                    request,
                    idempotencyKey
            );
            return ResponseEntity.accepted().body(response);
        } catch (Exception e) {
            logTransferFailureAudit(customerId, request, e);
            throw e;
        }
    }

    @PostMapping("/{transactionRef}/reverse")
    public ResponseEntity<P2PTransferResponseDto> reverseTransfer(
            @AuthenticationPrincipal String customerId,
            @PathVariable String transactionRef,
            @RequestParam(value = "reason", required = false, defaultValue = "Client requested reversal or network timeout") String reason) {

        log.info("Received request to reverse transfer Ref: {} by customer: {}", transactionRef, customerId);
        com.corebanking.entity.BankTransactions reversedTxn = p2pTransferService.executeAutoReversal(
                transactionRef,
                reason,
                "CLIENT_REQUESTED_REVERSAL"
        );
        return ResponseEntity.ok(p2pTransferService.mapToResponseDto(reversedTxn));
    }

    private void logTransferFailureAudit(String customerId, P2PTransferRequestDto request, Exception e) {
        try {
            String category = "TRANSACTION";
            String actionType = "P2P_TRANSFER_FAILED";

            if (e instanceof InvalidPinException) {
                category = "SECURITY";
                actionType = "P2P_TRANSFER_INVALID_PIN";
            } else if (e instanceof CusAccountLockedException) {
                category = "SECURITY";
                actionType = "P2P_TRANSFER_ACCOUNT_LOCKED";
            } else if (e instanceof InsufficientFundsException) {
                category = "TRANSACTION";
                actionType = "P2P_TRANSFER_INSUFFICIENT_FUNDS";
            } else if (e.getMessage() != null && e.getMessage().toLowerCase().contains("limit")) {
                category = "TRANSACTION";
                actionType = "P2P_TRANSFER_LIMIT_EXCEEDED";
            }

            String entityId = (request != null && request.getSourceAccountNumber() != null)
                    ? request.getSourceAccountNumber()
                    : customerId;

            String desc = String.format("P2P transfer failed for customer [%s]. Source: %s, Destination: %s, Amount: %s %s. Reason: %s",
                    customerId,
                    request != null ? request.getSourceAccountNumber() : "N/A",
                    request != null ? request.getDestinationAccountNumber() : "N/A",
                    (request != null && request.getAmount() != null) ? request.getAmount().toPlainString() : "0",
                    (request != null && request.getCurrency() != null) ? request.getCurrency() : "MMK",
                    e.getMessage());

            auditTrailService.logActivity(category, actionType, "TRANSACTION", entityId, desc);
        } catch (Exception auditEx) {
            log.warn("Non-blocking failure audit logging failed for customer: {}", customerId, auditEx);
        }
    }
}
