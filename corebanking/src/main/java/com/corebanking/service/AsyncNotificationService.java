package com.corebanking.service;

import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.Notifications;
import com.corebanking.entity.enums.NotificationType;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.BankTransactionRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.NotificationRepository;
import com.corebanking.websocket.NotificationWebSocketHandler;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class AsyncNotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationWebSocketHandler notificationWebSocketHandler;
    private final CustomerRepository customerRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final AccountRepository accountRepository;

    @Autowired
    public AsyncNotificationService(
            NotificationRepository notificationRepository,
            NotificationWebSocketHandler notificationWebSocketHandler,
            @Autowired(required = false) CustomerRepository customerRepository,
            @Autowired(required = false) BankTransactionRepository bankTransactionRepository,
            @Autowired(required = false) AccountRepository accountRepository) {
        this.notificationRepository = notificationRepository;
        this.notificationWebSocketHandler = notificationWebSocketHandler;
        this.customerRepository = customerRepository;
        this.bankTransactionRepository = bankTransactionRepository;
        this.accountRepository = accountRepository;
    }

    public AsyncNotificationService(
            NotificationRepository notificationRepository,
            NotificationWebSocketHandler notificationWebSocketHandler,
            CustomerRepository customerRepository,
            BankTransactionRepository bankTransactionRepository) {
        this(notificationRepository, notificationWebSocketHandler, customerRepository, bankTransactionRepository, null);
    }

    public AsyncNotificationService(
            NotificationRepository notificationRepository,
            NotificationWebSocketHandler notificationWebSocketHandler) {
        this(notificationRepository, notificationWebSocketHandler, null, null, null);
    }

    @Async
    @Transactional
    public void sendTransferNotificationsAsync(Customers sender, Customers receiver, BankTransactions transaction) {
        try {
            UUID senderId = (sender != null) ? sender.getCustomerId() : null;
            UUID receiverId = (receiver != null) ? receiver.getCustomerId() : null;
            UUID txnId = (transaction != null) ? transaction.getTransactionId() : null;

            // Re-fetch managed entities within this thread's transaction to ensure full initialization
            Customers senderManaged = (senderId != null && customerRepository != null) ? customerRepository.findById(senderId).orElse(sender) : sender;
            Customers receiverManaged = (receiverId != null && customerRepository != null) ? customerRepository.findById(receiverId).orElse(receiver) : receiver;
            BankTransactions txnManaged = (txnId != null && bankTransactionRepository != null) ? bankTransactionRepository.findById(txnId).orElse(transaction) : transaction;

            if (txnManaged == null) {
                log.warn("Cannot dispatch transfer notification: transaction is null.");
                return;
            }

            BigDecimal amount = txnManaged.getAmount() != null ? txnManaged.getAmount() : BigDecimal.ZERO;
            BigDecimal fee = txnManaged.getServiceFee() != null ? txnManaged.getServiceFee() : BigDecimal.ZERO;
            BigDecimal totalDebited = amount.add(fee);
            String currency = txnManaged.getCurrency() != null ? txnManaged.getCurrency() : "MMK";
            String txnRef = txnManaged.getTransactionRef() != null ? txnManaged.getTransactionRef() : "";

            String sourceAccNo = (txnManaged.getSourceAccount() != null)
                    ? txnManaged.getSourceAccount().getAccountNumber()
                    : "";
            String destAccNo = (txnManaged.getDestinationAccount() != null)
                    ? txnManaged.getDestinationAccount().getAccountNumber()
                    : "";

            String senderName = (senderManaged != null && senderManaged.getFullName() != null && !senderManaged.getFullName().isBlank())
                    ? senderManaged.getFullName()
                    : (!sourceAccNo.isEmpty() ? "Account " + sourceAccNo : "Sender");

            String receiverName = (receiverManaged != null && receiverManaged.getFullName() != null && !receiverManaged.getFullName().isBlank())
                    ? receiverManaged.getFullName()
                    : (!destAccNo.isEmpty() ? "Account " + destAccNo : "Recipient");

            // =========================================================================
            // 1. SENDER NOTIFICATION (Saved & Broadcasted via WebSocket)
            // =========================================================================
            if (senderManaged != null) {
                try {
                    String senderMessage = String.format("You have transferred %s %s to %s (%s). Ref: %s",
                            totalDebited, currency,
                            receiverName,
                            destAccNo,
                            txnRef);

                    Notifications senderNotification = Notifications.builder()
                            .customer(senderManaged)
                            .transaction(txnManaged)
                            .notificationType(NotificationType.TRANSFER)
                            .title("Transfer Sent")
                            .message(senderMessage)
                            .build();
                    Notifications savedSender = notificationRepository.save(senderNotification);

                    NotificationResponseDto senderDto = NotificationResponseDto.builder()
                            .notificationId(savedSender.getNotificationId())
                            .notificationType(savedSender.getNotificationType())
                            .title(savedSender.getTitle())
                            .message(savedSender.getMessage())
                            .isRead(false)
                            .createdAt(savedSender.getCreatedAt() != null ? savedSender.getCreatedAt() : LocalDateTime.now())
                            .transactionId(txnManaged.getTransactionId())
                            .transactionRef(txnRef)
                            .amount(totalDebited)
                            .currency(currency)
                            .counterpartyName(receiverName)
                            .counterpartyAccountNumber(destAccNo)
                            .transferDirection("SENT")
                            .sourceAccountNumber(sourceAccNo)
                            .destinationAccountNumber(destAccNo)
                            .build();

                    notificationWebSocketHandler.sendNotification(senderManaged.getCustomerId().toString(), senderDto);
                    log.info("Sender notification #{} saved and pushed for Ref: {}", savedSender.getNotificationId(), txnRef);
                } catch (Exception ex) {
                    log.error("Failed to save/push sender notification for Ref: {}", txnRef, ex);
                }
            }

            // =========================================================================
            // 2. RECEIVER NOTIFICATION (Saved & Broadcasted via WebSocket)
            // =========================================================================
            if (receiverManaged != null) {
                try {
                    String receiverMessage = String.format("You received %s %s from %s (%s). Ref: %s",
                            amount, currency,
                            senderName,
                            sourceAccNo,
                            txnRef);

                    Notifications receiverNotification = Notifications.builder()
                            .customer(receiverManaged)
                            .transaction(txnManaged)
                            .notificationType(NotificationType.TRANSFER)
                            .title("Funds Received")
                            .message(receiverMessage)
                            .build();
                    Notifications savedReceiver = notificationRepository.save(receiverNotification);

                    NotificationResponseDto receiverDto = NotificationResponseDto.builder()
                            .notificationId(savedReceiver.getNotificationId())
                            .notificationType(savedReceiver.getNotificationType())
                            .title(savedReceiver.getTitle())
                            .message(savedReceiver.getMessage())
                            .isRead(false)
                            .createdAt(savedReceiver.getCreatedAt() != null ? savedReceiver.getCreatedAt() : LocalDateTime.now())
                            .transactionId(txnManaged.getTransactionId())
                            .transactionRef(txnRef)
                            .amount(amount)
                            .currency(currency)
                            .counterpartyName(senderName)
                            .counterpartyAccountNumber(sourceAccNo)
                            .transferDirection("RECEIVED")
                            .sourceAccountNumber(sourceAccNo)
                            .destinationAccountNumber(destAccNo)
                            .build();

                    notificationWebSocketHandler.sendNotification(receiverManaged.getCustomerId().toString(), receiverDto);
                    log.info("Receiver notification #{} saved and pushed for Ref: {}", savedReceiver.getNotificationId(), txnRef);
                } catch (Exception ex) {
                    log.error("Failed to save/push receiver notification for Ref: {}", txnRef, ex);
                }
            }

        } catch (Exception e) {
            log.error("Failed to dispatch asynchronous transfer notifications for Ref: {}",
                    transaction != null ? transaction.getTransactionRef() : "unknown", e);
        }
    }

    @Async
    @Transactional
    public void sendFailedTransferNotificationAsync(Customers sender, String destAccountNumber, BigDecimal amount, String currency, String reason) {
        try {
            if (sender != null) {
                UUID senderId = sender.getCustomerId();
                Customers senderManaged = (senderId != null && customerRepository != null) ? customerRepository.findById(senderId).orElse(sender) : sender;

                String amountStr = (amount != null) ? amount.toPlainString() : "0";
                String curr = (currency != null) ? currency : "MMK";
                String dest = (destAccountNumber != null && !destAccountNumber.isBlank()) ? destAccountNumber : "N/A";
                String failReason = (reason != null && !reason.isBlank()) ? reason : "Transaction rejected";

                Notifications failedNotification = Notifications.builder()
                        .customer(senderManaged)
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
                notificationWebSocketHandler.sendNotification(senderManaged.getCustomerId().toString(), failedDto);
                log.info("Failed transfer notification dispatched and pushed via WebSocket for customer: {}", senderManaged.getCustomerId());
            }
        } catch (Exception e) {
            log.error("Failed to record failed transfer notification", e);
        }
    }

    @Async
    @Transactional
    public void sendMerchantPaymentNotificationAsync(
            UUID customerId,
            String sourceAccountNumber,
            String merchantAccountNumber,
            String merchantName,
            String orderId,
            BigDecimal amount,
            String currency,
            String transactionRef) {
        try {
            Customers payerManaged = (customerId != null && customerRepository != null)
                    ? customerRepository.findById(customerId).orElse(null)
                    : null;

            Customers merchantManaged = null;
            if (merchantAccountNumber != null && !merchantAccountNumber.isBlank() && accountRepository != null) {
                Optional<Accounts> merchantAccOpt = accountRepository.findByAccountNumber(merchantAccountNumber.trim());
                if (merchantAccOpt.isPresent() && merchantAccOpt.get().getCustomer() != null) {
                    UUID mCustId = merchantAccOpt.get().getCustomer().getCustomerId();
                    merchantManaged = (customerRepository != null)
                            ? customerRepository.findById(mCustId).orElse(merchantAccOpt.get().getCustomer())
                            : merchantAccOpt.get().getCustomer();
                }
            }

            String curr = (currency != null && !currency.isBlank()) ? currency : "MMK";
            String ref = (transactionRef != null && !transactionRef.isBlank()) ? transactionRef : "N/A";
            String order = (orderId != null && !orderId.isBlank()) ? orderId : "";
            String mName = (merchantName != null && !merchantName.isBlank()) ? merchantName : "Merchant";
            String srcAcc = (sourceAccountNumber != null && !sourceAccountNumber.isBlank()) ? sourceAccountNumber : "";
            String payerName = (payerManaged != null && payerManaged.getFullName() != null && !payerManaged.getFullName().isBlank())
                    ? payerManaged.getFullName()
                    : (!srcAcc.isEmpty() ? "Account " + srcAcc : "Customer");

            // Look up associated BankTransactions entity if present (for database foreign key persistence)
            BankTransactions txnManaged = null;
            if (transactionRef != null && !transactionRef.isBlank() && bankTransactionRepository != null) {
                try {
                    txnManaged = bankTransactionRepository.findByTransactionRef(transactionRef.trim()).orElse(null);
                } catch (Exception ex) {
                    log.warn("Could not find transaction by reference {}: {}", transactionRef, ex.getMessage());
                }
            }

            // 1. NOTIFICATION FOR PAYER (Customer who authorized payment)
            if (payerManaged != null) {
                try {
                    String payerMessage = String.format("You paid %s %s to %s%s. Ref: %s",
                            amount != null ? amount.toPlainString() : "0",
                            curr,
                            mName,
                            (!order.isEmpty() ? " for Order #" + order : ""),
                            ref);

                    Notifications payerNotification = Notifications.builder()
                            .customer(payerManaged)
                            .transaction(txnManaged)
                            .notificationType(NotificationType.PAYMENT)
                            .title("Payment Sent")
                            .message(payerMessage)
                            .build();
                    Notifications savedPayer = notificationRepository.save(payerNotification);

                    NotificationResponseDto payerDto = NotificationResponseDto.builder()
                            .notificationId(savedPayer.getNotificationId())
                            .notificationType(NotificationType.PAYMENT)
                            .title(savedPayer.getTitle())
                            .message(savedPayer.getMessage())
                            .isRead(false)
                            .createdAt(savedPayer.getCreatedAt() != null ? savedPayer.getCreatedAt() : LocalDateTime.now())
                            .transactionId(txnManaged != null ? txnManaged.getTransactionId() : null)
                            .transactionRef(ref)
                            .amount(amount)
                            .currency(curr)
                            .counterpartyName(mName)
                            .counterpartyAccountNumber(merchantAccountNumber)
                            .transferDirection("SENT")
                            .sourceAccountNumber(srcAcc)
                            .destinationAccountNumber(merchantAccountNumber)
                            .build();

                    notificationWebSocketHandler.sendNotification(payerManaged.getCustomerId().toString(), payerDto);
                    log.info("Payer merchant payment notification #{} saved and pushed for Ref: {}", savedPayer.getNotificationId(), ref);
                } catch (Exception ex) {
                    log.error("Failed to save/push payer payment notification for Ref: {}", ref, ex);
                }
            }

            // 2. NOTIFICATION FOR MERCHANT (Receiver)
            if (merchantManaged != null) {
                try {
                    String merchantMessage = String.format("You received %s %s from %s%s. Ref: %s",
                            amount != null ? amount.toPlainString() : "0",
                            curr,
                            payerName,
                            (!order.isEmpty() ? " for Order #" + order : ""),
                            ref);

                    Notifications merchantNotification = Notifications.builder()
                            .customer(merchantManaged)
                            .transaction(txnManaged)
                            .notificationType(NotificationType.PAYMENT)
                            .title("Merchant Payment Received")
                            .message(merchantMessage)
                            .build();
                    Notifications savedMerchant = notificationRepository.save(merchantNotification);

                    NotificationResponseDto merchantDto = NotificationResponseDto.builder()
                            .notificationId(savedMerchant.getNotificationId())
                            .notificationType(NotificationType.PAYMENT)
                            .title(savedMerchant.getTitle())
                            .message(savedMerchant.getMessage())
                            .isRead(false)
                            .createdAt(savedMerchant.getCreatedAt() != null ? savedMerchant.getCreatedAt() : LocalDateTime.now())
                            .transactionId(txnManaged != null ? txnManaged.getTransactionId() : null)
                            .transactionRef(ref)
                            .amount(amount)
                            .currency(curr)
                            .counterpartyName(payerName)
                            .counterpartyAccountNumber(srcAcc)
                            .transferDirection("RECEIVED")
                            .sourceAccountNumber(srcAcc)
                            .destinationAccountNumber(merchantAccountNumber)
                            .build();

                    notificationWebSocketHandler.sendNotification(merchantManaged.getCustomerId().toString(), merchantDto);
                    log.info("Merchant payment received notification #{} saved and pushed for Customer: {}, Ref: {}",
                            savedMerchant.getNotificationId(), merchantManaged.getCustomerId(), ref);
                } catch (Exception ex) {
                    log.error("Failed to save/push merchant payment notification for Ref: {}", ref, ex);
                }
            }
        } catch (Exception e) {
            log.error("Failed to dispatch merchant payment notifications for Ref: {}", transactionRef, e);
        }
    }
    @Async
    @Transactional
    public void sendReversalNotificationAsync(Customers customer, BankTransactions transaction, String reason) {
        try {
            if (customer != null && transaction != null) {
                UUID customerId = customer.getCustomerId();
                Customers customerManaged = (customerId != null && customerRepository != null)
                        ? customerRepository.findById(customerId).orElse(customer)
                        : customer;

                BigDecimal amount = transaction.getAmount() != null ? transaction.getAmount() : BigDecimal.ZERO;
                BigDecimal fee = transaction.getServiceFee() != null ? transaction.getServiceFee() : BigDecimal.ZERO;
                BigDecimal totalRefunded = amount.add(fee);
                String curr = transaction.getCurrency() != null ? transaction.getCurrency() : "MMK";
                String ref = transaction.getTransactionRef() != null ? transaction.getTransactionRef() : "N/A";
                String sourceAcc = transaction.getSourceAccount() != null ? transaction.getSourceAccount().getAccountNumber() : "your account";
                String revReason = (reason != null && !reason.isBlank()) ? reason : "Downstream network or service failure";

                String message = String.format("Transfer of %s %s (Ref: %s) could not be completed and has been automatically refunded to account %s. Reason: %s",
                        totalRefunded, curr, ref, sourceAcc, revReason);

                Notifications reversalNotif = Notifications.builder()
                        .customer(customerManaged)
                        .transaction(transaction)
                        .notificationType(NotificationType.TRANSFER)
                        .title("Transfer Auto-Reversed & Refunded")
                        .message(message)
                        .build();

                Notifications saved = notificationRepository.save(reversalNotif);

                NotificationResponseDto dto = NotificationResponseDto.builder()
                        .notificationId(saved.getNotificationId())
                        .notificationType(saved.getNotificationType())
                        .title(saved.getTitle())
                        .message(saved.getMessage())
                        .isRead(false)
                        .createdAt(saved.getCreatedAt() != null ? saved.getCreatedAt() : LocalDateTime.now())
                        .transactionId(transaction.getTransactionId())
                        .transactionRef(ref)
                        .amount(totalRefunded)
                        .currency(curr)
                        .transferDirection("REFUND")
                        .sourceAccountNumber(sourceAcc)
                        .destinationAccountNumber(transaction.getDestinationAccount() != null ? transaction.getDestinationAccount().getAccountNumber() : "")
                        .build();

                notificationWebSocketHandler.sendNotification(customerManaged.getCustomerId().toString(), dto);
                log.info("Reversal notification #{} saved and pushed via WebSocket for customer: {}, Ref: {}",
                        saved.getNotificationId(), customerManaged.getCustomerId(), ref);
            }
        } catch (Exception e) {
            log.error("Failed to record and dispatch reversal notification for transaction: {}",
                    transaction != null ? transaction.getTransactionRef() : "unknown", e);
        }
    }
}
