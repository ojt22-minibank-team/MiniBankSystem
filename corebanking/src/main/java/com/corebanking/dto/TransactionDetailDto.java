package com.corebanking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;
@Getter
@Setter
public class TransactionDetailDto {
    private String transactionId;
    private String transactionRef;
    private String transactionType;
    private String transactionStatus;
    private BigDecimal amount;
    private BigDecimal serviceFee;
    private String currency;
    private String channel;
    private LocalDateTime initiatedAt;
    private LocalDateTime completedAt;
    private String sourceAccountNumber;
    private String destinationAccountNumber;
    private String initiatedByType;
    private String initiatedByIdentifier;
    private String initiatedByName;
    private String externalReference;
    private String description;
    private String failureCode;
    private String failureMessage;
}
