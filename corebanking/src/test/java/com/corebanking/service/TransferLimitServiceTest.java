package com.corebanking.service;

import com.corebanking.dto.BankTransferLimitRule;
import com.corebanking.dto.TransferLimitInfoResponseDto;
import com.corebanking.dto.UpdateTransferLimitRequestDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.SystemParameters;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.InvalidPinException;
import com.corebanking.exception.TransactionException;
import com.corebanking.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TransferLimitServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private CustomerCredentialsRepository customerCredentialsRepository;

    @Mock
    private SystemParametersRepository systemParametersRepository;

    @Mock
    private BeneficiaryRepository beneficiaryRepository;

    @Mock
    private BankTransactionRepository bankTransactionRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private TransferLimitService transferLimitService;

    private UUID customerId;
    private Customers customer;
    private Accounts sourceSavingsAccount;
    private Accounts destAccount;

    @BeforeEach
    void setUp() {
        customerId = UUID.randomUUID();

        customer = Customers.builder()
                .customerId(customerId)
                .fullName("U Ba")
                .build();

        sourceSavingsAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("2001111111")
                .customer(customer)
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
                .customer(Customers.builder().customerId(UUID.randomUUID()).fullName("Daw Mya").build())
                .accountType(AccountType.SAVINGS)
                .accountCategory(AccountCategory.RETAIL)
                .status(AccountStatus.ACTIVE)
                .currency("MMK")
                .build();
    }

    @Test
    @DisplayName("getBankLimits - Retail Savings resolves default limits correctly")
    void testGetBankLimits_RetailSavings() {
        BankTransferLimitRule limits = transferLimitService.getBankLimits(AccountCategory.RETAIL, AccountType.SAVINGS);

        assertNotNull(limits);
        assertEquals(new BigDecimal("2000000.00"), limits.getMaxOneTimeLimit());
        assertEquals(new BigDecimal("1000000.00"), limits.getStrangerOneTimeLimit());
        assertEquals(new BigDecimal("10000000.00"), limits.getMaxDailyLimit());
    }

    @Test
    @DisplayName("getBankLimits - Retail Current resolves higher one-time limit")
    void testGetBankLimits_RetailCurrent() {
        BankTransferLimitRule limits = transferLimitService.getBankLimits(AccountCategory.RETAIL, AccountType.CURRENT);

        assertNotNull(limits);
        assertEquals(new BigDecimal("3000000.00"), limits.getMaxOneTimeLimit());
        assertEquals(new BigDecimal("1000000.00"), limits.getStrangerOneTimeLimit());
        assertEquals(new BigDecimal("10000000.00"), limits.getMaxDailyLimit());
    }

    @Test
    @DisplayName("getBankLimits - Corporate resolves corporate-specific limits")
    void testGetBankLimits_Corporate() {
        BankTransferLimitRule limits = transferLimitService.getBankLimits(AccountCategory.CORPORATE, AccountType.CURRENT);

        assertNotNull(limits);
        assertEquals(new BigDecimal("50000000.00"), limits.getMaxOneTimeLimit());
        assertEquals(new BigDecimal("10000000.00"), limits.getStrangerOneTimeLimit());
        assertEquals(new BigDecimal("10000000.00"), limits.getMaxDailyLimit());
    }

    @Test
    @DisplayName("getBankLimits - Reads dynamic values from system_parameters when present")
    void testGetBankLimits_DynamicFromSystemParameters() {
        SystemParameters customDailyParam = SystemParameters.builder()
                .parameterKey("DAILY_TRANSFER_LIMIT")
                .parameterValue("25,000,000.00")
                .build();

        when(systemParametersRepository.findByParameterKeyIgnoreCase("DAILY_TRANSFER_LIMIT"))
                .thenReturn(Optional.of(customDailyParam));

        BankTransferLimitRule limits = transferLimitService.getBankLimits(AccountCategory.RETAIL, AccountType.SAVINGS);

        assertEquals(new BigDecimal("25000000.00"), limits.getMaxDailyLimit());
    }

    @Test
    @DisplayName("getEffectiveMinimumBalance - Uses maximum of system min and account min balance")
    void testGetEffectiveMinimumBalance() {
        // 1. Account min balance = 10,000, System min = 10,000 -> 10,000
        BigDecimal min1 = transferLimitService.getEffectiveMinimumBalance(sourceSavingsAccount);
        assertEquals(new BigDecimal("10000.00"), min1);

        // 2. Account explicit higher min balance = 50,000 -> 50,000
        sourceSavingsAccount.setMinimumBalance(new BigDecimal("50000.00"));
        BigDecimal min2 = transferLimitService.getEffectiveMinimumBalance(sourceSavingsAccount);
        assertEquals(new BigDecimal("50000.00"), min2);
    }

    @Test
    @DisplayName("validateTransferLimits - Zero or negative amount throws TransactionException")
    void testValidateTransferLimits_ZeroOrNegativeAmount() {
        TransactionException ex = assertThrows(TransactionException.class, () ->
                transferLimitService.validateTransferLimits(sourceSavingsAccount, destAccount, BigDecimal.ZERO));
        assertTrue(ex.getMessage().contains("must be greater than zero"));

        assertThrows(TransactionException.class, () ->
                transferLimitService.validateTransferLimits(sourceSavingsAccount, destAccount, new BigDecimal("-100.00")));
    }

    @Test
    @DisplayName("validateTransferLimits - Saved Beneficiary exceeding one-time limit throws TransactionException")
    void testValidateTransferLimits_BeneficiaryExceedsOneTimeLimit() {
        // Destination is saved beneficiary
        when(beneficiaryRepository.findByOwnerAccountAndBeneficiaryAccount(sourceSavingsAccount, destAccount))
                .thenReturn(Optional.of(mock(com.corebanking.entity.Beneficiaries.class)));

        // Retail savings max one-time is 2,000,000 MMK; attempting 2,500,000 MMK
        BigDecimal amount = new BigDecimal("2500000.00");

        TransactionException ex = assertThrows(TransactionException.class, () ->
                transferLimitService.validateTransferLimits(sourceSavingsAccount, destAccount, amount));
        assertTrue(ex.getMessage().contains("exceeds your one-time transfer limit"));
    }

    @Test
    @DisplayName("validateTransferLimits - Stranger account exceeding unsaved limit throws TransactionException")
    void testValidateTransferLimits_StrangerExceedsStrangerLimit() {
        // Destination is NOT a saved beneficiary (Stranger)
        when(beneficiaryRepository.findByOwnerAccountAndBeneficiaryAccount(sourceSavingsAccount, destAccount))
                .thenReturn(Optional.empty());

        // Unsaved stranger limit is 1,000,000 MMK; attempting 1,500,000 MMK
        BigDecimal amount = new BigDecimal("1500000.00");

        TransactionException ex = assertThrows(TransactionException.class, () ->
                transferLimitService.validateTransferLimits(sourceSavingsAccount, destAccount, amount));
        assertTrue(ex.getMessage().contains("stranger one-time limit"));
    }

    @Test
    @DisplayName("validateTransferLimits - Daily cumulative transfer exceeding max daily throws TransactionException")
    void testValidateTransferLimits_DailyCumulativeExceeded() {
        when(beneficiaryRepository.findByOwnerAccountAndBeneficiaryAccount(sourceSavingsAccount, destAccount))
                .thenReturn(Optional.of(mock(com.corebanking.entity.Beneficiaries.class)));

        // Used 9,500,000 MMK already today out of 10,000,000 MMK limit
        when(bankTransactionRepository.findTodayTotalTransferredAmount(eq(sourceSavingsAccount.getAccountId()), any(), any()))
                .thenReturn(new BigDecimal("9500000.00"));

        // Attempting to transfer 1,000,000 MMK (Total 10,500,000 > 10,000,000)
        BigDecimal amount = new BigDecimal("1000000.00");

        TransactionException ex = assertThrows(TransactionException.class, () ->
                transferLimitService.validateTransferLimits(sourceSavingsAccount, destAccount, amount));
        assertTrue(ex.getMessage().contains("exceeds daily limit"));
    }

    @Test
    @DisplayName("validateTransferLimits - Valid transfer within limits passes smoothly")
    void testValidateTransferLimits_Success() {
        when(beneficiaryRepository.findByOwnerAccountAndBeneficiaryAccount(sourceSavingsAccount, destAccount))
                .thenReturn(Optional.of(mock(com.corebanking.entity.Beneficiaries.class)));
        when(bankTransactionRepository.findTodayTotalTransferredAmount(eq(sourceSavingsAccount.getAccountId()), any(), any()))
                .thenReturn(new BigDecimal("500000.00"));

        BigDecimal amount = new BigDecimal("100000.00");

        assertDoesNotThrow(() ->
                transferLimitService.validateTransferLimits(sourceSavingsAccount, destAccount, amount));
    }

    @Test
    @DisplayName("getTransferLimitInfo - Returns complete limits and real-time usage DTO")
    void testGetTransferLimitInfo_Success() {
        when(accountRepository.findByAccountNumber("2001111111"))
                .thenReturn(Optional.of(sourceSavingsAccount));
        when(bankTransactionRepository.findTodayTotalTransferredAmount(eq(sourceSavingsAccount.getAccountId()), any(), any()))
                .thenReturn(new BigDecimal("2000000.00"));

        TransferLimitInfoResponseDto info = transferLimitService.getTransferLimitInfo(customerId.toString(), "2001111111");

        assertNotNull(info);
        assertEquals("2001111111", info.getAccountNumber());
        assertEquals(new BigDecimal("2000000.00"), info.getTodayTransferredAmount());
        assertEquals(new BigDecimal("8000000.00"), info.getRemainingDailyLimit());
        assertEquals(new BigDecimal("2000000.00"), info.getBankMaxOneTimeLimit());
        assertEquals(new BigDecimal("1000000.00"), info.getBankStrangerOneTimeLimit());
        assertEquals(new BigDecimal("10000000.00"), info.getBankMaxDailyLimit());
    }

    @Test
    @DisplayName("updateCustomLimits - Account not owned by user throws TransactionException")
    void testUpdateCustomLimits_AccountNotOwned() {
        when(accountRepository.findByAccountNumber("2001111111"))
                .thenReturn(Optional.of(sourceSavingsAccount));

        String otherCustomerId = UUID.randomUUID().toString();
        UpdateTransferLimitRequestDto request = UpdateTransferLimitRequestDto.builder()
                .transactionPin("123456")
                .customDailyLimit(new BigDecimal("5000000.00"))
                .build();

        TransactionException ex = assertThrows(TransactionException.class, () ->
                transferLimitService.updateCustomLimits(otherCustomerId, "2001111111", request));
        assertTrue(ex.getMessage().contains("does not own this account"));
    }

    @Test
    @DisplayName("updateCustomLimits - Invalid transaction PIN throws TransactionException")
    void testUpdateCustomLimits_InvalidPin() {
        when(accountRepository.findByAccountNumber("2001111111"))
                .thenReturn(Optional.of(sourceSavingsAccount));

        CustomerCredentials credentials = CustomerCredentials.builder()
                .customerId(customerId)
                .transactionPinHash("$2a$10$encodedHash")
                .build();

        when(customerCredentialsRepository.findByCustomerId(customerId)).thenReturn(Optional.of(credentials));
        when(passwordEncoder.matches("999999", "$2a$10$encodedHash")).thenReturn(false);

        UpdateTransferLimitRequestDto request = UpdateTransferLimitRequestDto.builder()
                .transactionPin("999999")
                .customDailyLimit(new BigDecimal("5000000.00"))
                .build();

        TransactionException ex = assertThrows(TransactionException.class, () ->
                transferLimitService.updateCustomLimits(customerId.toString(), "2001111111", request));
        assertTrue(ex.getMessage().contains("Invalid transaction PIN"));
    }

    @Test
    @DisplayName("updateCustomLimits - Custom limit exceeding Bank Maximum throws TransactionException")
    void testUpdateCustomLimits_ExceedsBankMaximum() {
        when(accountRepository.findByAccountNumber("2001111111"))
                .thenReturn(Optional.of(sourceSavingsAccount));

        CustomerCredentials credentials = CustomerCredentials.builder()
                .customerId(customerId)
                .transactionPinHash("$2a$10$encodedHash")
                .build();

        when(customerCredentialsRepository.findByCustomerId(customerId)).thenReturn(Optional.of(credentials));
        when(passwordEncoder.matches("123456", "$2a$10$encodedHash")).thenReturn(true);

        // Requested daily limit 50,000,000 > 10,000,000 Bank Maximum
        UpdateTransferLimitRequestDto request = UpdateTransferLimitRequestDto.builder()
                .transactionPin("123456")
                .customDailyLimit(new BigDecimal("50000000.00"))
                .build();

        TransactionException ex = assertThrows(TransactionException.class, () ->
                transferLimitService.updateCustomLimits(customerId.toString(), "2001111111", request));
        assertTrue(ex.getMessage().contains("cannot exceed Bank Maximum Daily Limit"));
    }

    @Test
    @DisplayName("updateCustomLimits - Valid custom limits update and persist successfully")
    void testUpdateCustomLimits_Success() {
        when(accountRepository.findByAccountNumber("2001111111"))
                .thenReturn(Optional.of(sourceSavingsAccount));

        CustomerCredentials credentials = CustomerCredentials.builder()
                .customerId(customerId)
                .transactionPinHash("$2a$10$encodedHash")
                .build();

        when(customerCredentialsRepository.findByCustomerId(customerId)).thenReturn(Optional.of(credentials));
        when(passwordEncoder.matches("123456", "$2a$10$encodedHash")).thenReturn(true);
        when(bankTransactionRepository.findTodayTotalTransferredAmount(any(), any(), any())).thenReturn(BigDecimal.ZERO);

        UpdateTransferLimitRequestDto request = UpdateTransferLimitRequestDto.builder()
                .transactionPin("123456")
                .customOneTimeLimit(new BigDecimal("1500000.00"))
                .customDailyLimit(new BigDecimal("5000000.00"))
                .build();

        TransferLimitInfoResponseDto response = transferLimitService.updateCustomLimits(customerId.toString(), "2001111111", request);

        assertNotNull(response);
        verify(accountRepository, times(1)).save(sourceSavingsAccount);
        verify(systemParametersRepository, times(1)).save(any(SystemParameters.class));
    }
}
