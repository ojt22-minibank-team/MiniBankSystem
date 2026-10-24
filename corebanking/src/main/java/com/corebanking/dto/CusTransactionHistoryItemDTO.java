package com.corebanking.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
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
public class CusTransactionHistoryItemDTO {
    private String transactionRef;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime transactionDate;

    private String transactionType;
    private String status;
    private String direction;
    private BigDecimal amount;
    private String currency;
    private BigDecimal serviceFee;
    private String description;
    private String sourceAccountNumber;
    private String destinationAccountNumber;
    private String failureCode;
    private String failureMessage;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime initiatedAt;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime completedAt;

    private String counterpartyName;
    private Boolean isOwnAccount;
    private String displayTitle;
}
