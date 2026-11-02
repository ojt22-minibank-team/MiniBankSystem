package com.corebanking.dto;

import com.corebanking.entity.enums.NotificationType;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationResponseDto {
    private Long notificationId;
    private NotificationType notificationType;
    private String title;
    private String message;

    @JsonProperty("isRead")
    private boolean isRead;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
    private UUID transactionId;
    private String transactionRef;
    private BigDecimal amount;
    private String currency;
    private String counterpartyName;
    private String counterpartyAccountNumber;
    private String transferDirection;
    private String sourceAccountNumber;
    private String destinationAccountNumber;
}
