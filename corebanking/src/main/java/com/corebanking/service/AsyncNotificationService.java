package com.corebanking.service;

import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.Notifications;
import com.corebanking.entity.enums.NotificationType;
import com.corebanking.repository.NotificationRepository;
import com.corebanking.websocket.NotificationWebSocketHandler;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncNotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationWebSocketHandler notificationWebSocketHandler;

    @Async
    public void sendTransferNotificationsAsync(Customers sender, Customers receiver, BankTransactions transaction) {
        try {
            BigDecimal totalDebited = transaction.getAmount().add(transaction.getServiceFee());

            // 1. Sender Notification (Saved & Broadcasted via WebSocket)
            if (sender != null) {
                Notifications senderNotification = Notifications.builder()
                        .customer(sender)
                        .transaction(transaction)
                        .notificationType(NotificationType.TRANSFER)
                        .title("Transfer Sent")
                        .message(String.format("You have transferred %s %s to account %s. Ref: %s",
                                totalDebited, transaction.getCurrency(),
                                transaction.getDestinationAccount().getAccountNumber(),
                                transaction.getTransactionRef()))
                        .build();
                Notifications savedSender = notificationRepository.save(senderNotification);

                // Real-time WebSocket push to Sender
                NotificationResponseDto senderDto = NotificationResponseDto.builder()
                        .notificationId(savedSender.getNotificationId())
                        .notificationType(savedSender.getNotificationType())
                        .title(savedSender.getTitle())
                        .message(savedSender.getMessage())
                        .isRead(false)
                        .createdAt(savedSender.getCreatedAt() != null ? savedSender.getCreatedAt() : LocalDateTime.now())
                        .transactionRef(transaction.getTransactionRef())
                        .amount(totalDebited)
                        .currency(transaction.getCurrency())
                        .build();
                notificationWebSocketHandler.sendNotification(sender.getCustomerId().toString(), senderDto);
            }

            // 2. Receiver Notification (Saved & Broadcasted via WebSocket)
            if (receiver != null) {
                Notifications receiverNotification = Notifications.builder()
                        .customer(receiver)
                        .transaction(transaction)
                        .notificationType(NotificationType.TRANSFER)
                        .title("Funds Received")
                        .message(String.format("You received %s %s from account %s. Ref: %s",
                                transaction.getAmount(), transaction.getCurrency(),
                                transaction.getSourceAccount().getAccountNumber(),
                                transaction.getTransactionRef()))
                        .build();
                Notifications savedReceiver = notificationRepository.save(receiverNotification);

                // Real-time WebSocket push to Receiver
                NotificationResponseDto receiverDto = NotificationResponseDto.builder()
                        .notificationId(savedReceiver.getNotificationId())
                        .notificationType(savedReceiver.getNotificationType())
                        .title(savedReceiver.getTitle())
                        .message(savedReceiver.getMessage())
                        .isRead(false)
                        .createdAt(savedReceiver.getCreatedAt() != null ? savedReceiver.getCreatedAt() : LocalDateTime.now())
                        .transactionRef(transaction.getTransactionRef())
                        .amount(transaction.getAmount())
                        .currency(transaction.getCurrency())
                        .build();
                notificationWebSocketHandler.sendNotification(receiver.getCustomerId().toString(), receiverDto);
            }

            log.info("Asynchronous transfer notifications dispatched and pushed via WebSocket for Ref: {}", transaction.getTransactionRef());

        } catch (Exception e) {
            log.error("Failed to dispatch asynchronous transfer notification for Ref: {}", transaction.getTransactionRef(), e);
        }
    }

    @Async
    public void sendFailedTransferNotificationAsync(Customers sender, String destAccountNumber, BigDecimal amount, String currency, String reason) {
        try {
            if (sender != null) {
                String amountStr = (amount != null) ? amount.toPlainString() : "0";
                String curr = (currency != null) ? currency : "MMK";
                String dest = (destAccountNumber != null && !destAccountNumber.isBlank()) ? destAccountNumber : "N/A";
                String failReason = (reason != null && !reason.isBlank()) ? reason : "Transaction rejected";

                Notifications failedNotification = Notifications.builder()
                        .customer(sender)
                        .notificationType(NotificationType.TRANSFER)
                        .title("Transfer Failed")
                        .message(String.format("Transfer of %s %s to account %s failed: %s",
                                amountStr, curr, dest, failReason))
                        .build();
                Notifications saved = notificationRepository.save(failedNotification);
                NotificationResponseDto failedDto = NotificationResponseDto.builder()
                        .notificationId(saved.getNotificationId())
                        .notificationType(saved.getNotificationType())
                        .title(saved.getTitle())
                        .message(saved.getMessage())
                        .isRead(false)
                        .createdAt(saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now())
                        .amount(amount)
                        .currency(curr)
                        .build();
                notificationWebSocketHandler.sendNotification(sender.getCustomerId().toString(), failedDto);
                log.info("Failed transfer notification dispatched and pushed via WebSocket for customer: {}", sender.getCustomerId());
            }
        } catch (Exception e) {
            log.error("Failed to record failed transfer notification", e);
        }
    }
}
