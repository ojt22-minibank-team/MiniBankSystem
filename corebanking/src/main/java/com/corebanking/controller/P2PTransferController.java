package com.corebanking.controller;

import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.dto.P2PTransferResponseDto;
import com.corebanking.service.P2PTransferService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/transfers")
@RequiredArgsConstructor
public class P2PTransferController {

    private final P2PTransferService p2pTransferService;

    @PostMapping("/p2p")
    public ResponseEntity<P2PTransferResponseDto> executeP2PTransfer(
            @AuthenticationPrincipal UserDetails authenticatedUser,
            @RequestHeader(value = "Idempotency-Key", required = false) String headerIdempotencyKey,
            @Valid @RequestBody P2PTransferRequestDto request) {
    	
        String idempotencyKey = (headerIdempotencyKey != null && !headerIdempotencyKey.isBlank()) 
                ? headerIdempotencyKey 
                : request.getIdempotencyKey();

        P2PTransferResponseDto response = p2pTransferService.processP2PTransfer(
        		authenticatedUser.getUsername(),
                request, 
                idempotencyKey
        );

        return ResponseEntity.ok(response);
    }
}
