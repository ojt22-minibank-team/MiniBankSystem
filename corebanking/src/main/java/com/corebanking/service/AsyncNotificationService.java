package com.corebanking.service;

import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.Notifications;
import com.corebanking.entity.enums.NotificationType;
import com.corebanking.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncNotificationService {

    private final NotificationRepository notificationRepository;

    @Async
    public void sendTransferNotificationsAsync(Customers sender, Customers receiver, BankTransactions transaction) {
        try {
            BigDecimal totalDebited = transaction.getAmount().add(transaction.getServiceFee());

            // 1. Sender Notification
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
                notificationRepository.save(senderNotification);
            }

            // 2. Receiver Notification
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
                notificationRepository.save(receiverNotification);
            }

            log.info("Asynchronous transfer notifications dispatched successfully for Ref: {}", transaction.getTransactionRef());

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
                notificationRepository.save(failedNotification);
                log.info("Failed transfer notification dispatched for customer: {}", sender.getCustomerId());
            }
        } catch (Exception e) {
            log.error("Failed to record failed transfer notification", e);
        }
    }
}
