package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PaymentReceiptResponse {
    private boolean success;
    private String message;
    private String paymentToken;
    private String coreLedgerReference;
    private BigDecimal amount;
    private String currency;
    private LocalDateTime timestamp;
}
