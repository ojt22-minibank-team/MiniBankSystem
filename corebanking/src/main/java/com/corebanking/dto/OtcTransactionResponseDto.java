package com.corebanking.dto;

import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OtcTransactionResponseDto {

    private String transactionRef;
    private TransactionType transactionType; // OTC_DEPOSIT or OTC_WITHDRAWAL
    private TransactionStatus status;
    private String accountNumber;
    private String customerCode;
    private String customerName;
    private BigDecimal amount;
    private BigDecimal serviceFee;
    private BigDecimal balanceBefore;
    private BigDecimal balanceAfter;
    private String currency;
    private String tellerUsername;
    private String depositorOrWithdrawerName;
    private String description;
    private String manualReferenceId;
    private String manualAuditNote;
    private LocalDateTime transactedAt;
}
