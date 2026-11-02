package com.corebanking.service;

import com.corebanking.dto.AccountFreezeRequestDto;
import com.corebanking.dto.AccountFreezeResponseDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.repository.AccountRepository;
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

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive Unit Test suite for {@link AccountFreezeServiceImpl}.
 * Verifies business logic boundaries, state machine transitions (ACTIVE <-> FROZEN),
 * defensive exception triggers, and immutable audit trail generation.
 */
@ExtendWith(MockitoExtension.class)
class AccountFreezeServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private AuditTrailService auditTrailService;

    @InjectMocks
    private AccountFreezeServiceImpl accountFreezeService;

    private UUID accountId;
    private Accounts mockAccount;
    private AccountFreezeRequestDto validRequest;

    @BeforeEach
    void setUp() {
        accountId = UUID.randomUUID();

        mockAccount = Accounts.builder()
                .accountId(accountId)
                .accountNumber("1009876543")
                .status(AccountStatus.ACTIVE)
                .currentBalance(new BigDecimal("1500000.0000"))
                .openedAt(LocalDateTime.now().minusMonths(6))
                .build();

        validRequest = AccountFreezeRequestDto.builder()
                .reason("Suspected fraud velocity detected by AML engine")
                .build();
    }

    @Test
    @DisplayName("Should successfully freeze an ACTIVE account and trigger audit log data change")
    void freezeAccount_Success() {
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(mockAccount));
        when(accountRepository.save(any(Accounts.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AccountFreezeResponseDto response = accountFreezeService.freezeAccount(accountId, validRequest);

        assertThat(response).isNotNull();
        assertThat(response.getAccountId()).isEqualTo(accountId);
        assertThat(response.getAccountNumber()).isEqualTo("1009876543");
        assertThat(response.getPreviousStatus()).isEqualTo("ACTIVE");
        assertThat(response.getCurrentStatus()).isEqualTo("FROZEN");
        assertThat(response.getReason()).isEqualTo(validRequest.getReason());
        assertThat(response.getUpdatedAt()).isNotNull();

        assertThat(mockAccount.getStatus()).isEqualTo(AccountStatus.FROZEN);

        verify(accountRepository, times(1)).save(mockAccount);
        verify(auditTrailService, times(1)).logDataChange(
                eq("FREEZE_ACCOUNT"),
                eq("ACCOUNT"),
                eq("1009876543"),
                any(),
                any(),
                contains("Account frozen: Suspected fraud velocity")
        );
    }

    @Test
    @DisplayName("Should throw IllegalStateException when attempting to freeze an already FROZEN account")
    void freezeAccount_AlreadyFrozen_ThrowsException() {
        mockAccount.setStatus(AccountStatus.FROZEN);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(mockAccount));

        assertThatThrownBy(() -> accountFreezeService.freezeAccount(accountId, validRequest))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Account is already frozen");

        verify(accountRepository, never()).save(any());
        verify(auditTrailService, never()).logDataChange(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should throw IllegalStateException when attempting to freeze a CLOSED account")
    void freezeAccount_ClosedAccount_ThrowsException() {
        mockAccount.setStatus(AccountStatus.CLOSED);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(mockAccount));

        assertThatThrownBy(() -> accountFreezeService.freezeAccount(accountId, validRequest))
                .isInstanceOf(IllegalStateException.class)
                .hasMessage("Cannot freeze a closed account");

        verify(accountRepository, never()).save(any());
        verify(auditTrailService, never()).logDataChange(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should throw AccountNotFoundException when freezing non-existent account")
    void freezeAccount_NotFound_ThrowsException() {
        when(accountRepository.findById(accountId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> accountFreezeService.freezeAccount(accountId, validRequest))
                .isInstanceOf(AccountNotFoundException.class)
                .hasMessageContaining("Account not found with ID: " + accountId);

        verify(accountRepository, never()).save(any());
        verify(auditTrailService, never()).logDataChange(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should successfully unfreeze a FROZEN account back to ACTIVE and trigger audit log data change")
    void unfreezeAccount_Success() {
        mockAccount.setStatus(AccountStatus.FROZEN);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(mockAccount));
        when(accountRepository.save(any(Accounts.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AccountFreezeRequestDto unfreezeRequest = AccountFreezeRequestDto.builder()
                .reason("KYC verification completed and customer cleared by Compliance")
                .build();

        AccountFreezeResponseDto response = accountFreezeService.unfreezeAccount(accountId, unfreezeRequest);

        assertThat(response).isNotNull();
        assertThat(response.getAccountId()).isEqualTo(accountId);
        assertThat(response.getAccountNumber()).isEqualTo("1009876543");
        assertThat(response.getPreviousStatus()).isEqualTo("FROZEN");
        assertThat(response.getCurrentStatus()).isEqualTo("ACTIVE");
        assertThat(response.getReason()).isEqualTo(unfreezeRequest.getReason());
        assertThat(response.getUpdatedAt()).isNotNull();

        assertThat(mockAccount.getStatus()).isEqualTo(AccountStatus.ACTIVE);

        verify(accountRepository, times(1)).save(mockAccount);
        verify(auditTrailService, times(1)).logDataChange(
                eq("UNFREEZE_ACCOUNT"),
                eq("ACCOUNT"),
                eq("1009876543"),
                any(),
                any(),
                contains("Account unfrozen: KYC verification completed")
        );
    }

    @Test
    @DisplayName("Should throw IllegalStateException when attempting to unfreeze a non-FROZEN account")
    void unfreezeAccount_NotFrozen_ThrowsException() {
        mockAccount.setStatus(AccountStatus.ACTIVE);
        when(accountRepository.findById(accountId)).thenReturn(Optional.of(mockAccount));

        assertThatThrownBy(() -> accountFreezeService.unfreezeAccount(accountId, validRequest))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Only frozen accounts can be unfrozen. Current status: ACTIVE");

        verify(accountRepository, never()).save(any());
        verify(auditTrailService, never()).logDataChange(any(), any(), any(), any(), any(), any());
    }
}
