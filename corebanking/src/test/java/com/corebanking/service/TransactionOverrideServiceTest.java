package com.corebanking.service;

import com.corebanking.dto.TransactionFlagRequestDto;
import com.corebanking.dto.TransactionOverrideRequestDto;
import com.corebanking.dto.TransactionOverrideResponseDto;
import com.corebanking.entity.AccountHolds;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.TransactionReviewActions;
import com.corebanking.entity.enums.HoldStatus;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.repository.AccountHoldsReviewRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.repository.TransactionReviewActionsRepository;
import com.corebanking.repository.TransactionReviewRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Comprehensive Unit Test suite for {@link TransactionOverrideServiceImpl}.
 * Validates transaction flagging, hold management, managerial overrides (release/reject),
 * defensive error boundaries, and immutable audit trail generation.
 */
@ExtendWith(MockitoExtension.class)
class TransactionOverrideServiceTest {

    @Mock
    private TransactionReviewRepository transactionReviewRepository;

    @Mock
    private TransactionReviewActionsRepository transactionReviewActionsRepository;

    @Mock
    private AccountHoldsReviewRepository accountHoldsReviewRepository;

    @Mock
    private StaffUsersRepository staffUsersRepository;

    @Mock
    private AuditTrailService auditTrailService;

    @InjectMocks
    private TransactionOverrideServiceImpl transactionOverrideService;

    private UUID transactionId;
    private BankTransactions mockTransaction;
    private Accounts mockSourceAccount;

    @BeforeEach
    void setUp() {
        transactionId = UUID.randomUUID();

        mockSourceAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("1001234567")
                .build();

        mockTransaction = BankTransactions.builder()
                .transactionId(transactionId)
                .transactionRef("TX-20261014-998811")
                .amount(new BigDecimal("10000000.0000"))
                .currency("MMK")
                .status(TransactionStatus.INITIATED)
                .sourceAccount(mockSourceAccount)
                .updatedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Should successfully flag suspicious transaction, place account hold, and capture audit log")
    void flagSuspiciousTransaction_Success() {
        when(transactionReviewRepository.findById(transactionId)).thenReturn(Optional.of(mockTransaction));
        when(transactionReviewRepository.save(any(BankTransactions.class))).thenAnswer(i -> i.getArgument(0));
        when(transactionReviewActionsRepository.save(any(TransactionReviewActions.class))).thenAnswer(i -> i.getArgument(0));

        TransactionFlagRequestDto request = TransactionFlagRequestDto.builder()
                .reason("Unusual large amount transfer off-hours")
                .riskLevel("HIGH")
                .resolutionNote("AML team requested hold")
                .build();

        TransactionOverrideResponseDto response = transactionOverrideService.flagSuspiciousTransaction(transactionId, request);

        assertThat(response).isNotNull();
        assertThat(response.getTransactionId()).isEqualTo(transactionId);
        assertThat(response.getCurrentStatus()).isEqualTo("HELD");
        assertThat(response.getAction()).isEqualTo("FLAG");
        assertThat(response.getRiskLevel()).isEqualTo("HIGH");
        assertThat(response.getReason()).isEqualTo(request.getReason());

        assertThat(mockTransaction.getStatus()).isEqualTo(TransactionStatus.HELD);

        verify(accountHoldsReviewRepository, times(1)).save(any(AccountHolds.class));
        verify(transactionReviewActionsRepository, times(1)).save(any(TransactionReviewActions.class));
        verify(auditTrailService, times(1)).logDataChange(
                eq("FLAG_TRANSACTION"),
                eq("TRANSACTION"),
                eq("TX-20261014-998811"),
                any(),
                any(),
                contains("Transaction flagged as suspicious")
        );
    }

    @Test
    @DisplayName("Should throw IllegalStateException when attempting to flag an already COMPLETED transaction")
    void flagSuspiciousTransaction_Completed_ThrowsException() {
        mockTransaction.setStatus(TransactionStatus.COMPLETED);
        when(transactionReviewRepository.findById(transactionId)).thenReturn(Optional.of(mockTransaction));

        TransactionFlagRequestDto request = TransactionFlagRequestDto.builder()
                .reason("Belated suspicion")
                .build();

        assertThatThrownBy(() -> transactionOverrideService.flagSuspiciousTransaction(transactionId, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot flag already COMPLETED transaction");

        verify(transactionReviewRepository, never()).save(any());
        verify(accountHoldsReviewRepository, never()).save(any());
        verify(auditTrailService, never()).logDataChange(any(), any(), any(), any(), any(), any());
    }

    @Test
    @DisplayName("Should throw IllegalStateException when attempting to flag an already HELD transaction")
    void flagSuspiciousTransaction_AlreadyHeld_ThrowsException() {
        mockTransaction.setStatus(TransactionStatus.HELD);
        when(transactionReviewRepository.findById(transactionId)).thenReturn(Optional.of(mockTransaction));

        TransactionFlagRequestDto request = TransactionFlagRequestDto.builder()
                .reason("Duplicate hold attempt")
                .build();

        assertThatThrownBy(() -> transactionOverrideService.flagSuspiciousTransaction(transactionId, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Transaction is already in HELD status");
    }

    @Test
    @DisplayName("Should successfully release held transaction, unfreeze hold, and update to COMPLETED")
    void resolveTransaction_Release_Success() {
        mockTransaction.setStatus(TransactionStatus.HELD);
        when(transactionReviewRepository.findById(transactionId)).thenReturn(Optional.of(mockTransaction));
        when(transactionReviewRepository.save(any(BankTransactions.class))).thenAnswer(i -> i.getArgument(0));
        when(transactionReviewActionsRepository.save(any(TransactionReviewActions.class))).thenAnswer(i -> i.getArgument(0));

        AccountHolds activeHold = AccountHolds.builder()
                .holdId(UUID.randomUUID())
                .status(HoldStatus.ACTIVE)
                .transaction(mockTransaction)
                .build();
        when(accountHoldsReviewRepository.findByTransactionTransactionIdAndStatus(transactionId, HoldStatus.ACTIVE))
                .thenReturn(List.of(activeHold));

        TransactionOverrideRequestDto request = TransactionOverrideRequestDto.builder()
                .action("RELEASE")
                .reason("Customer identity verified, KYC confirmed genuine trade")
                .resolutionNote("Senior Manager approved")
                .build();

        TransactionOverrideResponseDto response = transactionOverrideService.resolveTransaction(transactionId, request);

        assertThat(response).isNotNull();
        assertThat(response.getCurrentStatus()).isEqualTo("COMPLETED");
        assertThat(response.getAction()).isEqualTo("RELEASE");

        assertThat(mockTransaction.getStatus()).isEqualTo(TransactionStatus.COMPLETED);
        assertThat(activeHold.getStatus()).isEqualTo(HoldStatus.RELEASED);

        verify(accountHoldsReviewRepository, times(1)).save(activeHold);
        verify(auditTrailService, times(1)).logDataChange(
                eq("OVERRIDE_TRANSACTION_RELEASE"),
                eq("TRANSACTION"),
                eq("TX-20261014-998811"),
                any(),
                any(),
                contains("Transaction override RELEASE")
        );
    }

    @Test
    @DisplayName("Should successfully reject held transaction, release hold, and mark REJECTED")
    void resolveTransaction_Reject_Success() {
        mockTransaction.setStatus(TransactionStatus.HELD);
        when(transactionReviewRepository.findById(transactionId)).thenReturn(Optional.of(mockTransaction));
        when(transactionReviewRepository.save(any(BankTransactions.class))).thenAnswer(i -> i.getArgument(0));
        when(transactionReviewActionsRepository.save(any(TransactionReviewActions.class))).thenAnswer(i -> i.getArgument(0));

        AccountHolds activeHold = AccountHolds.builder()
                .holdId(UUID.randomUUID())
                .status(HoldStatus.ACTIVE)
                .transaction(mockTransaction)
                .build();
        when(accountHoldsReviewRepository.findByTransactionTransactionIdAndStatus(transactionId, HoldStatus.ACTIVE))
                .thenReturn(List.of(activeHold));

        TransactionOverrideRequestDto request = TransactionOverrideRequestDto.builder()
                .action("REJECT")
                .reason("Confirmed fraudulent attempt, card stolen")
                .build();

        TransactionOverrideResponseDto response = transactionOverrideService.resolveTransaction(transactionId, request);

        assertThat(response).isNotNull();
        assertThat(response.getCurrentStatus()).isEqualTo("REJECTED");
        assertThat(response.getAction()).isEqualTo("REJECT");

        assertThat(mockTransaction.getStatus()).isEqualTo(TransactionStatus.REJECTED);
        assertThat(mockTransaction.getFailureCode()).isEqualTo("ADMIN_REJECTED");
        assertThat(activeHold.getStatus()).isEqualTo(HoldStatus.RELEASED);

        verify(auditTrailService, times(1)).logDataChange(
                eq("OVERRIDE_TRANSACTION_REJECT"),
                eq("TRANSACTION"),
                eq("TX-20261014-998811"),
                any(),
                any(),
                contains("Transaction override REJECT")
        );
    }

    @Test
    @DisplayName("Should throw IllegalStateException when resolving transaction not in reviewable state")
    void resolveTransaction_InvalidState_ThrowsException() {
        mockTransaction.setStatus(TransactionStatus.COMPLETED);
        when(transactionReviewRepository.findById(transactionId)).thenReturn(Optional.of(mockTransaction));

        TransactionOverrideRequestDto request = TransactionOverrideRequestDto.builder()
                .action("RELEASE")
                .reason("Attempted override on completed transaction")
                .build();

        assertThatThrownBy(() -> transactionOverrideService.resolveTransaction(transactionId, request))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Transaction is not in a reviewable state");
    }

    @Test
    @DisplayName("Should retrieve paginated review queue transactions")
    void getPendingOrFlaggedTransactions_Success() {
        Pageable pageable = PageRequest.of(0, 10);
        Page<BankTransactions> mockPage = new PageImpl<>(List.of(mockTransaction), pageable, 1);

        when(transactionReviewRepository.findByStatus(TransactionStatus.HELD, pageable)).thenReturn(mockPage);

        Page<TransactionOverrideResponseDto> result = transactionOverrideService.getPendingOrFlaggedTransactions("HELD", pageable);

        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getTransactionRef()).isEqualTo("TX-20261014-998811");
    }

    @Test
    @DisplayName("Should retrieve chronological review history for transaction")
    void getTransactionReviewHistory_Success() {
        TransactionReviewActions action = TransactionReviewActions.builder()
                .reviewId(UUID.randomUUID())
                .transaction(mockTransaction)
                .action("FLAG")
                .oldStatus("INITIATED")
                .newStatus("HELD")
                .riskLevel("HIGH")
                .reason("AML Alert")
                .performedAt(LocalDateTime.now())
                .build();

        when(transactionReviewActionsRepository.findByTransactionTransactionIdOrderByPerformedAtDesc(transactionId))
                .thenReturn(List.of(action));

        List<TransactionOverrideResponseDto> history = transactionOverrideService.getTransactionReviewHistory(transactionId);

        assertThat(history).isNotEmpty();
        assertThat(history.get(0).getAction()).isEqualTo("FLAG");
        assertThat(history.get(0).getRiskLevel()).isEqualTo("HIGH");
        assertThat(history.get(0).getReason()).isEqualTo("AML Alert");
    }
}
