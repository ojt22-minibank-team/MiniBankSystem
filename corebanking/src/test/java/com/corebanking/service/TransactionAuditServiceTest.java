package com.corebanking.service;

import com.corebanking.dto.EcommercePaymentRequestDto;
import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.InitiatedByType;
import com.corebanking.entity.enums.TransactionChannel;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.BankTransactionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransactionAuditServiceTest {

    @Mock
    private BankTransactionRepository bankTransactionRepository;

    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private TransactionAuditService transactionAuditService;

    private Customers customer;
    private Accounts sourceAccount;
    private Accounts destAccount;

    @BeforeEach
    void setUp() {
        customer = Customers.builder()
                .customerId(UUID.randomUUID())
                .fullName("Ko Aye")
                .build();

        sourceAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("2000000001")
                .customer(customer)
                .build();

        destAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("2000000002")
                .build();
    }

    @Test
    @DisplayName("recordFailedTransfer - should successfully save failed transfer record")
    void recordFailedTransfer_Success() {
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .destinationAccountNumber("2000000002")
                .amount(new BigDecimal("50000.00"))
                .currency("MMK")
                .description("Monthly allowance")
                .build();

        when(accountRepository.findByAccountNumber("2000000001")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountNumber("2000000002")).thenReturn(Optional.of(destAccount));

        transactionAuditService.recordFailedTransfer(
                request, "IDEMP-P2P-1", "INSUFFICIENT_FUNDS", "Account balance insufficient"
        );

        ArgumentCaptor<BankTransactions> txnCaptor = ArgumentCaptor.forClass(BankTransactions.class);
        verify(bankTransactionRepository, times(1)).save(txnCaptor.capture());

        BankTransactions savedTxn = txnCaptor.getValue();
        assertNotNull(savedTxn);
        assertTrue(savedTxn.getTransactionRef().startsWith("TXN-FAIL-"));
        assertEquals(TransactionType.INTERNAL_TRANSFER, savedTxn.getTransactionType());
        assertEquals(TransactionStatus.FAILED, savedTxn.getStatus());
        assertEquals(sourceAccount, savedTxn.getSourceAccount());
        assertEquals(destAccount, savedTxn.getDestinationAccount());
        assertEquals(new BigDecimal("50000.00"), savedTxn.getAmount());
        assertEquals("MMK", savedTxn.getCurrency());
        assertEquals(InitiatedByType.CUSTOMER, savedTxn.getInitiatedByType());
        assertEquals(customer, savedTxn.getInitiatedByCustomer());
        assertEquals(TransactionChannel.CUSTOMER_PORTAL, savedTxn.getChannel());
        assertEquals("IDEMP-P2P-1", savedTxn.getIdempotencyKey());
        assertEquals("INSUFFICIENT_FUNDS", savedTxn.getFailureCode());
        assertEquals("Account balance insufficient", savedTxn.getFailureMessage());
        assertNotNull(savedTxn.getCompletedAt());
    }

    @Test
    @DisplayName("recordFailedTransfer - accounts not found should still persist without exception")
    void recordFailedTransfer_AccountsNotFound() {
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("UNKNOWN-SRC")
                .destinationAccountNumber("UNKNOWN-DEST")
                .amount(null)
                .currency(null)
                .build();

        when(accountRepository.findByAccountNumber("UNKNOWN-SRC")).thenReturn(Optional.empty());
        when(accountRepository.findByAccountNumber("UNKNOWN-DEST")).thenReturn(Optional.empty());

        transactionAuditService.recordFailedTransfer(request, "KEY-1", "ACCOUNT_NOT_FOUND", "Account does not exist");

        ArgumentCaptor<BankTransactions> captor = ArgumentCaptor.forClass(BankTransactions.class);
        verify(bankTransactionRepository).save(captor.capture());

        BankTransactions saved = captor.getValue();
        assertNull(saved.getSourceAccount());
        assertNull(saved.getDestinationAccount());
        assertNull(saved.getInitiatedByCustomer());
        assertEquals(BigDecimal.ZERO, saved.getAmount());
        assertEquals("MMK", saved.getCurrency());
    }

    @Test
    @DisplayName("recordFailedTransfer - long failure message should be truncated to 255 chars")
    void recordFailedTransfer_TruncatesLongMessage() {
        String longMessage = "A".repeat(300);
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .destinationAccountNumber("2000000002")
                .build();

        when(accountRepository.findByAccountNumber("2000000001")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountNumber("2000000002")).thenReturn(Optional.of(destAccount));

        transactionAuditService.recordFailedTransfer(request, "KEY-2", "ERROR_CODE", longMessage);

        ArgumentCaptor<BankTransactions> captor = ArgumentCaptor.forClass(BankTransactions.class);
        verify(bankTransactionRepository).save(captor.capture());

        assertEquals(255, captor.getValue().getFailureMessage().length());
    }

    @Test
    @DisplayName("recordFailedTransfer - repository exception is handled safely without propagating")
    void recordFailedTransfer_RepositoryExceptionHandled() {
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .destinationAccountNumber("2000000002")
                .build();

        when(accountRepository.findByAccountNumber("2000000001")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountNumber("2000000002")).thenReturn(Optional.of(destAccount));
        when(bankTransactionRepository.save(any())).thenThrow(new RuntimeException("DB Connection Timeout"));

        assertDoesNotThrow(() -> transactionAuditService.recordFailedTransfer(request, "K", "CODE", "MSG"));
    }

    @Test
    @DisplayName("recordFailedEcommercePayment - should successfully persist external payment failure")
    void recordFailedEcommercePayment_Success() {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("2000000002")
                .orderId("ORD-98765")
                .amount(new BigDecimal("120000.00"))
                .currency("MMK")
                .description("Online shopping payment")
                .build();

        when(accountRepository.findByAccountNumber("2000000001")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountNumber("2000000002")).thenReturn(Optional.of(destAccount));

        transactionAuditService.recordFailedEcommercePayment(
                request, "IDEMP-ECOM-1", "PAYMENT_LIMIT_EXCEEDED", "Daily limit exceeded"
        );

        ArgumentCaptor<BankTransactions> captor = ArgumentCaptor.forClass(BankTransactions.class);
        verify(bankTransactionRepository).save(captor.capture());

        BankTransactions savedTxn = captor.getValue();
        assertNotNull(savedTxn);
        assertTrue(savedTxn.getTransactionRef().startsWith("TXN-ECOM-FAIL-"));
        assertEquals(TransactionType.EXTERNAL_PAYMENT, savedTxn.getTransactionType());
        assertEquals(TransactionStatus.FAILED, savedTxn.getStatus());
        assertEquals(TransactionChannel.PAYMENT_GATEWAY, savedTxn.getChannel());
        assertEquals("ORD-98765", savedTxn.getExternalReference());
        assertEquals(new BigDecimal("120000.00"), savedTxn.getAmount());
        assertEquals("IDEMP-ECOM-1", savedTxn.getIdempotencyKey());
        assertEquals("PAYMENT_LIMIT_EXCEEDED", savedTxn.getFailureCode());
        assertEquals("Daily limit exceeded", savedTxn.getFailureMessage());
        assertEquals("E-Commerce Failure: PAYMENT_LIMIT_EXCEEDED", savedTxn.getAuditNote());
    }

    @Test
    @DisplayName("recordFailedEcommercePayment - long message truncated and exception handled gracefully")
    void recordFailedEcommercePayment_LongMessageAndExceptionGraceful() {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("2000000002")
                .build();

        when(accountRepository.findByAccountNumber(any())).thenReturn(Optional.empty());
        String longMessage = "X".repeat(300);

        transactionAuditService.recordFailedEcommercePayment(request, "KEY-3", "FAIL_X", longMessage);

        ArgumentCaptor<BankTransactions> captor = ArgumentCaptor.forClass(BankTransactions.class);
        verify(bankTransactionRepository).save(captor.capture());
        assertEquals(255, captor.getValue().getFailureMessage().length());

        // When DB throws exception
        when(bankTransactionRepository.save(any())).thenThrow(new RuntimeException("Disk full"));
        assertDoesNotThrow(() -> transactionAuditService.recordFailedEcommercePayment(request, "KEY-3", "FAIL_X", "msg"));
    }
}
