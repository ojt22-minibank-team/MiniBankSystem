package com.corebanking.controller;

import com.corebanking.dto.AccountLookupResponseDto;
import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.dto.P2PTransferResponseDto;
import com.corebanking.exception.CusAccountLockedException;
import com.corebanking.exception.InvalidPinException;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.service.AsyncNotificationService;
import com.corebanking.service.P2PTransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/customer/transfers")
@RequiredArgsConstructor
public class P2PTransferController {

    private final P2PTransferService p2pTransferService;
    private final CustomerRepository customerRepository;
    private final AsyncNotificationService asyncNotificationService;

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
}
