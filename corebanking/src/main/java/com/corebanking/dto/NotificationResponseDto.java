package com.corebanking.dto;

import com.corebanking.entity.enums.NotificationType;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

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
    private boolean isRead;
    private LocalDateTime readAt;
    private LocalDateTime createdAt;
    private String transactionRef;
    private BigDecimal amount;
    private String currency;
}
