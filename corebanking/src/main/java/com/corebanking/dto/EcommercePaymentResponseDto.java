package com.corebanking.dto;

import com.corebanking.entity.enums.TransactionStatus;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EcommercePaymentResponseDto {
    private String transactionRef;
    private String orderId;
    private TransactionStatus status;
    private String sourceAccountNumber;
    private String merchantAccountNumber;
    private BigDecimal amount;
    private BigDecimal serviceFee;
    private BigDecimal totalDebitedAmount;
    private String currency;
    private LocalDateTime completedAt;
    private String description;
    private String message;
}
