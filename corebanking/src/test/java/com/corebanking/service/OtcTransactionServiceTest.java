package com.corebanking.service;

import com.corebanking.dto.*;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.InsufficientFundsException;
import com.corebanking.exception.TransactionException;
import com.corebanking.repository.*;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtcTransactionServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private BankTransactionRepository bankTransactionRepository;

    @Mock
    private StaffUsersRepository staffUsersRepository;

    @Mock
    private LedgerAccountRepository ledgerAccountRepository;

    @Mock
    private LedgerEntryRepository ledgerEntryRepository;

    @Mock
    private SystemParametersRepository systemParametersRepository;

    @Mock
    private ManualTransactionsRepository manualTransactionsRepository;

    @Mock
    private AuditTrailService auditTrailService;

    @Mock
    private AsyncNotificationService asyncNotificationService;

    @Mock
    private FeeScheduleRepository feeScheduleRepository;

    @InjectMocks
    private OtcTransactionService otcTransactionService;

    private StaffUsers tellerStaff;
    private Accounts customerAccount;
    private Customers customer;
    private LedgerAccounts vaultCashLedger;
    private LedgerAccounts customerDepositLedger;
    private LedgerAccounts feeRevenueLedger;

    @BeforeEach
    void setUp() {
        tellerStaff = StaffUsers.builder()
                .staffId(UUID.randomUUID())
                .username("teller_mgmg")
                .fullName("Mg Mg (Teller)")
                .status(StaffUserStatus.ACTIVE)
                .build();

        customer = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode("CUS-001")
                .fullName("Daw Mya")
                .build();

        customerAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("1000000001")
                .currency("MMK")
                .status(AccountStatus.ACTIVE)
                .currentBalance(new BigDecimal("500000.00"))
                .availableBalance(new BigDecimal("500000.00"))
                .minimumBalance(new BigDecimal("10000.00"))
                .customer(customer)
                .build();

        vaultCashLedger = LedgerAccounts.builder()
                .ledgerAccountId(1)
                .ledgerCode("GL-VAULT-CASH")
                .build();

        customerDepositLedger = LedgerAccounts.builder()
                .ledgerAccountId(2)
                .ledgerCode("GL-CUSTOMER-DEPOSITS")
                .build();

        feeRevenueLedger = LedgerAccounts.builder()
                .ledgerAccountId(3)
                .ledgerCode("GL-FEE-REVENUE")
                .build();

        // Setup teller authentication and default mock behaviors
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken("teller_mgmg", "n/a")
        );
        lenient().when(staffUsersRepository.findByUsername("teller_mgmg")).thenReturn(Optional.of(tellerStaff));
        lenient().when(systemParametersRepository.findByParameterKeyIgnoreCase(anyString()))
                .thenReturn(Optional.empty());
        lenient().when(bankTransactionRepository.findTodayTotalOtcWithdrawnAmount(any(), any(), any()))
                .thenReturn(BigDecimal.ZERO);
        lenient().when(feeScheduleRepository.findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(any()))
                .thenReturn(Optional.empty());
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // =========================================================================
    // 1. FEE CALCULATION TESTS
    // =========================================================================

    @Test
    @DisplayName("calculateOtcFee - flat fee calculation")
    void calculateOtcFee_FlatFee() {
        FeeSchedules schedule = FeeSchedules.builder()
                .feeType(FeeType.FLAT)
                .feeValue(new BigDecimal("500.0000"))
                .isActive(true)
                .build();
        when(feeScheduleRepository.findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(TransactionType.OTC_DEPOSIT))
                .thenReturn(Optional.of(schedule));

        BigDecimal fee = otcTransactionService.calculateOtcFee(new BigDecimal("100000.00"), TransactionType.OTC_DEPOSIT);
        assertEquals(new BigDecimal("500.0000"), fee);
    }

    @Test
    @DisplayName("calculateOtcFee - percentage fee with min/max caps")
    void calculateOtcFee_PercentageWithCaps() {
        FeeSchedules schedule = FeeSchedules.builder()
                .feeType(FeeType.PERCENTAGE)
                .feeValue(new BigDecimal("1.0000")) // 1%
                .minimumFee(new BigDecimal("200.0000"))
                .maximumFee(new BigDecimal("1000.0000"))
                .isActive(true)
                .build();
        when(feeScheduleRepository.findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(TransactionType.OTC_WITHDRAWAL))
                .thenReturn(Optional.of(schedule));

        // 1% of 10,000 = 100 -> min capped at 200
        BigDecimal feeMin = otcTransactionService.calculateOtcFee(new BigDecimal("10000.00"), TransactionType.OTC_WITHDRAWAL);
        assertEquals(new BigDecimal("200.0000"), feeMin);

        // 1% of 500,000 = 5000 -> max capped at 1000
        BigDecimal feeMax = otcTransactionService.calculateOtcFee(new BigDecimal("500000.00"), TransactionType.OTC_WITHDRAWAL);
        assertEquals(new BigDecimal("1000.0000"), feeMax);
    }

    // =========================================================================
    // 2. CASH DEPOSIT TESTS
    // =========================================================================

    @Test
    @DisplayName("processDeposit - success with ledger entry, balance update and notifications")
    void processDeposit_Success() {
        OtcTransactionRequestDto request = OtcTransactionRequestDto.builder()
                .accountNumber("1000000001")
                .amount(new BigDecimal("100000.00"))
                .remark("Counter Cash Deposit")
                .manualReferenceId("VOUCHER-DEP-001")
                .manualAuditNote("Customer verified with NRC")
                .currency("MMK")
                .build();

        when(manualTransactionsRepository.existsByReferenceId("VOUCHER-DEP-001")).thenReturn(false);
        when(accountRepository.findByAccountNumberForUpdate("1000000001")).thenReturn(Optional.of(customerAccount));
        when(feeScheduleRepository.findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(TransactionType.OTC_DEPOSIT))
                .thenReturn(Optional.empty()); // Zero fee
        when(ledgerAccountRepository.findByLedgerCode("GL-VAULT-CASH")).thenReturn(Optional.of(vaultCashLedger));
        when(ledgerAccountRepository.findByCustomerAccount(customerAccount)).thenReturn(Optional.of(customerDepositLedger));

        OtcTransactionResponseDto response = otcTransactionService.processDeposit(request, "IDEMP-DEP-1");

        assertNotNull(response);
        assertEquals(TransactionType.OTC_DEPOSIT, response.getTransactionType());
        assertEquals(TransactionStatus.COMPLETED, response.getStatus());
        assertEquals(new BigDecimal("100000.00"), response.getAmount());
        assertEquals("1000000001", response.getAccountNumber());
        assertEquals("Daw Mya", response.getCustomerName());

        // Balances: 500,000 + 100,000 = 600,000 (using compareTo to ignore trailing zeroes scale)
        assertEquals(0, new BigDecimal("600000.00").compareTo(customerAccount.getCurrentBalance()));
        verify(accountRepository).save(customerAccount);
        verify(bankTransactionRepository).save(any(BankTransactions.class));
        verify(manualTransactionsRepository).save(any(ManualTransactions.class));
        verify(ledgerEntryRepository, atLeast(2)).save(any(LedgerEntries.class));
        verify(asyncNotificationService).sendDepositNotificationAsync(eq(customer), eq(customerAccount), any());
    }

    @Test
    @DisplayName("processDeposit - returns cached transaction on duplicate idempotency key")
    void processDeposit_DuplicateIdempotency() {
        BankTransactions existingTxn = BankTransactions.builder()
                .transactionRef("TXN-OTC-DEP-EXISTING")
                .transactionType(TransactionType.OTC_DEPOSIT)
                .status(TransactionStatus.COMPLETED)
                .destinationAccount(customerAccount)
                .amount(new BigDecimal("50000.00"))
                .serviceFee(BigDecimal.ZERO)
                .currency("MMK")
                .build();
        when(bankTransactionRepository.findByIdempotencyKey("KEY-DUP-DEP")).thenReturn(Optional.of(existingTxn));

        OtcTransactionRequestDto request = OtcTransactionRequestDto.builder()
                .accountNumber("1000000001")
                .build();

        OtcTransactionResponseDto response = otcTransactionService.processDeposit(request, "KEY-DUP-DEP");
        assertEquals("TXN-OTC-DEP-EXISTING", response.getTransactionRef());
        verifyNoInteractions(accountRepository);
    }

    @Test
    @DisplayName("processDeposit - duplicate voucher reference ID throws TransactionException")
    void processDeposit_DuplicateVoucher_ThrowsException() {
        OtcTransactionRequestDto request = OtcTransactionRequestDto.builder()
                .accountNumber("1000000001")
                .amount(new BigDecimal("50000.00"))
                .remark("Deposit")
                .manualReferenceId("USED-REF-999")
                .manualAuditNote("Note")
                .build();

        when(manualTransactionsRepository.existsByReferenceId("USED-REF-999")).thenReturn(true);

        TransactionException ex = assertThrows(TransactionException.class, () ->
                otcTransactionService.processDeposit(request, null));
        assertTrue(ex.getMessage().contains("already exists"));
    }

    @Test
    @DisplayName("processDeposit - inactive account throws TransactionException")
    void processDeposit_InactiveAccount_ThrowsException() {
        customerAccount.setStatus(AccountStatus.FROZEN);
        OtcTransactionRequestDto request = OtcTransactionRequestDto.builder()
                .accountNumber("1000000001")
                .amount(new BigDecimal("50000.00"))
                .remark("Deposit")
                .manualReferenceId("REF-001")
                .manualAuditNote("Note")
                .build();

        when(manualTransactionsRepository.existsByReferenceId("REF-001")).thenReturn(false);
        when(accountRepository.findByAccountNumberForUpdate("1000000001")).thenReturn(Optional.of(customerAccount));

        TransactionException ex = assertThrows(TransactionException.class, () ->
                otcTransactionService.processDeposit(request, null));
        assertTrue(ex.getMessage().contains("Account is not active"));
    }

    // =========================================================================
    // 3. CASH WITHDRAWAL TESTS
    // =========================================================================

    @Test
    @DisplayName("processWithdrawal - success with ledger entry, balance update and notifications")
    void processWithdrawal_Success() {
        OtcTransactionRequestDto request = OtcTransactionRequestDto.builder()
                .accountNumber("1000000001")
                .amount(new BigDecimal("50000.00"))
                .remark("Counter Cash Withdrawal")
                .manualReferenceId("VOUCHER-WD-001")
                .manualAuditNote("Customer present in person")
                .currency("MMK")
                .build();

        when(manualTransactionsRepository.existsByReferenceId("VOUCHER-WD-001")).thenReturn(false);
        when(accountRepository.findByAccountNumberForUpdate("1000000001")).thenReturn(Optional.of(customerAccount));
        when(feeScheduleRepository.findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(TransactionType.OTC_WITHDRAWAL))
                .thenReturn(Optional.empty()); // Zero fee
        when(ledgerAccountRepository.findByCustomerAccount(customerAccount)).thenReturn(Optional.of(customerDepositLedger));
        when(ledgerAccountRepository.findByLedgerCode("GL-VAULT-CASH")).thenReturn(Optional.of(vaultCashLedger));

        OtcTransactionResponseDto response = otcTransactionService.processWithdrawal(request, "IDEMP-WD-1");

        assertNotNull(response);
        assertEquals(TransactionType.OTC_WITHDRAWAL, response.getTransactionType());
        assertEquals(TransactionStatus.COMPLETED, response.getStatus());
        assertEquals(new BigDecimal("50000.00"), response.getAmount());

        // Balances: 500,000 - 50,000 = 450,000 (using compareTo to ignore trailing zeroes scale)
        assertEquals(0, new BigDecimal("450000.00").compareTo(customerAccount.getCurrentBalance()));
        verify(accountRepository).save(customerAccount);
        verify(bankTransactionRepository).save(any(BankTransactions.class));
        verify(ledgerEntryRepository, atLeast(2)).save(any(LedgerEntries.class));
        verify(asyncNotificationService).sendWithdrawalNotificationAsync(eq(customer), eq(customerAccount), any());
    }

    @Test
    @DisplayName("processWithdrawal - insufficient funds violating minimum balance throws exception")
    void processWithdrawal_InsufficientFunds_ThrowsException() {
        // Balance = 500,000, Min Balance = 10,000 -> trying to withdraw 495,000 leaves 5,000 < 10,000
        OtcTransactionRequestDto request = OtcTransactionRequestDto.builder()
                .accountNumber("1000000001")
                .amount(new BigDecimal("495000.00"))
                .remark("Withdrawal")
                .manualReferenceId("VOUCHER-WD-002")
                .manualAuditNote("Note")
                .build();

        when(manualTransactionsRepository.existsByReferenceId("VOUCHER-WD-002")).thenReturn(false);
        when(accountRepository.findByAccountNumberForUpdate("1000000001")).thenReturn(Optional.of(customerAccount));
        when(feeScheduleRepository.findFirstByTransactionTypeAndIsActiveTrueOrderByCreatedAtDesc(TransactionType.OTC_WITHDRAWAL))
                .thenReturn(Optional.empty());

        assertThrows(InsufficientFundsException.class, () ->
                otcTransactionService.processWithdrawal(request, null));
    }

    @Test
    @DisplayName("processWithdrawal - daily withdrawal limit exceeded throws TransactionException")
    void processWithdrawal_DailyLimitExceeded_ThrowsException() {
        SystemParameters paramDailyLimit = SystemParameters.builder()
                .parameterKey("OTC_DAILY_WITHDRAWAL_LIMIT")
                .parameterValue("100000.00")
                .build();
        lenient().when(systemParametersRepository.findByParameterKeyIgnoreCase("OTC_DAILY_WITHDRAWAL_LIMIT"))
                .thenReturn(Optional.of(paramDailyLimit));

        lenient().when(bankTransactionRepository.findTodayTotalOtcWithdrawnAmount(any(), any(), any()))
                .thenReturn(new BigDecimal("80000.00"));

        OtcTransactionRequestDto request = OtcTransactionRequestDto.builder()
                .accountNumber("1000000001")
                .amount(new BigDecimal("50000.00")) // 80,000 + 50,000 > 100,000
                .remark("Withdrawal")
                .manualReferenceId("VOUCHER-WD-003")
                .manualAuditNote("Note")
                .build();

        when(manualTransactionsRepository.existsByReferenceId("VOUCHER-WD-003")).thenReturn(false);
        when(accountRepository.findByAccountNumberForUpdate("1000000001")).thenReturn(Optional.of(customerAccount));

        TransactionException ex = assertThrows(TransactionException.class, () ->
                otcTransactionService.processWithdrawal(request, null));
        assertTrue(ex.getMessage().contains("Daily withdrawal limit exceeded"));
    }

    // =========================================================================
    // 4. CASH SUMMARY & HELPER TESTS
    // =========================================================================

    @Test
    @DisplayName("getDailyCashSummary - correctly computes deposits, withdrawals, and net cash in drawer")
    void getDailyCashSummary_TodayScope() {
        BankTransactions dep1 = BankTransactions.builder()
                .transactionType(TransactionType.OTC_DEPOSIT)
                .amount(new BigDecimal("100000.00"))
                .build();
        BankTransactions dep2 = BankTransactions.builder()
                .transactionType(TransactionType.OTC_DEPOSIT)
                .amount(new BigDecimal("50000.00"))
                .build();
        BankTransactions wd1 = BankTransactions.builder()
                .transactionType(TransactionType.OTC_WITHDRAWAL)
                .amount(new BigDecimal("30000.00"))
                .build();

        when(bankTransactionRepository.findTodayOtcTransactionsByStaff(eq(tellerStaff.getStaffId()), any(), any()))
                .thenReturn(List.of(dep1, dep2, wd1));

        DailyCashSummaryDto summary = otcTransactionService.getDailyCashSummary("today");

        assertNotNull(summary);
        assertEquals("teller_mgmg", summary.getTellerUsername());
        assertEquals("Mg Mg (Teller)", summary.getTellerFullName());
        assertEquals(new BigDecimal("150000.00"), summary.getTotalCashIn());
        assertEquals(new BigDecimal("30000.00"), summary.getTotalCashOut());
        assertEquals(new BigDecimal("120000.00"), summary.getNetCashInDrawer());
        assertEquals(3, summary.getTotalTransactions());
        assertEquals(2, summary.getDepositCount());
        assertEquals(1, summary.getWithdrawalCount());
        assertEquals("TODAY", summary.getScope());
    }

    @Test
    @DisplayName("isReferenceIdDuplicate - delegates to manualTransactionsRepository")
    void isReferenceIdDuplicate_DelegatesToRepo() {
        when(manualTransactionsRepository.existsByReferenceId("REF-123")).thenReturn(true);
        when(manualTransactionsRepository.existsByReferenceId("REF-456")).thenReturn(false);

        assertTrue(otcTransactionService.isReferenceIdDuplicate("REF-123"));
        assertFalse(otcTransactionService.isReferenceIdDuplicate("REF-456"));
    }
}
