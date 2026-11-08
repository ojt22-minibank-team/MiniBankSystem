package com.corebanking.service;

import com.corebanking.dto.EcommercePaymentRequestDto;
import com.corebanking.dto.EcommercePaymentResponseDto;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.TransactionException;
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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EcommercePaymentServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private BankTransactionRepository bankTransactionRepository;

    @Mock
    private LedgerAccountRepository ledgerAccountRepository;

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    @Mock
    private AsyncNotificationService asyncNotificationService;

    @Mock
    private TransferLimitService transferLimitService;

    @InjectMocks
    private EcommercePaymentService ecommercePaymentService;

    private Accounts customerAccount;
    private Accounts merchantAccount;
    private Customers customer;
    private Customers merchantCustomer;
    private LedgerAccounts customerLedger;
    private LedgerAccounts merchantLedger;
    private LedgerAccounts feeLedger;

    @BeforeEach
    void setUp() {
        customer = Customers.builder()
                .customerId(UUID.randomUUID())
                .fullName("U Aung")
                .status(CustomerStatus.ACTIVE)
                .build();

        merchantCustomer = Customers.builder()
                .customerId(UUID.randomUUID())
                .fullName("Mega Supermarket Co., Ltd.")
                .customerType(CustomerType.COMPANY)
                .status(CustomerStatus.ACTIVE)
                .build();

        customerAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("2000000001")
                .accountCategory(AccountCategory.RETAIL)
                .accountType(AccountType.SAVINGS)
                .currency("MMK")
                .status(AccountStatus.ACTIVE)
                .currentBalance(new BigDecimal("200000.00"))
                .availableBalance(new BigDecimal("200000.00"))
                .customer(customer)
                .build();

        merchantAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("3000000001")
                .accountCategory(AccountCategory.CORPORATE)
                .currency("MMK")
                .status(AccountStatus.ACTIVE)
                .currentBalance(new BigDecimal("1000000.00"))
                .availableBalance(new BigDecimal("1000000.00"))
                .customer(merchantCustomer)
                .build();

        customerLedger = LedgerAccounts.builder()
                .ledgerAccountId(1)
                .ledgerCode("GL-CUSTOMER-DEPOSITS")
                .build();

        merchantLedger = LedgerAccounts.builder()
                .ledgerAccountId(2)
                .ledgerCode("GL-MERCHANT-DEPOSITS")
                .build();

        feeLedger = LedgerAccounts.builder()
                .ledgerAccountId(3)
                .ledgerCode("GL-FEE-REVENUE")
                .build();

        lenient().when(bankTransactionRepository.findByIdempotencyKey(any())).thenReturn(Optional.empty());
        lenient().when(transferLimitService.getMinimumBalance()).thenReturn(new BigDecimal("10000.00"));
        lenient().when(transferLimitService.getEcommerceDailyTransferLimit()).thenReturn(new BigDecimal("1000000.00"));
        lenient().when(bankTransactionRepository.findTodayTotalEcommercePaymentAmount(any(), any(), any())).thenReturn(BigDecimal.ZERO);
    }

    @Test
    @DisplayName("processEcommercePayment - success with double-entry ledger & notification")
    void processEcommercePayment_Success() {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("50000.00"))
                .serviceFee(new BigDecimal("1000.00"))
                .currency("MMK")
                .orderId("ORD-555")
                .idempotencyKey("IDEMP-ECOM-100")
                .description("Online Goods Purchase")
                .build();

        when(bankTransactionRepository.findByIdempotencyKey("IDEMP-ECOM-100")).thenReturn(Optional.empty());
        when(accountRepository.findByAccountNumberForUpdate("2000000001")).thenReturn(Optional.of(customerAccount));
        when(accountRepository.findByAccountNumberForUpdate("3000000001")).thenReturn(Optional.of(merchantAccount));
        when(transferLimitService.getMinimumBalance()).thenReturn(new BigDecimal("10000.00"));
        when(transferLimitService.getEcommerceDailyTransferLimit()).thenReturn(new BigDecimal("1000000.00"));
        when(bankTransactionRepository.findTodayTotalEcommercePaymentAmount(any(), any(), any())).thenReturn(BigDecimal.ZERO);

        when(ledgerAccountRepository.findByCustomerAccount(customerAccount)).thenReturn(Optional.of(customerLedger));
        when(ledgerAccountRepository.findByCustomerAccount(merchantAccount)).thenReturn(Optional.of(merchantLedger));
        when(ledgerAccountRepository.findByLedgerCode("GL-FEE-REVENUE")).thenReturn(Optional.of(feeLedger));

        EcommercePaymentResponseDto response = ecommercePaymentService.processEcommercePayment(request, "IDEMP-ECOM-100");

        assertNotNull(response);
        assertEquals(TransactionStatus.COMPLETED, response.getStatus());
        assertEquals(new BigDecimal("50000.00"), response.getAmount());
        assertEquals(new BigDecimal("1000.00"), response.getServiceFee());
        assertEquals(new BigDecimal("49000.00"), response.getNetMerchantAmount());
        assertEquals(new BigDecimal("50000.00"), response.getTotalDebitedAmount());

        // Account balances updated:
        assertEquals(0, new BigDecimal("150000.00").compareTo(customerAccount.getAvailableBalance()));
        assertEquals(0, new BigDecimal("1049000.00").compareTo(merchantAccount.getAvailableBalance()));

        // Repositories verified:
        verify(accountRepository, times(2)).save(any(Accounts.class));
        verify(bankTransactionRepository, times(1)).save(any(BankTransactions.class));
        verify(ledgerEntryRepository, times(3)).save(any(LedgerEntries.class));
        verify(asyncNotificationService, times(1)).sendMerchantPaymentNotificationAsync(
                eq(customer.getCustomerId()), eq("2000000001"), eq("3000000001"),
                eq("Mega Supermarket Co., Ltd."), eq("ORD-555"), eq(new BigDecimal("50000.00")),
                eq("MMK"), anyString()
        );
    }

    @Test
    @DisplayName("processEcommercePayment - returns cached result on duplicate idempotency key")
    void processEcommercePayment_DuplicateIdempotencyKey() {
        BankTransactions existingTxn = BankTransactions.builder()
                .transactionRef("TXN-ECOM-CACHED")
                .externalReference("ORD-555")
                .status(TransactionStatus.COMPLETED)
                .sourceAccount(customerAccount)
                .destinationAccount(merchantAccount)
                .amount(new BigDecimal("50000.00"))
                .serviceFee(new BigDecimal("1000.00"))
                .currency("MMK")
                .completedAt(LocalDateTime.now())
                .build();

        when(bankTransactionRepository.findByIdempotencyKey("IDEMP-KEY-999")).thenReturn(Optional.of(existingTxn));

        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .idempotencyKey("IDEMP-KEY-999")
                .amount(new BigDecimal("50000.00"))
                .serviceFee(new BigDecimal("1000.00"))
                .build();

        EcommercePaymentResponseDto response = ecommercePaymentService.processEcommercePayment(request, null);

        assertNotNull(response);
        assertEquals("TXN-ECOM-CACHED", response.getTransactionRef());
        assertTrue(response.getMessage().contains("Duplicate request handled idempotently"));
        verifyNoInteractions(accountRepository);
        verifyNoInteractions(ledgerEntryRepository);
    }

    @Test
    @DisplayName("processEcommercePayment - identical source and merchant account throws exception")
    void processEcommercePayment_IdenticalAccounts_ThrowsException() {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("2000000001")
                .amount(new BigDecimal("5000.00"))
                .serviceFee(new BigDecimal("100.00"))
                .build();

        TransactionException ex = assertThrows(TransactionException.class, () ->
                ecommercePaymentService.processEcommercePayment(request, "KEY-1"));
        assertTrue(ex.getMessage().contains("Source account and merchant account cannot be identical"));
    }

    @Test
    @DisplayName("processEcommercePayment - invalid service fee throws exception")
    void processEcommercePayment_InvalidServiceFee_ThrowsException() {
        EcommercePaymentRequestDto requestNoFee = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("5000.00"))
                .serviceFee(null)
                .build();
        assertThrows(TransactionException.class, () ->
                ecommercePaymentService.processEcommercePayment(requestNoFee, "KEY-1"));

        EcommercePaymentRequestDto requestExceedFee = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("5000.00"))
                .serviceFee(new BigDecimal("6000.00"))
                .build();
        assertThrows(TransactionException.class, () ->
                ecommercePaymentService.processEcommercePayment(requestExceedFee, "KEY-2"));
    }

    @Test
    @DisplayName("processEcommercePayment - account not found throws AccountNotFoundException")
    void processEcommercePayment_AccountNotFound_ThrowsException() {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("9999999999")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("5000.00"))
                .serviceFee(new BigDecimal("100.00"))
                .build();

        when(accountRepository.findByAccountNumberForUpdate("3000000001")).thenReturn(Optional.of(merchantAccount));
        when(accountRepository.findByAccountNumberForUpdate("9999999999")).thenReturn(Optional.empty());

        assertThrows(AccountNotFoundException.class, () ->
                ecommercePaymentService.processEcommercePayment(request, "KEY-3"));
    }

    @Test
    @DisplayName("processEcommercePayment - insufficient funds throws InsufficientFundsException")
    void processEcommercePayment_InsufficientFunds_ThrowsException() {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("195000.00"))
                .serviceFee(new BigDecimal("100.00"))
                .currency("MMK")
                .build();

        when(accountRepository.findByAccountNumberForUpdate("2000000001")).thenReturn(Optional.of(customerAccount));
        when(accountRepository.findByAccountNumberForUpdate("3000000001")).thenReturn(Optional.of(merchantAccount));
        when(transferLimitService.getMinimumBalance()).thenReturn(new BigDecimal("10000.00"));

        assertThrows(InsufficientFundsException.class, () ->
                ecommercePaymentService.processEcommercePayment(request, "KEY-4"));
    }

    @Test
    @DisplayName("processEcommercePayment - breaches daily limit throws TransactionException")
    void processEcommercePayment_BreachesDailyLimit_ThrowsException() {
        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("50000.00"))
                .serviceFee(new BigDecimal("100.00"))
                .currency("MMK")
                .build();

        when(accountRepository.findByAccountNumberForUpdate("2000000001")).thenReturn(Optional.of(customerAccount));
        when(accountRepository.findByAccountNumberForUpdate("3000000001")).thenReturn(Optional.of(merchantAccount));
        when(transferLimitService.getMinimumBalance()).thenReturn(new BigDecimal("1000.00"));
        when(transferLimitService.getEcommerceDailyTransferLimit()).thenReturn(new BigDecimal("100000.00"));
        when(bankTransactionRepository.findTodayTotalEcommercePaymentAmount(any(), any(), any()))
                .thenReturn(new BigDecimal("80000.00")); // 80,000 + 50,000 > 100,000 limit

        TransactionException ex = assertThrows(TransactionException.class, () ->
                ecommercePaymentService.processEcommercePayment(request, "KEY-5"));
        assertTrue(ex.getMessage().contains("Payment breaches daily ecommerce limit"));
    }

    @Test
    @DisplayName("processEcommercePayment - non-corporate merchant account throws TransactionException")
    void processEcommercePayment_NonCorporateMerchant_ThrowsException() {
        merchantAccount.setAccountCategory(AccountCategory.RETAIL);
        merchantAccount.setAccountType(AccountType.SAVINGS);
        merchantCustomer.setCustomerType(CustomerType.INDIVIDUAL);
        merchantCustomer.setCompanyInfo(null);

        EcommercePaymentRequestDto request = EcommercePaymentRequestDto.builder()
                .sourceAccountNumber("2000000001")
                .merchantAccountNumber("3000000001")
                .amount(new BigDecimal("50000.00"))
                .serviceFee(new BigDecimal("100.00"))
                .currency("MMK")
                .build();

        when(accountRepository.findByAccountNumberForUpdate("2000000001")).thenReturn(Optional.of(customerAccount));
        when(accountRepository.findByAccountNumberForUpdate("3000000001")).thenReturn(Optional.of(merchantAccount));

        TransactionException ex = assertThrows(TransactionException.class, () ->
                ecommercePaymentService.processEcommercePayment(request, "KEY-6"));
        assertTrue(ex.getMessage().contains("Merchant settlement account must belong to a registered corporate"));
    }
}
