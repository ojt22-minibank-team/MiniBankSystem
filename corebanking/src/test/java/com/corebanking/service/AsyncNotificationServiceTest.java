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
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AsyncNotificationServiceTest {

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

    @InjectMocks
    private AsyncNotificationService asyncNotificationService;

    private Customers customer;
    private Accounts account;
    private BankTransactions transaction;
    private final UUID customerId = UUID.randomUUID();
    private final UUID txnId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        customer = Customers.builder()
                .customerId(customerId)
                .fullName("U Aung")
                .build();

        account = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("2000000001")
                .customer(customer)
                .build();

        transaction = BankTransactions.builder()
                .transactionId(txnId)
                .transactionRef("TXN-OTC-DEP-12345")
                .amount(new BigDecimal("50000.00"))
                .currency("MMK")
                .destinationAccount(account)
                .sourceAccount(account)
                .build();
    }

    @Test
    @DisplayName("sendDepositNotificationAsync - should save notification and push via websocket")
    void sendDepositNotificationAsync_Success() {
        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(bankTransactionRepository.findById(txnId)).thenReturn(Optional.of(transaction));

        Notifications mockSaved = Notifications.builder()
                .notificationId(101L)
                .notificationType(NotificationType.TRANSFER)
                .title("Deposit Successful")
                .message("Cash deposit of 50000.00 MMK to account 2000000001 was successful. Ref: TXN-OTC-DEP-12345")
                .createdAt(LocalDateTime.now())
                .build();
        when(notificationRepository.save(any(Notifications.class))).thenReturn(mockSaved);

        asyncNotificationService.sendDepositNotificationAsync(customer, account, transaction);

        ArgumentCaptor<Notifications> notifCaptor = ArgumentCaptor.forClass(Notifications.class);
        verify(notificationRepository).save(notifCaptor.capture());
        Notifications captured = notifCaptor.getValue();
        assertEquals("Deposit Successful", captured.getTitle());
        assertTrue(captured.getMessage().contains("Cash deposit of 50000.00 MMK"));
        assertEquals(customer, captured.getCustomer());

        ArgumentCaptor<NotificationResponseDto> dtoCaptor = ArgumentCaptor.forClass(NotificationResponseDto.class);
        verify(notificationWebSocketHandler).sendNotification(eq(customerId.toString()), dtoCaptor.capture());
        NotificationResponseDto sentDto = dtoCaptor.getValue();
        assertEquals("Deposit Successful", sentDto.getTitle());
        assertEquals("RECEIVED", sentDto.getTransferDirection());
        assertEquals("Bank Counter", sentDto.getCounterpartyName());
    }

    @Test
    @DisplayName("sendWithdrawalNotificationAsync - should save notification and push with transferDirection SENT")
    void sendWithdrawalNotificationAsync_Success() {
        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        when(bankTransactionRepository.findById(txnId)).thenReturn(Optional.of(transaction));

        Notifications mockSaved = Notifications.builder()
                .notificationId(102L)
                .notificationType(NotificationType.TRANSFER)
                .title("Withdrawal Successful")
                .message("Cash withdrawal of 50000.00 MMK from account 2000000001 was successful. Ref: TXN-OTC-DEP-12345")
                .createdAt(LocalDateTime.now())
                .build();
        when(notificationRepository.save(any(Notifications.class))).thenReturn(mockSaved);

        asyncNotificationService.sendWithdrawalNotificationAsync(customer, account, transaction);

        ArgumentCaptor<Notifications> notifCaptor = ArgumentCaptor.forClass(Notifications.class);
        verify(notificationRepository).save(notifCaptor.capture());
        assertEquals("Withdrawal Successful", notifCaptor.getValue().getTitle());

        ArgumentCaptor<NotificationResponseDto> dtoCaptor = ArgumentCaptor.forClass(NotificationResponseDto.class);
        verify(notificationWebSocketHandler).sendNotification(eq(customerId.toString()), dtoCaptor.capture());
        assertEquals("SENT", dtoCaptor.getValue().getTransferDirection());
        assertEquals("Bank Counter", dtoCaptor.getValue().getCounterpartyName());
    }

    @Test
    @DisplayName("sendMerchantPaymentNotificationAsync - should notify both payer and merchant")
    void sendMerchantPaymentNotificationAsync_Success() {
        UUID payerId = UUID.randomUUID();
        Customers payer = Customers.builder().customerId(payerId).fullName("Daw Hla").build();

        UUID merchantCustomerId = UUID.randomUUID();
        Customers merchantCust = Customers.builder().customerId(merchantCustomerId).fullName("Shop A").build();
        Accounts merchantAccount = Accounts.builder().accountNumber("9000000001").customer(merchantCust).build();

        when(customerRepository.findById(payerId)).thenReturn(Optional.of(payer));
        when(accountRepository.findByAccountNumber("9000000001")).thenReturn(Optional.of(merchantAccount));
        when(customerRepository.findById(merchantCustomerId)).thenReturn(Optional.of(merchantCust));

        Notifications savedPayerNotif = Notifications.builder().notificationId(201L).title("Payment Sent").build();
        Notifications savedMerchantNotif = Notifications.builder().notificationId(202L).title("Payment Received").build();

        when(notificationRepository.save(any(Notifications.class)))
                .thenReturn(savedPayerNotif)
                .thenReturn(savedMerchantNotif);

        asyncNotificationService.sendMerchantPaymentNotificationAsync(
                payerId, "2000000001", "9000000001", "Shop A", "ORD-123",
                new BigDecimal("25000.00"), "MMK", "TXN-MERCHANT-999"
        );

        verify(notificationRepository, times(2)).save(any(Notifications.class));
        verify(notificationWebSocketHandler).sendNotification(eq(payerId.toString()), any(NotificationResponseDto.class));
        verify(notificationWebSocketHandler).sendNotification(eq(merchantCustomerId.toString()), any(NotificationResponseDto.class));
    }

    @Test
    @DisplayName("sendFailedTransferNotificationAsync - should save notification and push failure details")
    void sendFailedTransferNotificationAsync_Success() {
        when(customerRepository.findById(customerId)).thenReturn(Optional.of(customer));
        Notifications mockSaved = Notifications.builder()
                .notificationId(103L)
                .notificationType(NotificationType.TRANSFER)
                .title("Transfer Failed")
                .message("Transfer of 10000 MMK to account 2000000002 failed: Insufficient funds")
                .build();
        when(notificationRepository.save(any(Notifications.class))).thenReturn(mockSaved);

        asyncNotificationService.sendFailedTransferNotificationAsync(
                customer, "2000000002", new BigDecimal("10000"), "MMK", "Insufficient funds"
        );

        verify(notificationRepository).save(any(Notifications.class));
        verify(notificationWebSocketHandler).sendNotification(eq(customerId.toString()), any(NotificationResponseDto.class));
    }

    @Test
    @DisplayName("sendDepositNotificationAsync - null customer or transaction does nothing safely")
    void sendDepositNotificationAsync_NullCustomerOrTxn() {
        asyncNotificationService.sendDepositNotificationAsync(null, account, transaction);
        asyncNotificationService.sendDepositNotificationAsync(customer, account, null);

        verifyNoInteractions(notificationRepository);
        verifyNoInteractions(notificationWebSocketHandler);
    }
}
