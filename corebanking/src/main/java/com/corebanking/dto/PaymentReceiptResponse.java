package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReceiptResponse {
    private boolean success;
    private String message;
    private String paymentToken;
    private String coreLedgerReference;
    private UUID merchantAccountId;
    private BigDecimal amount;
    private LocalDateTime timestamp;
}
