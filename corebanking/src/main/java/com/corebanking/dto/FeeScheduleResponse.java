package com.corebanking.dto;

import com.corebanking.entity.enums.FeeType;
import com.corebanking.entity.enums.TransactionType;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class FeeScheduleResponse {

    private Integer feeScheduleId;

    private String feeCode;

    private TransactionType transactionType;

    private FeeType feeType;

    private BigDecimal feeValue;

    private BigDecimal minimumFee;

    private BigDecimal maximumFee;

    private String currency;

    private LocalDateTime activeFrom;

    private LocalDateTime activeUntil;

    private boolean active;

    private UUID createdByStaffId;

    private LocalDateTime createdAt;

    private UUID updatedById;

    private String updatedByType;

    private LocalDateTime updatedAt;
}