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
public class TransactionDetailReportDTO {
    private String ref;
    private LocalDateTime date;
    private BigDecimal amount;
    private BigDecimal fee;
    private String sourceAccount;
    private String destAccount;
    private String status;
    private String channel;
    private String currency;
}
