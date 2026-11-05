package com.corebanking.service;

import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.Notifications;
import com.corebanking.entity.enums.NotificationType;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
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
class CusNotificationServiceTest {

    @Mock
    private NotificationRepository notificationRepository;

    @InjectMocks
    private CusNotificationService cusNotificationService;

    private UUID customerId;
    private UUID counterpartyId;
    private Customers customer;
    private Customers counterparty;
    private Accounts sourceAccount;
    private Accounts destAccount;

    @BeforeEach
    void setUp() {
        customerId = UUID.randomUUID();
        counterpartyId = UUID.randomUUID();

        customer = Customers.builder()
                .customerId(customerId)
                .fullName("U Ba")
                .build();

        counterparty = Customers.builder()
                .customerId(counterpartyId)
                .fullName("Daw Mya")
                .build();

        sourceAccount = Accounts.builder()
                .accountNumber("2001111111")
                .customer(customer)
                .build();

        destAccount = Accounts.builder()
                .accountNumber("2002222222")
                .customer(counterparty)
                .build();
    }

    @Test
    @DisplayName("getMyNotifications - Sender transfer mapping sets SENT direction and recipient counterparty")
    void testGetMyNotifications_SenderMapping() {
        BankTransactions txn = BankTransactions.builder()
                .transactionId(UUID.randomUUID())
                .transactionRef("TXN-P2P-101")
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .amount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .sourceAccount(sourceAccount)
                .destinationAccount(destAccount)
                .description("Gift")
                .build();

        Notifications notif = Notifications.builder()
                .notificationId(1L)
                .customer(customer)
                .transaction(txn)
                .notificationType(NotificationType.TRANSFER)
                .title("Transfer Sent")
                .message("You have transferred 50000.0000 MMK to Daw Mya (2002222222). Ref: TXN-P2P-101")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        when(notificationRepository.findTop30ByCustomer_CustomerIdOrderByCreatedAtDesc(customerId))
                .thenReturn(List.of(notif));

        List<NotificationResponseDto> result = cusNotificationService.getMyNotifications(customerId.toString());

        assertEquals(1, result.size());
        NotificationResponseDto dto = result.get(0);
        assertEquals(1L, dto.getNotificationId());
        assertEquals("SENT", dto.getTransferDirection());
        assertEquals("Daw Mya", dto.getCounterpartyName());
        assertEquals("2002222222", dto.getCounterpartyAccountNumber());
        assertEquals(new BigDecimal("50000.0000"), dto.getAmount());
        assertEquals("MMK", dto.getCurrency());
        assertEquals("TXN-P2P-101", dto.getTransactionRef());
        assertEquals("Gift", dto.getDescription());
    }

    @Test
    @DisplayName("getMyNotifications - Receiver transfer mapping sets RECEIVED direction and sender counterparty")
    void testGetMyNotifications_ReceiverMapping() {
        BankTransactions txn = BankTransactions.builder()
                .transactionId(UUID.randomUUID())
                .transactionRef("TXN-P2P-102")
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .amount(new BigDecimal("75000.0000"))
                .currency("MMK")
                .sourceAccount(destAccount) // Source is Daw Mya
                .destinationAccount(sourceAccount) // Destination is U Ba (customer)
                .build();

        Notifications notif = Notifications.builder()
                .notificationId(2L)
                .customer(customer)
                .transaction(txn)
                .notificationType(NotificationType.TRANSFER)
                .title("Funds Received")
                .message("You received 75000.0000 MMK from Daw Mya (2002222222). Ref: TXN-P2P-102")
                .isRead(true)
                .createdAt(LocalDateTime.now())
                .build();

        when(notificationRepository.findTop30ByCustomer_CustomerIdOrderByCreatedAtDesc(customerId))
                .thenReturn(List.of(notif));

        List<NotificationResponseDto> result = cusNotificationService.getMyNotifications(customerId.toString());

        assertEquals(1, result.size());
        NotificationResponseDto dto = result.get(0);
        assertEquals("RECEIVED", dto.getTransferDirection());
        assertEquals("Daw Mya", dto.getCounterpartyName());
        assertEquals("2002222222", dto.getCounterpartyAccountNumber());
        assertEquals(new BigDecimal("75000.0000"), dto.getAmount());
        assertTrue(dto.isRead());
    }

    @Test
    @DisplayName("getMyNotifications - Self-transfer sets SENT direction when title does not contain 'received'")
    void testGetMyNotifications_SelfTransfer_Sent() {
        Accounts ownSecondAccount = Accounts.builder()
                .accountNumber("2009999999")
                .customer(customer)
                .build();

        BankTransactions txn = BankTransactions.builder()
                .transactionId(UUID.randomUUID())
                .transactionRef("TXN-SELF-101")
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .amount(new BigDecimal("20000.0000"))
                .currency("MMK")
                .sourceAccount(sourceAccount)
                .destinationAccount(ownSecondAccount)
                .build();

        Notifications notif = Notifications.builder()
                .notificationId(3L)
                .customer(customer)
                .transaction(txn)
                .notificationType(NotificationType.TRANSFER)
                .title("Transfer Sent")
                .message("You have transferred 20000.0000 MMK to your account 2009999999. Ref: TXN-SELF-101")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        when(notificationRepository.findTop30ByCustomer_CustomerIdOrderByCreatedAtDesc(customerId))
                .thenReturn(List.of(notif));

        List<NotificationResponseDto> result = cusNotificationService.getMyNotifications(customerId.toString());

        assertEquals(1, result.size());
        NotificationResponseDto dto = result.get(0);
        assertEquals("SENT", dto.getTransferDirection());
        assertEquals("2009999999", dto.getCounterpartyAccountNumber());
    }

    @Test
    @DisplayName("getMyNotifications - Self-transfer sets RECEIVED direction when title contains 'received'")
    void testGetMyNotifications_SelfTransfer_Received() {
        Accounts ownSecondAccount = Accounts.builder()
                .accountNumber("2009999999")
                .customer(customer)
                .build();

        BankTransactions txn = BankTransactions.builder()
                .transactionId(UUID.randomUUID())
                .transactionRef("TXN-SELF-102")
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .amount(new BigDecimal("20000.0000"))
                .currency("MMK")
                .sourceAccount(ownSecondAccount)
                .destinationAccount(sourceAccount)
                .build();

        Notifications notif = Notifications.builder()
                .notificationId(4L)
                .customer(customer)
                .transaction(txn)
                .notificationType(NotificationType.TRANSFER)
                .title("Funds Received")
                .message("You received 20000.0000 MMK from your account 2009999999. Ref: TXN-SELF-102")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        when(notificationRepository.findTop30ByCustomer_CustomerIdOrderByCreatedAtDesc(customerId))
                .thenReturn(List.of(notif));

        List<NotificationResponseDto> result = cusNotificationService.getMyNotifications(customerId.toString());

        assertEquals(1, result.size());
        NotificationResponseDto dto = result.get(0);
        assertEquals("RECEIVED", dto.getTransferDirection());
        assertEquals("2009999999", dto.getCounterpartyAccountNumber());
    }

    @Test
    @DisplayName("getMyNotifications - System notification without transaction maps basic details")
    void testGetMyNotifications_SystemNotification() {
        Notifications notif = Notifications.builder()
                .notificationId(5L)
                .customer(customer)
                .transaction(null)
                .notificationType(NotificationType.SYSTEM)
                .title("Scheduled Maintenance")
                .message("Banking services will be temporarily paused on Sunday 2:00 AM.")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        when(notificationRepository.findTop30ByCustomer_CustomerIdOrderByCreatedAtDesc(customerId))
                .thenReturn(List.of(notif));

        List<NotificationResponseDto> result = cusNotificationService.getMyNotifications(customerId.toString());

        assertEquals(1, result.size());
        NotificationResponseDto dto = result.get(0);
        assertEquals(5L, dto.getNotificationId());
        assertEquals(NotificationType.SYSTEM, dto.getNotificationType());
        assertEquals("Scheduled Maintenance", dto.getTitle());
        assertNull(dto.getTransactionRef());
        assertNull(dto.getAmount());
    }

    @Test
    @DisplayName("getMyNotifications - Fallback regex extracts details when transaction entity is null (detached)")
    void testGetMyNotifications_FallbackRegexParsing() {
        // 1. Sent transfer fallback
        Notifications sentFallback = Notifications.builder()
                .notificationId(10L)
                .customer(customer)
                .transaction(null)
                .notificationType(NotificationType.TRANSFER)
                .title("Transfer Sent")
                .message("You have transferred 65000.0000 MMK to Daw Mya (2002222222). Ref: TXN-REF-9988")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        // 2. Received transfer fallback
        Notifications receivedFallback = Notifications.builder()
                .notificationId(11L)
                .customer(customer)
                .transaction(null)
                .notificationType(NotificationType.TRANSFER)
                .title("Funds Received")
                .message("You received 40000.0000 MMK from Ko Phyo (2003333333). Ref: TXN-REF-7711")
                .isRead(true)
                .createdAt(LocalDateTime.now())
                .build();

        when(notificationRepository.findTop30ByCustomer_CustomerIdOrderByCreatedAtDesc(customerId))
                .thenReturn(List.of(sentFallback, receivedFallback));

        List<NotificationResponseDto> result = cusNotificationService.getMyNotifications(customerId.toString());

        assertEquals(2, result.size());

        NotificationResponseDto sentDto = result.get(0);
        assertEquals("SENT", sentDto.getTransferDirection());
        assertEquals(new BigDecimal("65000.0000"), sentDto.getAmount());
        assertEquals("MMK", sentDto.getCurrency());
        assertEquals("TXN-REF-9988", sentDto.getTransactionRef());
        assertEquals("Daw Mya", sentDto.getCounterpartyName());
        assertEquals("2002222222", sentDto.getCounterpartyAccountNumber());
        assertEquals("2002222222", sentDto.getDestinationAccountNumber());

        NotificationResponseDto receivedDto = result.get(1);
        assertEquals("RECEIVED", receivedDto.getTransferDirection());
        assertEquals(new BigDecimal("40000.0000"), receivedDto.getAmount());
        assertEquals("MMK", receivedDto.getCurrency());
        assertEquals("TXN-REF-7711", receivedDto.getTransactionRef());
        assertEquals("Ko Phyo", receivedDto.getCounterpartyName());
        assertEquals("2003333333", receivedDto.getCounterpartyAccountNumber());
        assertEquals("2003333333", receivedDto.getSourceAccountNumber());
    }

    @Test
    @DisplayName("getMyNotifications - Fallback to 'Account <number>' when counterparty customer has null name")
    void testGetMyNotifications_CounterpartyNameFallback() {
        Customers unnamedCustomer = Customers.builder()
                .customerId(UUID.randomUUID())
                .fullName(null)
                .build();

        Accounts unnamedDest = Accounts.builder()
                .accountNumber("2008888888")
                .customer(unnamedCustomer)
                .build();

        BankTransactions txn = BankTransactions.builder()
                .transactionId(UUID.randomUUID())
                .transactionRef("TXN-P2P-103")
                .amount(new BigDecimal("10000.0000"))
                .currency("MMK")
                .sourceAccount(sourceAccount)
                .destinationAccount(unnamedDest)
                .build();

        Notifications notif = Notifications.builder()
                .notificationId(6L)
                .customer(customer)
                .transaction(txn)
                .notificationType(NotificationType.TRANSFER)
                .title("Transfer Sent")
                .message("You have transferred 10000.0000 MMK to Account 2008888888. Ref: TXN-P2P-103")
                .build();

        when(notificationRepository.findTop30ByCustomer_CustomerIdOrderByCreatedAtDesc(customerId))
                .thenReturn(List.of(notif));

        List<NotificationResponseDto> result = cusNotificationService.getMyNotifications(customerId.toString());

        assertEquals(1, result.size());
        assertEquals("Account 2008888888", result.get(0).getCounterpartyName());
    }

    @Test
    @DisplayName("getUnreadCount - Returns total unread count from repository")
    void testGetUnreadCount() {
        when(notificationRepository.countByCustomer_CustomerIdAndIsReadFalse(customerId))
                .thenReturn(7L);

        long count = cusNotificationService.getUnreadCount(customerId.toString());

        assertEquals(7L, count);
        verify(notificationRepository, times(1)).countByCustomer_CustomerIdAndIsReadFalse(customerId);
    }

    @Test
    @DisplayName("markAsRead - Successfully updates notification to read when found")
    void testMarkAsRead_Success() {
        Notifications notif = Notifications.builder()
                .notificationId(20L)
                .customer(customer)
                .isRead(false)
                .readAt(null)
                .build();

        when(notificationRepository.findByNotificationIdAndCustomer_CustomerId(20L, customerId))
                .thenReturn(Optional.of(notif));

        boolean updated = cusNotificationService.markAsRead(customerId.toString(), 20L);

        assertTrue(updated);
        assertTrue(notif.isRead());
        assertNotNull(notif.getReadAt());
        verify(notificationRepository, times(1)).save(notif);
    }

    @Test
    @DisplayName("markAsRead - Returns false when notification does not exist or customer does not match")
    void testMarkAsRead_NotFound() {
        when(notificationRepository.findByNotificationIdAndCustomer_CustomerId(999L, customerId))
                .thenReturn(Optional.empty());

        boolean updated = cusNotificationService.markAsRead(customerId.toString(), 999L);

        assertFalse(updated);
        verify(notificationRepository, never()).save(any());
    }

    @Test
    @DisplayName("markAllAsRead - Calls repository and returns updated count")
    void testMarkAllAsRead() {
        ArgumentCaptor<LocalDateTime> timeCaptor = ArgumentCaptor.forClass(LocalDateTime.now().getClass());
        when(notificationRepository.markAllAsRead(eq(customerId), any(LocalDateTime.class)))
                .thenReturn(3);

        int updatedCount = cusNotificationService.markAllAsRead(customerId.toString());

        assertEquals(3, updatedCount);
        verify(notificationRepository, times(1)).markAllAsRead(eq(customerId), any(LocalDateTime.class));
    }
}
