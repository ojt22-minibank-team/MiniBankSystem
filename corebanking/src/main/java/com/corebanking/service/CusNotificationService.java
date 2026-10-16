package com.corebanking.service;

import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Notifications;
import com.corebanking.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CusNotificationService {

    private final NotificationRepository notificationRepository;

    @Transactional(readOnly = true)
    public List<NotificationResponseDto> getMyNotifications(String authCustomerId) {
        UUID customerId = UUID.fromString(authCustomerId);
        List<Notifications> list = notificationRepository.findTop30ByCustomer_CustomerIdOrderByCreatedAtDesc(customerId);
        return list.stream()
                .map(this::safeMapToDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public long getUnreadCount(String authCustomerId) {
        UUID customerId = UUID.fromString(authCustomerId);
        return notificationRepository.countByCustomer_CustomerIdAndIsReadFalse(customerId);
    }

    @Transactional
    public boolean markAsRead(String authCustomerId, Long notificationId) {
        UUID customerId = UUID.fromString(authCustomerId);
        return notificationRepository.findByNotificationIdAndCustomer_CustomerId(notificationId, customerId)
                .map(notification -> {
                    notification.setRead(true);
                    notification.setReadAt(LocalDateTime.now());
                    notificationRepository.save(notification);
                    return true;
                })
                .orElse(false);
    }

    @Transactional
    public int markAllAsRead(String authCustomerId) {
        UUID customerId = UUID.fromString(authCustomerId);
        return notificationRepository.markAllAsRead(customerId, LocalDateTime.now());
    }

    private NotificationResponseDto safeMapToDto(Notifications n) {
        try {
            NotificationResponseDto.NotificationResponseDtoBuilder builder = NotificationResponseDto.builder()
                    .notificationId(n.getNotificationId())
                    .notificationType(n.getNotificationType() != null ? n.getNotificationType() : com.corebanking.entity.enums.NotificationType.SYSTEM)
                    .title(n.getTitle() != null ? n.getTitle() : "Notification")
                    .message(n.getMessage() != null ? n.getMessage() : "")
                    .isRead(n.isRead())
                    .readAt(n.getReadAt())
                    .createdAt(n.getCreatedAt());

            try {
                if (n.getTransaction() != null) {
                    BankTransactions txn = n.getTransaction();
                    builder.transactionRef(txn.getTransactionRef());
                    if (txn.getAmount() != null) {
                        builder.amount(txn.getAmount());
                    }
                    if (txn.getCurrency() != null) {
                        builder.currency(txn.getCurrency());
                    }

                    // Populate counterparty details
                    UUID currentCustomerId = n.getCustomer() != null ? n.getCustomer().getCustomerId() : null;
                    if (txn.getSourceAccount() != null && txn.getDestinationAccount() != null && currentCustomerId != null) {
                        UUID sourceCustId = (txn.getSourceAccount().getCustomer() != null) ? txn.getSourceAccount().getCustomer().getCustomerId() : null;
                        UUID destCustId = (txn.getDestinationAccount().getCustomer() != null) ? txn.getDestinationAccount().getCustomer().getCustomerId() : null;

                        if (currentCustomerId.equals(sourceCustId)) {
                            String destName = (txn.getDestinationAccount().getCustomer() != null && txn.getDestinationAccount().getCustomer().getFullName() != null)
                                    ? txn.getDestinationAccount().getCustomer().getFullName()
                                    : "Account " + txn.getDestinationAccount().getAccountNumber();
                            builder.counterpartyName(destName);
                            builder.counterpartyAccountNumber(txn.getDestinationAccount().getAccountNumber());
                            builder.transferDirection("SENT");
                        } else if (currentCustomerId.equals(destCustId)) {
                            String srcName = (txn.getSourceAccount().getCustomer() != null && txn.getSourceAccount().getCustomer().getFullName() != null)
                                    ? txn.getSourceAccount().getCustomer().getFullName()
                                    : "Account " + txn.getSourceAccount().getAccountNumber();
                            builder.counterpartyName(srcName);
                            builder.counterpartyAccountNumber(txn.getSourceAccount().getAccountNumber());
                            builder.transferDirection("RECEIVED");
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Skipping associated transaction for notification id {}: {}", n.getNotificationId(), e.getMessage());
            }

            return builder.build();
        } catch (Exception ex) {
            log.error("Error mapping notification id {}: {}", n.getNotificationId(), ex.getMessage());
            return NotificationResponseDto.builder()
                    .notificationId(n.getNotificationId())
                    .notificationType(com.corebanking.entity.enums.NotificationType.SYSTEM)
                    .title("Notification")
                    .message(n.getMessage() != null ? n.getMessage() : "")
                    .isRead(n.isRead())
                    .createdAt(n.getCreatedAt())
                    .build();
        }
    }
}
