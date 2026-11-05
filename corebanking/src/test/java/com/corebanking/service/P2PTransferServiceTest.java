package com.corebanking.service;

import com.corebanking.dto.AccountLookupResponseDto;
import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.dto.P2PTransferResponseDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.LedgerAccounts;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.InvalidPinException;
import com.corebanking.exception.TransactionException;
import com.corebanking.queue.TransferQueueMessage;
import com.corebanking.queue.TransferQueueProducer;
import com.corebanking.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
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
class P2PTransferServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private BankTransactionRepository bankTransactionRepository;

    @Mock
    private FeeScheduleRepository feeScheduleRepository;

    @Mock
    private LedgerAccountRepository ledgerAccountRepository;

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    @Mock
    private AsyncNotificationService asyncNotificationService;

    @Mock
    private TransferLimitService transferLimitService;

    @Mock
    private MerchantSecurityValidationService merchantSecurityValidationService;

    @Mock
    private TransferQueueProducer transferQueueProducer;

    @Mock
    private AuditTrailService auditTrailService;

    @InjectMocks
    private P2PTransferService p2pTransferService;

    private UUID senderId;
    private UUID receiverId;
    private Customers sender;
    private Customers receiver;
    private Accounts sourceAccount;
    private Accounts destAccount;
    private LedgerAccounts dummyGlAccount;

    @BeforeEach
    void setUp() {
        senderId = UUID.randomUUID();
        receiverId = UUID.randomUUID();

        sender = Customers.builder()
                .customerId(senderId)
                .fullName("U Ba")
                .build();

        receiver = Customers.builder()
                .customerId(receiverId)
                .fullName("Daw Mya")
                .build();

        sourceAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("2001111111")
                .customer(sender)
                .accountType(AccountType.SAVINGS)
                .accountCategory(AccountCategory.RETAIL)
                .status(AccountStatus.ACTIVE)
                .currency("MMK")
                .currentBalance(new BigDecimal("1000000.00"))
                .availableBalance(new BigDecimal("1000000.00"))
                .minimumBalance(new BigDecimal("10000.00"))
                .build();

        destAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("2002222222")
                .customer(receiver)
                .accountType(AccountType.SAVINGS)
                .accountCategory(AccountCategory.RETAIL)
                .status(AccountStatus.ACTIVE)
                .currency("MMK")
                .currentBalance(new BigDecimal("500000.00"))
                .availableBalance(new BigDecimal("500000.00"))
                .minimumBalance(new BigDecimal("10000.00"))
                .build();

        dummyGlAccount = LedgerAccounts.builder()
                .ledgerAccountId(1)
                .ledgerCode("GL-CUSTOMER-DEPOSITS")
                .ledgerName("Customer Deposits")
                .currency("MMK")
                .build();

        lenient().when(ledgerAccountRepository.findByLedgerCode(any())).thenReturn(Optional.of(dummyGlAccount));
        lenient().when(feeScheduleRepository.findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(any()))
                .thenReturn(Optional.empty()); // Zero service fee
        lenient().when(transferLimitService.getEffectiveMinimumBalance(any()))
                .thenReturn(new BigDecimal("10000.00"));
        lenient().when(bankTransactionRepository.save(any(BankTransactions.class))).thenAnswer(i -> i.getArgument(0));
        lenient().when(accountRepository.save(any(Accounts.class))).thenAnswer(i -> i.getArgument(0));
    }

    @Test
    @DisplayName("lookupAccount - Successfully returns active account details")
    void testLookupAccount_Success() {
        when(accountRepository.findByAccountNumber("2002222222")).thenReturn(Optional.of(destAccount));

        AccountLookupResponseDto lookup = p2pTransferService.lookupAccount("2002222222");

        assertNotNull(lookup);
        assertEquals("2002222222", lookup.getAccountNumber());
        assertEquals("Daw Mya", lookup.getAccountName());
        assertEquals("ACTIVE", lookup.getStatus());
    }

    @Test
    @DisplayName("lookupAccount - Account not found throws AccountNotFoundException")
    void testLookupAccount_NotFound() {
        when(accountRepository.findByAccountNumber("9999999999")).thenReturn(Optional.empty());

        assertThrows(AccountNotFoundException.class, () ->
                p2pTransferService.lookupAccount("9999999999"));
    }

    @Test
    @DisplayName("lookupAccount - Frozen account returns status FROZEN")
    void testLookupAccount_FrozenAccount() {
        destAccount.setStatus(AccountStatus.FROZEN);
        when(accountRepository.findByAccountNumber("2002222222")).thenReturn(Optional.of(destAccount));

        AccountLookupResponseDto lookup = p2pTransferService.lookupAccount("2002222222");
        assertNotNull(lookup);
        assertEquals("FROZEN", lookup.getStatus());
    }

    @Test
    @DisplayName("processP2PTransfer - Idempotency duplicate returns existing completed transaction")
    void testProcessP2PTransfer_IdempotencyDuplicate() {
        BankTransactions existingTxn = BankTransactions.builder()
                .transactionRef("TXN-P2P-EXISTING-001")
                .status(TransactionStatus.COMPLETED)
                .amount(new BigDecimal("50000.0000"))
                .serviceFee(BigDecimal.ZERO)
                .currency("MMK")
                .sourceAccount(sourceAccount)
                .destinationAccount(destAccount)
                .build();

        when(bankTransactionRepository.findByIdempotencyKey("IDEMP-KEY-001"))
                .thenReturn(Optional.of(existingTxn));

        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .idempotencyKey("IDEMP-KEY-001")
                .transactionPin("123456")
                .build();

        P2PTransferResponseDto response = p2pTransferService.processP2PTransfer(senderId.toString(), request, "IDEMP-KEY-001");

        assertNotNull(response);
        assertEquals("TXN-P2P-EXISTING-001", response.getTransactionRef());
        verify(accountRepository, never()).findByAccountNumberForUpdate(any());
    }

    @Test
    @DisplayName("processP2PTransfer - Identical source and destination throws TransactionException")
    void testProcessP2PTransfer_SameAccount() {
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2001111111")
                .amount(new BigDecimal("50000.0000"))
                .idempotencyKey("IDEMP-001")
                .transactionPin("123456")
                .build();

        TransactionException ex = assertThrows(TransactionException.class, () ->
                p2pTransferService.processP2PTransfer(senderId.toString(), request, "IDEMP-001"));
        assertTrue(ex.getMessage().contains("cannot be identical"));
    }

    @Test
    @DisplayName("processP2PTransfer - Amount below minimum throws TransactionException")
    void testProcessP2PTransfer_AmountBelowMin() {
        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("0.5000"))
                .idempotencyKey("IDEMP-002")
                .transactionPin("123456")
                .build();

        TransactionException ex = assertThrows(TransactionException.class, () ->
                p2pTransferService.processP2PTransfer(senderId.toString(), request, "IDEMP-002"));
        assertTrue(ex.getMessage().contains("must be at least"));
    }

    @Test
    @DisplayName("processP2PTransfer - Invalid transaction PIN throws InvalidPinException")
    void testProcessP2PTransfer_InvalidPin() {
        doThrow(new InvalidPinException("Invalid PIN"))
                .when(merchantSecurityValidationService).validateTransactionPin(eq(senderId), eq("999999"));

        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .idempotencyKey("IDEMP-003")
                .transactionPin("999999")
                .build();

        assertThrows(InvalidPinException.class, () ->
                p2pTransferService.processP2PTransfer(senderId.toString(), request, "IDEMP-003"));
    }

    @Test
    @DisplayName("processP2PTransfer - Source account not owned by authenticated user throws TransactionException")
    void testProcessP2PTransfer_AccountNotOwned() {
        when(accountRepository.findByAccountNumberForUpdate("2001111111")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountNumberForUpdate("2002222222")).thenReturn(Optional.of(destAccount));

        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .idempotencyKey("IDEMP-004")
                .transactionPin("123456")
                .build();

        String intruderId = UUID.randomUUID().toString();

        TransactionException ex = assertThrows(TransactionException.class, () ->
                p2pTransferService.processP2PTransfer(intruderId, request, "IDEMP-004"));
        assertTrue(ex.getMessage().contains("does not own the source account"));
    }

    @Test
    @DisplayName("processP2PTransfer - Currency mismatch between accounts throws TransactionException")
    void testProcessP2PTransfer_CurrencyMismatch() {
        destAccount.setCurrency("USD");
        when(accountRepository.findByAccountNumberForUpdate("2001111111")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountNumberForUpdate("2002222222")).thenReturn(Optional.of(destAccount));

        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .idempotencyKey("IDEMP-005")
                .transactionPin("123456")
                .build();

        TransactionException ex = assertThrows(TransactionException.class, () ->
                p2pTransferService.processP2PTransfer(senderId.toString(), request, "IDEMP-005"));
        assertTrue(ex.getMessage().contains("Currency mismatch"));
    }

    @Test
    @DisplayName("processP2PTransfer - Insufficient balance below minimum balance throws InsufficientFundsException")
    void testProcessP2PTransfer_InsufficientFunds() {
        sourceAccount.setAvailableBalance(new BigDecimal("30000.00"));
        sourceAccount.setCurrentBalance(new BigDecimal("30000.00"));
        // Minimum balance = 10,000 -> Net available is 20,000 MMK
        when(accountRepository.findByAccountNumberForUpdate("2001111111")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountNumberForUpdate("2002222222")).thenReturn(Optional.of(destAccount));

        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("25000.0000")) // Needs 25,000 MMK > 20,000 MMK net available
                .currency("MMK")
                .idempotencyKey("IDEMP-006")
                .transactionPin("123456")
                .build();

        assertThrows(InsufficientFundsException.class, () ->
                p2pTransferService.processP2PTransfer(senderId.toString(), request, "IDEMP-006"));
    }

    @Test
    @DisplayName("processP2PTransfer - Happy path executes transfer atomically and triggers async notification")
    void testProcessP2PTransfer_Success() {
        when(accountRepository.findByAccountNumberForUpdate("2001111111")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountNumberForUpdate("2002222222")).thenReturn(Optional.of(destAccount));

        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .idempotencyKey("IDEMP-SUCCESS")
                .transactionPin("123456")
                .description("Gift transfer")
                .build();

        P2PTransferResponseDto response = p2pTransferService.processP2PTransfer(senderId.toString(), request, "IDEMP-SUCCESS");

        assertNotNull(response);
        assertEquals(TransactionStatus.COMPLETED, response.getStatus());
        assertEquals("2001111111", response.getSourceAccountNumber());
        assertEquals("2002222222", response.getDestinationAccountNumber());
        assertEquals(new BigDecimal("50000.0000"), response.getAmount());

        // Balance assertions: source 1,000,000 - 50,000 = 950,000; dest 500,000 + 50,000 = 550,000
        assertEquals(0, new BigDecimal("950000.00").compareTo(sourceAccount.getCurrentBalance()));
        assertEquals(0, new BigDecimal("550000.00").compareTo(destAccount.getCurrentBalance()));

        verify(bankTransactionRepository, times(1)).save(any(BankTransactions.class));
        verify(ledgerEntryRepository, atLeastOnce()).save(any());
        verify(asyncNotificationService, times(1)).sendTransferNotificationsAsync(eq(sender), eq(receiver), any(BankTransactions.class));
    }

    @Test
    @DisplayName("enqueueP2PTransfer - Creates PENDING transaction and publishes to TransferQueueProducer")
    void testEnqueueP2PTransfer_Success() {
        when(accountRepository.findByAccountNumber("2001111111")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountNumber("2002222222")).thenReturn(Optional.of(destAccount));

        P2PTransferRequestDto request = P2PTransferRequestDto.builder()
                .sourceAccountNumber("2001111111")
                .destinationAccountNumber("2002222222")
                .amount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .idempotencyKey("IDEMP-QUEUED")
                .transactionPin("123456")
                .build();

        P2PTransferResponseDto response = p2pTransferService.enqueueP2PTransfer(senderId.toString(), request, "IDEMP-QUEUED");

        assertNotNull(response);
        assertEquals(TransactionStatus.INITIATED, response.getStatus());
        verify(transferQueueProducer, times(1)).publish(any(TransferQueueMessage.class));
        verify(bankTransactionRepository, times(1)).save(any(BankTransactions.class));
    }

    @Test
    @DisplayName("executeAutoReversal - Compensates balances, sets REVERSED status and dispatches notification")
    void testExecuteAutoReversal_Success() {
        BankTransactions completedTxn = BankTransactions.builder()
                .transactionId(UUID.randomUUID())
                .transactionRef("TXN-P2P-REVERSE-01")
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .status(TransactionStatus.COMPLETED)
                .sourceAccount(sourceAccount)
                .destinationAccount(destAccount)
                .amount(new BigDecimal("50000.0000"))
                .serviceFee(BigDecimal.ZERO)
                .currency("MMK")
                .completedAt(LocalDateTime.now())
                .build();

        when(bankTransactionRepository.findByTransactionRef("TXN-P2P-REVERSE-01"))
                .thenReturn(Optional.of(completedTxn));
        when(accountRepository.findByAccountNumberForUpdate("2001111111")).thenReturn(Optional.of(sourceAccount));
        when(accountRepository.findByAccountNumberForUpdate("2002222222")).thenReturn(Optional.of(destAccount));

        BankTransactions reversed = p2pTransferService.executeAutoReversal(
                "TXN-P2P-REVERSE-01",
                "Client cancellation",
                "CLIENT_REVERSAL"
        );

        assertNotNull(reversed);
        assertEquals(TransactionStatus.REVERSED, reversed.getStatus());
        assertEquals("Client cancellation", reversed.getFailureMessage());

        // Source refunded +50,000 MMK -> 1,050,000 MMK; Dest debited -50,000 MMK -> 450,000 MMK
        assertEquals(0, new BigDecimal("1050000.00").compareTo(sourceAccount.getCurrentBalance()));
        assertEquals(0, new BigDecimal("450000.00").compareTo(destAccount.getCurrentBalance()));

        verify(asyncNotificationService, times(1)).sendReversalNotificationAsync(
                eq(sender), any(BankTransactions.class), eq("Client cancellation"));
    }
}
