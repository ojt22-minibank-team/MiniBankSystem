package com.corebanking.service;

import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.Notifications;
import com.corebanking.entity.enums.NotificationType;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.BankTransactionRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.NotificationRepository;
import com.corebanking.websocket.NotificationWebSocketHandler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class TransferNotificationVerificationTest {

    @Mock
    private NotificationRepository notificationRepository;

    @Mock
    private NotificationWebSocketHandler notificationWebSocketHandler;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private BankTransactionRepository bankTransactionRepository;

    @Mock
    private AccountRepository accountRepository;

    private AsyncNotificationService asyncNotificationService;

    private Customers sender;
    private Customers receiver;
    private Accounts sourceAccount;
    private Accounts destAccount;
    private BankTransactions transaction;

    private final UUID senderId = UUID.randomUUID();
    private final UUID receiverId = UUID.randomUUID();
    private final UUID txnId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        asyncNotificationService = new AsyncNotificationService(
                notificationRepository,
                notificationWebSocketHandler,
                customerRepository,
                bankTransactionRepository,
                accountRepository
        );

        sender = Customers.builder()
                .customerId(senderId)
                .fullName("U Ba")
                .build();

        receiver = Customers.builder()
                .customerId(receiverId)
                .fullName("Daw Mya")
                .build();

        sourceAccount = Accounts.builder()
                .accountNumber("2001111111")
                .customer(sender)
                .build();

        destAccount = Accounts.builder()
                .accountNumber("2002222222")
                .customer(receiver)
                .build();

        transaction = BankTransactions.builder()
                .transactionId(txnId)
                .transactionRef("TXN-P2P-20261021-0001")
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .sourceAccount(sourceAccount)
                .destinationAccount(destAccount)
                .amount(new BigDecimal("50000.0000"))
                .serviceFee(BigDecimal.ZERO)
                .currency("MMK")
                .completedAt(LocalDateTime.now())
                .build();

        lenient().when(customerRepository.findById(senderId)).thenReturn(Optional.of(sender));
        lenient().when(customerRepository.findById(receiverId)).thenReturn(Optional.of(receiver));
        lenient().when(bankTransactionRepository.findById(txnId)).thenReturn(Optional.of(transaction));

        lenient().when(notificationRepository.save(any(Notifications.class))).thenAnswer(invocation -> {
            Notifications notif = invocation.getArgument(0);
            return Notifications.builder()
                    .notificationId(101L)
                    .customer(notif.getCustomer())
                    .transaction(notif.getTransaction())
                    .notificationType(notif.getNotificationType())
                    .title(notif.getTitle())
                    .message(notif.getMessage())
                    .createdAt(LocalDateTime.now())
                    .build();
        });
    }

    @Test
    @DisplayName("Verify that both Sender and Receiver notifications are saved and pushed via WebSocket")
    void testBothSenderAndReceiverNotificationsCreated() {
        // Execute notification dispatch
        asyncNotificationService.sendTransferNotificationsAsync(sender, receiver, transaction);

        // 1. Verify two notification rows are persisted in DB
        ArgumentCaptor<Notifications> notiCaptor = ArgumentCaptor.forClass(Notifications.class);
        verify(notificationRepository, times(2)).save(notiCaptor.capture());

        List<Notifications> savedNotifications = notiCaptor.getAllValues();
        assertEquals(2, savedNotifications.size(), "Should save exactly 2 notifications (1 sender, 1 receiver)");

        // Sender notification assertions
        Notifications senderNotif = savedNotifications.get(0);
        assertEquals(senderId, senderNotif.getCustomer().getCustomerId());
        assertEquals("Transfer Sent", senderNotif.getTitle());
        assertEquals(NotificationType.TRANSFER, senderNotif.getNotificationType());
        assertTrue(senderNotif.getMessage().contains("You have transferred"));
        assertTrue(senderNotif.getMessage().contains("50000.0000 MMK"));
        assertTrue(senderNotif.getMessage().contains("Daw Mya"));

        // Receiver notification assertions
        Notifications receiverNotif = savedNotifications.get(1);
        assertEquals(receiverId, receiverNotif.getCustomer().getCustomerId());
        assertEquals("Funds Received", receiverNotif.getTitle());
        assertEquals(NotificationType.TRANSFER, receiverNotif.getNotificationType());
        assertTrue(receiverNotif.getMessage().contains("You received"));
        assertTrue(receiverNotif.getMessage().contains("50000.0000 MMK"));
        assertTrue(receiverNotif.getMessage().contains("U Ba"));

        // 2. Verify WebSocket pushes were called for both customers
        ArgumentCaptor<NotificationResponseDto> wsDtoCaptor = ArgumentCaptor.forClass(NotificationResponseDto.class);

        verify(notificationWebSocketHandler).sendNotification(eq(senderId.toString()), wsDtoCaptor.capture());
        NotificationResponseDto senderWsDto = wsDtoCaptor.getValue();
        assertEquals("SENT", senderWsDto.getTransferDirection());
        assertEquals("Transfer Sent", senderWsDto.getTitle());
        assertEquals("Daw Mya", senderWsDto.getCounterpartyName());
        assertEquals("2002222222", senderWsDto.getCounterpartyAccountNumber());

        verify(notificationWebSocketHandler).sendNotification(eq(receiverId.toString()), wsDtoCaptor.capture());
        NotificationResponseDto receiverWsDto = wsDtoCaptor.getValue();
        assertEquals("RECEIVED", receiverWsDto.getTransferDirection());
        assertEquals("Funds Received", receiverWsDto.getTitle());
        assertEquals("U Ba", receiverWsDto.getCounterpartyName());
        assertEquals("2001111111", receiverWsDto.getCounterpartyAccountNumber());
    }

    @Test
    @DisplayName("Verify Merchant Payment notifications are saved and pushed via WebSocket to both Payer and Merchant")
    void testMerchantPaymentNotificationsCreated() {
        when(customerRepository.findById(senderId)).thenReturn(Optional.of(sender));
        when(accountRepository.findByAccountNumber("2002222222")).thenReturn(Optional.of(destAccount));
        when(customerRepository.findById(receiverId)).thenReturn(Optional.of(receiver));

        asyncNotificationService.sendMerchantPaymentNotificationAsync(
                senderId,
                "2001111111",
                "2002222222",
                "City Mart Supermarket",
                "ORD-9988",
                new BigDecimal("35000.0000"),
                "MMK",
                "TXN-ECOM-20261022-0001"
        );

        ArgumentCaptor<Notifications> notiCaptor = ArgumentCaptor.forClass(Notifications.class);
        verify(notificationRepository, times(2)).save(notiCaptor.capture());

        List<Notifications> savedNotifications = notiCaptor.getAllValues();
        assertEquals(2, savedNotifications.size(), "Should save exactly 2 notifications (Payer & Merchant)");

        // Payer notification assertions
        Notifications payerNotif = savedNotifications.get(0);
        assertEquals(senderId, payerNotif.getCustomer().getCustomerId());
        assertEquals("Payment Sent", payerNotif.getTitle());
        assertEquals(NotificationType.PAYMENT, payerNotif.getNotificationType());
        assertTrue(payerNotif.getMessage().contains("You paid 35000.0000 MMK to City Mart Supermarket"));
        assertTrue(payerNotif.getMessage().contains("ORD-9988"));

        // Merchant notification assertions
        Notifications merchantNotif = savedNotifications.get(1);
        assertEquals(receiverId, merchantNotif.getCustomer().getCustomerId());
        assertEquals("Merchant Payment Received", merchantNotif.getTitle());
        assertEquals(NotificationType.PAYMENT, merchantNotif.getNotificationType());
        assertTrue(merchantNotif.getMessage().contains("You received 35000.0000 MMK from U Ba"));
        assertTrue(merchantNotif.getMessage().contains("ORD-9988"));

        // WebSocket assertions
        ArgumentCaptor<NotificationResponseDto> wsDtoCaptor = ArgumentCaptor.forClass(NotificationResponseDto.class);
        verify(notificationWebSocketHandler).sendNotification(eq(senderId.toString()), wsDtoCaptor.capture());
        NotificationResponseDto payerWs = wsDtoCaptor.getValue();
        assertEquals(NotificationType.PAYMENT, payerWs.getNotificationType());
        assertEquals("SENT", payerWs.getTransferDirection());
        assertEquals("Payment Sent", payerWs.getTitle());
        assertEquals("City Mart Supermarket", payerWs.getCounterpartyName());

        verify(notificationWebSocketHandler).sendNotification(eq(receiverId.toString()), wsDtoCaptor.capture());
        NotificationResponseDto merchantWs = wsDtoCaptor.getValue();
        assertEquals(NotificationType.PAYMENT, merchantWs.getNotificationType());
        assertEquals("RECEIVED", merchantWs.getTransferDirection());
        assertEquals("Merchant Payment Received", merchantWs.getTitle());
        assertEquals("U Ba", merchantWs.getCounterpartyName());
    }

    @Test
    @DisplayName("Verify that CusNotificationService HTTP mapping retains all details for payment notifications")
    void testHttpNotificationMappingRetainsDetails() {
        CusNotificationService cusNotificationService = new CusNotificationService(notificationRepository);

        Notifications payerNotif = Notifications.builder()
                .notificationId(201L)
                .customer(sender)
                .notificationType(NotificationType.PAYMENT)
                .title("Payment Sent")
                .message("You paid 45000.0000 MMK to Ocean Supercenter for Order #ORD-5544. Ref: TXN-ECOM-9900")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        when(notificationRepository.findTop30ByCustomer_CustomerIdOrderByCreatedAtDesc(senderId))
                .thenReturn(List.of(payerNotif));

        List<NotificationResponseDto> result = cusNotificationService.getMyNotifications(senderId.toString());
        assertEquals(1, result.size());

        NotificationResponseDto dto = result.get(0);
        assertEquals("SENT", dto.getTransferDirection());
        assertEquals(new BigDecimal("45000.0000"), dto.getAmount());
        assertEquals("MMK", dto.getCurrency());
        assertEquals("Ocean Supercenter", dto.getCounterpartyName());
        assertEquals("TXN-ECOM-9900", dto.getTransactionRef());
    }

    @Test
    @DisplayName("Verify Failed Transfer notification is saved in DB and pushed via WebSocket")
    void testFailedTransferNotificationCreatedAndPushed() {
        asyncNotificationService.sendFailedTransferNotificationAsync(
                sender,
                "2002222222",
                new BigDecimal("10000.0000"),
                "MMK",
                "Insufficient balance"
        );

        ArgumentCaptor<Notifications> notiCaptor = ArgumentCaptor.forClass(Notifications.class);
        verify(notificationRepository).save(notiCaptor.capture());

        Notifications saved = notiCaptor.getValue();
        assertEquals(senderId, saved.getCustomer().getCustomerId());
        assertEquals("Transfer Failed", saved.getTitle());
        assertEquals(NotificationType.TRANSFER, saved.getNotificationType());
        assertTrue(saved.getMessage().contains("Transfer of 10000.0000 MMK to account 2002222222 failed: Insufficient balance"));

        ArgumentCaptor<NotificationResponseDto> wsCaptor = ArgumentCaptor.forClass(NotificationResponseDto.class);
        verify(notificationWebSocketHandler).sendNotification(eq(senderId.toString()), wsCaptor.capture());

        NotificationResponseDto wsDto = wsCaptor.getValue();
        assertEquals("Transfer Failed", wsDto.getTitle());
        assertEquals(new BigDecimal("10000.0000"), wsDto.getAmount());
        assertEquals("MMK", wsDto.getCurrency());
        assertFalse(wsDto.isRead());
    }

    @Test
    @DisplayName("Verify Failed Transfer notification uses fallback defaults when optional arguments are null")
    void testFailedTransferNotification_FallbackDefaultsWhenArgumentsNull() {
        asyncNotificationService.sendFailedTransferNotificationAsync(
                sender,
                null,
                null,
                null,
                null
        );

        ArgumentCaptor<Notifications> notiCaptor = ArgumentCaptor.forClass(Notifications.class);
        verify(notificationRepository).save(notiCaptor.capture());

        Notifications saved = notiCaptor.getValue();
        assertTrue(saved.getMessage().contains("Transfer of 0 MMK to account N/A failed: Transaction rejected"));

        ArgumentCaptor<NotificationResponseDto> wsCaptor = ArgumentCaptor.forClass(NotificationResponseDto.class);
        verify(notificationWebSocketHandler).sendNotification(eq(senderId.toString()), wsCaptor.capture());

        NotificationResponseDto wsDto = wsCaptor.getValue();
        assertEquals("Transfer Failed", wsDto.getTitle());
        assertEquals("MMK", wsDto.getCurrency());
    }

    @Test
    @DisplayName("Verify Transfer Reversal notification is saved in DB and pushed via WebSocket with REFUND direction")
    void testReversalNotificationCreatedAndPushed() {
        asyncNotificationService.sendReversalNotificationAsync(sender, transaction, "Service timeout");

        ArgumentCaptor<Notifications> notiCaptor = ArgumentCaptor.forClass(Notifications.class);
        verify(notificationRepository).save(notiCaptor.capture());

        Notifications saved = notiCaptor.getValue();
        assertEquals(senderId, saved.getCustomer().getCustomerId());
        assertEquals("Transfer Auto-Reversed & Refunded", saved.getTitle());
        assertEquals(NotificationType.TRANSFER, saved.getNotificationType());
        assertTrue(saved.getMessage().contains("could not be completed and has been automatically refunded to account 2001111111"));
        assertTrue(saved.getMessage().contains("Reason: Service timeout"));
        assertTrue(saved.getMessage().contains("50000.0000 MMK"));

        ArgumentCaptor<NotificationResponseDto> wsCaptor = ArgumentCaptor.forClass(NotificationResponseDto.class);
        verify(notificationWebSocketHandler).sendNotification(eq(senderId.toString()), wsCaptor.capture());

        NotificationResponseDto wsDto = wsCaptor.getValue();
        assertEquals("REFUND", wsDto.getTransferDirection());
        assertEquals("TXN-P2P-20261021-0001", wsDto.getTransactionRef());
        assertEquals(new BigDecimal("50000.0000"), wsDto.getAmount());
        assertEquals("2001111111", wsDto.getSourceAccountNumber());
    }

    @Test
    @DisplayName("Verify Deposit notification is saved in DB and pushed via WebSocket with Bank Counter counterparty")
    void testDepositNotificationCreatedAndPushed() {
        asyncNotificationService.sendDepositNotificationAsync(receiver, destAccount, transaction);

        ArgumentCaptor<Notifications> notiCaptor = ArgumentCaptor.forClass(Notifications.class);
        verify(notificationRepository).save(notiCaptor.capture());

        Notifications saved = notiCaptor.getValue();
        assertEquals(receiverId, saved.getCustomer().getCustomerId());
        assertEquals("Funds Received", saved.getTitle());
        assertTrue(saved.getMessage().contains("You received 50000.0000 MMK via Bank Counter Deposit to account 2002222222"));

        ArgumentCaptor<NotificationResponseDto> wsCaptor = ArgumentCaptor.forClass(NotificationResponseDto.class);
        verify(notificationWebSocketHandler).sendNotification(eq(receiverId.toString()), wsCaptor.capture());

        NotificationResponseDto wsDto = wsCaptor.getValue();
        assertEquals("RECEIVED", wsDto.getTransferDirection());
        assertEquals("Bank Counter", wsDto.getCounterpartyName());
        assertEquals("BANK-OTC", wsDto.getCounterpartyAccountNumber());
        assertEquals("2002222222", wsDto.getDestinationAccountNumber());
    }

    @Test
    @DisplayName("Verify Withdrawal notification is saved in DB and pushed via WebSocket with Bank Counter counterparty")
    void testWithdrawalNotificationCreatedAndPushed() {
        asyncNotificationService.sendWithdrawalNotificationAsync(sender, sourceAccount, transaction);

        ArgumentCaptor<Notifications> notiCaptor = ArgumentCaptor.forClass(Notifications.class);
        verify(notificationRepository).save(notiCaptor.capture());

        Notifications saved = notiCaptor.getValue();
        assertEquals(senderId, saved.getCustomer().getCustomerId());
        assertEquals("Transfer Sent", saved.getTitle());
        assertTrue(saved.getMessage().contains("You have withdrawn 50000.0000 MMK via Bank Counter from account 2001111111"));

        ArgumentCaptor<NotificationResponseDto> wsCaptor = ArgumentCaptor.forClass(NotificationResponseDto.class);
        verify(notificationWebSocketHandler).sendNotification(eq(senderId.toString()), wsCaptor.capture());

        NotificationResponseDto wsDto = wsCaptor.getValue();
        assertEquals("SENT", wsDto.getTransferDirection());
        assertEquals("Bank Counter", wsDto.getCounterpartyName());
        assertEquals("BANK-OTC", wsDto.getCounterpartyAccountNumber());
        assertEquals("2001111111", wsDto.getSourceAccountNumber());
    }

    @Test
    @DisplayName("Verify AsyncNotificationService null safety does not throw exceptions")
    void testAsyncNotificationNullSafety() {
        assertDoesNotThrow(() -> asyncNotificationService.sendDepositNotificationAsync(null, null, null));
        assertDoesNotThrow(() -> asyncNotificationService.sendWithdrawalNotificationAsync(null, null, null));
        assertDoesNotThrow(() -> asyncNotificationService.sendTransferNotificationsAsync(null, null, null));
        assertDoesNotThrow(() -> asyncNotificationService.sendReversalNotificationAsync(null, null, null));
        assertDoesNotThrow(() -> asyncNotificationService.sendFailedTransferNotificationAsync(null, null, null, null, null));
    }
}
