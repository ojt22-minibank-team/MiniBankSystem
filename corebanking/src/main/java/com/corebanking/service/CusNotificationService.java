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
                    builder.transactionId(txn.getTransactionId());
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

            // Fallback enrichment: Ensure details are never lost on HTTP fetch even if transaction entity is detached
            enrichFromMessageFallback(n, builder);

            return builder.build();
        } catch (Exception ex) {
            log.error("Error mapping notification id {}: {}", n.getNotificationId(), ex.getMessage());
            NotificationResponseDto.NotificationResponseDtoBuilder fallbackBuilder = NotificationResponseDto.builder()
                    .notificationId(n.getNotificationId())
                    .notificationType(com.corebanking.entity.enums.NotificationType.SYSTEM)
                    .title("Notification")
                    .message(n.getMessage() != null ? n.getMessage() : "")
                    .isRead(n.isRead())
                    .createdAt(n.getCreatedAt());
            enrichFromMessageFallback(n, fallbackBuilder);
            return fallbackBuilder.build();
        }
    }

    private void enrichFromMessageFallback(Notifications n, NotificationResponseDto.NotificationResponseDtoBuilder builder) {
        String msg = n.getMessage();
        if (msg == null || msg.isBlank()) return;

        NotificationResponseDto current = builder.build();

        // 1. Transaction Ref fallback: "Ref: <reference>"
        if (current.getTransactionRef() == null || current.getTransactionRef().isBlank()) {
            java.util.regex.Matcher refMatcher = java.util.regex.Pattern.compile("Ref:\\s*([^\\s,;.]+)").matcher(msg);
            if (refMatcher.find()) {
                builder.transactionRef(refMatcher.group(1).trim());
            }
        }

        // 2. Amount and Currency fallback: "(?:You paid|You have transferred|You received)\s+([0-9]+(?:\.[0-9]+)?)\s+([A-Za-z]{3})"
        if (current.getAmount() == null) {
            java.util.regex.Matcher amtMatcher = java.util.regex.Pattern.compile("(?:You paid|You have transferred|You received)\\s+([0-9]+(?:\\.[0-9]+)?)\\s+([A-Za-z]{3})").matcher(msg);
            if (amtMatcher.find()) {
                try {
                    builder.amount(new java.math.BigDecimal(amtMatcher.group(1)));
                    if (current.getCurrency() == null || current.getCurrency().isBlank()) {
                        builder.currency(amtMatcher.group(2).toUpperCase());
                    }
                } catch (Exception ignored) {}
            }
        }

        // 3. Transfer Direction fallback
        if (current.getTransferDirection() == null || current.getTransferDirection().isBlank()) {
            String title = n.getTitle() != null ? n.getTitle().toLowerCase() : "";
            String msgLower = msg.toLowerCase();
            if (title.contains("sent") || msgLower.startsWith("you paid") || msgLower.startsWith("you have transferred")) {
                builder.transferDirection("SENT");
            } else if (title.contains("received") || msgLower.startsWith("you received")) {
                builder.transferDirection("RECEIVED");
            }
        }

        // 4. Counterparty Name & Account Number fallback
        if (current.getCounterpartyName() == null || current.getCounterpartyName().isBlank()) {
            java.util.regex.Matcher toMatcher = java.util.regex.Pattern.compile("\\bto\\s+([^.(]+?)(?:\\s*\\(([^)]+)\\)|\\s+for Order|\\.\\s*Ref:|$)").matcher(msg);
            if (toMatcher.find()) {
                builder.counterpartyName(toMatcher.group(1).trim());
                if (toMatcher.group(2) != null && !toMatcher.group(2).isBlank() && (current.getCounterpartyAccountNumber() == null || current.getCounterpartyAccountNumber().isBlank())) {
                    builder.counterpartyAccountNumber(toMatcher.group(2).trim());
                }
            } else {
                java.util.regex.Matcher fromMatcher = java.util.regex.Pattern.compile("\\bfrom\\s+([^.(]+?)(?:\\s*\\(([^)]+)\\)|\\s+for Order|\\.\\s*Ref:|$)").matcher(msg);
                if (fromMatcher.find()) {
                    builder.counterpartyName(fromMatcher.group(1).trim());
                    if (fromMatcher.group(2) != null && !fromMatcher.group(2).isBlank() && (current.getCounterpartyAccountNumber() == null || current.getCounterpartyAccountNumber().isBlank())) {
                        builder.counterpartyAccountNumber(fromMatcher.group(2).trim());
                    }
                }
            }
        }
    }
}
