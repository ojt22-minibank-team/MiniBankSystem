package com.corebanking.service;

import com.corebanking.dto.CusTransactionHistoryItemDTO;
import com.corebanking.dto.CusTransactionHistoryResponseDTO;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.repository.CusTransactionHistoryRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CusTransactionServiceTest {

    private static final UUID CUSTOMER_ID =
            UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String ACCOUNT_NUMBER = "2003513817";
    private static final String TRANSACTION_REF = "TXN-P2P-20261019-6123";

    @Mock
    private CusTransactionHistoryRepository repository;

    @InjectMocks
    private CusTransactionService transactionService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // -------------------------------------------------------------------------
    // Security Context Helper
    // -------------------------------------------------------------------------

    @SuppressWarnings({"rawtypes", "unchecked"})
    private void mockCustomerAuthentication(UUID customerId) {
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn(customerId.toString());

        doReturn((Collection) List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                .when(authentication).getAuthorities();

        SecurityContextHolder.setContext(securityContext);
    }

    // -------------------------------------------------------------------------
    // Test Fixture Helper
    // -------------------------------------------------------------------------

    private CusTransactionHistoryItemDTO createSampleTransactionItem(String ref, String accountNumber) {
        return CusTransactionHistoryItemDTO.builder()
                .transactionRef(ref)
                .transactionDate(LocalDateTime.of(2026, 10, 19, 14, 20))
                .transactionType("INTERNAL_TRANSFER")
                .status("COMPLETED")
                .direction("OUT")
                .amount(new BigDecimal("1000.00"))
                .currency("MMK")
                .serviceFee(BigDecimal.ZERO)
                .description("P2P Transfer")
                .sourceAccountNumber(accountNumber)
                .destinationAccountNumber("1008207493")
                .isOwnAccount(true)
                .displayTitle("Transfer to Own Account")
                .build();
    }

    // =========================================================================
    // PART A — TRANSACTION HISTORY LIST TESTS
    // =========================================================================

    @Test
    @DisplayName("Valid request retrieves transaction history and calculates pagination metadata correctly")
    void getTransactionHistory_validRequest_returnsResponseWithPagination() {
        mockCustomerAuthentication(CUSTOMER_ID);

        List<CusTransactionHistoryItemDTO> items = new ArrayList<>();
        for (int i = 1; i <= 10; i++) {
            items.add(createSampleTransactionItem("TXN-" + i, ACCOUNT_NUMBER));
        }

        CusTransactionHistoryRepository.ProcedureResult procedureResult =
                CusTransactionHistoryRepository.ProcedureResult.builder()
                        .items(items)
                        .totalElements(25L)
                        .build();

        when(repository.getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10))
                .thenReturn(procedureResult);

        CusTransactionHistoryResponseDTO response = transactionService.getTransactionHistory(
                ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10
        );

        assertNotNull(response);
        assertEquals(0, response.getPage());
        assertEquals(10, response.getSize());
        assertEquals(25L, response.getTotalElements());
        assertEquals(3, response.getTotalPages());
        assertTrue(response.isFirst());
        assertFalse(response.isLast());
        assertTrue(response.isHasNext());
        assertFalse(response.isHasPrevious());
        assertEquals(10, response.getContent().size());

        verify(repository).getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10);
    }

    @Test
    @DisplayName("Unauthenticated caller throws CusAuthenticationException")
    void getTransactionHistory_unauthenticated_throwsCusAuthenticationException() {
        CusAuthenticationException ex = assertThrows(
                CusAuthenticationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10)
        );

        assertEquals("Customer authentication is required.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Authenticated principal missing ROLE_CUSTOMER throws CusAuthenticationException")
    @SuppressWarnings({"rawtypes", "unchecked"})
    void getTransactionHistory_missingCustomerRole_throwsCusAuthenticationException() {
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        doReturn((Collection) List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
                .when(authentication).getAuthorities();

        SecurityContextHolder.setContext(securityContext);

        CusAuthenticationException ex = assertThrows(
                CusAuthenticationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10)
        );

        assertEquals("Customer access is required.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Authenticated principal with invalid UUID throws CusAuthenticationException")
    @SuppressWarnings({"rawtypes", "unchecked"})
    void getTransactionHistory_invalidUuidPrincipal_throwsCusAuthenticationException() {
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("not-a-valid-uuid");
        doReturn((Collection) List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                .when(authentication).getAuthorities();

        SecurityContextHolder.setContext(securityContext);

        CusAuthenticationException ex = assertThrows(
                CusAuthenticationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10)
        );

        assertEquals("Invalid customer identity.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Explicit null customer UUID throws CusAuthenticationException")
    void getTransactionHistory_nullCustomerId_throwsCusAuthenticationException() {
        CusAuthenticationException ex = assertThrows(
                CusAuthenticationException.class,
                () -> transactionService.getTransactionHistory((UUID) null, ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10)
        );

        assertEquals("Customer identity is required.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Blank account number throws CusValidationException")
    void getTransactionHistory_blankAccountNumber_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionHistory("   ", null, null, null, null, null, null, 0, 10)
        );

        assertEquals("Account number is required.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Negative page index throws CusValidationException")
    void getTransactionHistory_negativePage_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, -1, 10)
        );

        assertEquals("Page index cannot be negative.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Page size of zero throws CusValidationException")
    void getTransactionHistory_pageSizeZero_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 0)
        );

        assertEquals("Page size must be between 1 and 100.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Page size greater than 100 throws CusValidationException")
    void getTransactionHistory_pageSizeOver100_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 101)
        );

        assertEquals("Page size must be between 1 and 100.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Boundary page sizes 1 and 100 succeed without validation error")
    void getTransactionHistory_boundaryPageSizes_succeed() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusTransactionHistoryRepository.ProcedureResult emptyResult =
                CusTransactionHistoryRepository.ProcedureResult.builder()
                        .items(Collections.emptyList())
                        .totalElements(0L)
                        .build();

        when(repository.getTransactionHistory(eq(CUSTOMER_ID), eq(ACCOUNT_NUMBER), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), eq(0), anyInt()))
                .thenReturn(emptyResult);

        assertDoesNotThrow(() ->
                transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 1)
        );
        assertDoesNotThrow(() ->
                transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 100)
        );

        verify(repository).getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 1);
        verify(repository).getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 100);
    }

    @Test
    @DisplayName("Invalid transaction status string throws CusValidationException")
    void getTransactionHistory_invalidStatus_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, "NON_EXISTENT_STATUS", null, null, null, null, null, 0, 10)
        );

        assertEquals("Unsupported transaction status: NON_EXISTENT_STATUS", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Invalid transaction type string throws CusValidationException")
    void getTransactionHistory_invalidTransactionType_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, "UNKNOWN_TYPE", null, null, null, null, 0, 10)
        );

        assertEquals("Unsupported transaction type: UNKNOWN_TYPE", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Valid status and transaction type are trimmed and forwarded to repository")
    void getTransactionHistory_validStatusAndType_delegateNormalizedValues() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusTransactionHistoryRepository.ProcedureResult emptyResult =
                CusTransactionHistoryRepository.ProcedureResult.builder()
                        .items(Collections.emptyList())
                        .totalElements(0L)
                        .build();

        when(repository.getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, "COMPLETED", "INTERNAL_TRANSFER", null, null, null, null, 0, 10))
                .thenReturn(emptyResult);

        transactionService.getTransactionHistory(
                ACCOUNT_NUMBER, "  COMPLETED  ", "  INTERNAL_TRANSFER  ", null, null, null, null, 0, 10
        );

        verify(repository).getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, "COMPLETED", "INTERNAL_TRANSFER", null, null, null, null, 0, 10);
    }

    @Test
    @DisplayName("From Date after To Date throws CusValidationException")
    void getTransactionHistory_fromDateAfterToDate_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.of(2026, 10, 20);
        LocalDate toDate = LocalDate.of(2026, 10, 10);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, fromDate, toDate, null, null, 0, 10)
        );

        assertEquals("From Date cannot be later than To Date.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Negative minimum amount throws CusValidationException")
    void getTransactionHistory_negativeMinAmount_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, new BigDecimal("-1.00"), null, 0, 10)
        );

        assertEquals("Minimum amount cannot be negative.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Negative maximum amount throws CusValidationException")
    void getTransactionHistory_negativeMaxAmount_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, new BigDecimal("-1.00"), 0, 10)
        );

        assertEquals("Maximum amount cannot be negative.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Minimum amount greater than maximum amount throws CusValidationException")
    void getTransactionHistory_minAmountGreaterThanMaxAmount_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionHistory(
                        ACCOUNT_NUMBER, null, null, null, null, new BigDecimal("500.00"), new BigDecimal("100.00"), 0, 10
                )
        );

        assertEquals("Minimum amount cannot be greater than maximum amount.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("SQLSTATE 45000 access denied database error translates to AccountNotFoundException")
    void getTransactionHistory_spAccountNotFoundError_translatesToAccountNotFoundException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        SQLException sqlException = new SQLException(
                "Account not found or access denied for this customer",
                "45000"
        );
        DataAccessException dae = new DataAccessException("SP failed", sqlException) {};

        when(repository.getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10))
                .thenThrow(dae);

        AccountNotFoundException ex = assertThrows(
                AccountNotFoundException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10)
        );

        assertEquals("Account not found or access denied for this customer", ex.getMessage());
        verify(repository).getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10);
    }

    // =========================================================================
    // PART B — PAGINATION EDGE BEHAVIOR
    // =========================================================================

    @Test
    @DisplayName("Empty repository result produces zero totalPages with first and last true")
    void getTransactionHistory_emptyResult_returnsEmptyPagination() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusTransactionHistoryRepository.ProcedureResult emptyResult =
                CusTransactionHistoryRepository.ProcedureResult.builder()
                        .items(Collections.emptyList())
                        .totalElements(0L)
                        .build();

        when(repository.getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10))
                .thenReturn(emptyResult);

        CusTransactionHistoryResponseDTO response = transactionService.getTransactionHistory(
                ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10
        );

        assertNotNull(response);
        assertEquals(0, response.getPage());
        assertEquals(10, response.getSize());
        assertEquals(0L, response.getTotalElements());
        assertEquals(0, response.getTotalPages());
        assertTrue(response.isFirst());
        assertTrue(response.isLast());
        assertFalse(response.isHasNext());
        assertFalse(response.isHasPrevious());
        assertTrue(response.getContent().isEmpty());
    }

    // =========================================================================
    // PART C — TRANSACTION DETAIL TESTS
    // =========================================================================

    @Test
    @DisplayName("Valid transaction detail request retrieves expected item DTO from repository")
    void getTransactionDetail_validRequest_returnsDetailDTO() {
        mockCustomerAuthentication(CUSTOMER_ID);
        CusTransactionHistoryItemDTO expectedItem = createSampleTransactionItem(TRANSACTION_REF, ACCOUNT_NUMBER);

        when(repository.getTransactionDetail(CUSTOMER_ID, TRANSACTION_REF, ACCOUNT_NUMBER))
                .thenReturn(expectedItem);

        CusTransactionHistoryItemDTO result = transactionService.getTransactionDetail(TRANSACTION_REF, ACCOUNT_NUMBER);

        assertNotNull(result);
        assertEquals(TRANSACTION_REF, result.getTransactionRef());
        assertEquals(ACCOUNT_NUMBER, result.getSourceAccountNumber());
        assertEquals(new BigDecimal("1000.00"), result.getAmount());
        assertEquals("COMPLETED", result.getStatus());
        assertEquals("Transfer to Own Account", result.getDisplayTitle());

        verify(repository).getTransactionDetail(CUSTOMER_ID, TRANSACTION_REF, ACCOUNT_NUMBER);
    }

    @Test
    @DisplayName("Blank transaction reference throws CusValidationException")
    void getTransactionDetail_blankTransactionRef_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionDetail("   ", ACCOUNT_NUMBER)
        );

        assertEquals("Transaction reference is required.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Blank account number for detail throws CusValidationException")
    void getTransactionDetail_blankAccountNumber_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getTransactionDetail(TRANSACTION_REF, "")
        );

        assertEquals("Account number is required.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Unauthenticated caller for detail throws CusAuthenticationException")
    void getTransactionDetail_unauthenticated_throwsCusAuthenticationException() {
        CusAuthenticationException ex = assertThrows(
                CusAuthenticationException.class,
                () -> transactionService.getTransactionDetail(TRANSACTION_REF, ACCOUNT_NUMBER)
        );

        assertEquals("Customer authentication is required.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    @Test
    @DisplayName("Detail request for non-existent or inaccessible transaction propagates AccountNotFoundException")
    void getTransactionDetail_notFoundOrAccessDenied_throwsAccountNotFoundException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        when(repository.getTransactionDetail(CUSTOMER_ID, TRANSACTION_REF, ACCOUNT_NUMBER))
                .thenThrow(new AccountNotFoundException("Transaction not found or access denied for this account"));

        AccountNotFoundException ex = assertThrows(
                AccountNotFoundException.class,
                () -> transactionService.getTransactionDetail(TRANSACTION_REF, ACCOUNT_NUMBER)
        );

        assertEquals("Transaction not found or access denied for this account", ex.getMessage());
        verify(repository).getTransactionDetail(CUSTOMER_ID, TRANSACTION_REF, ACCOUNT_NUMBER);
    }

    // =========================================================================
    // PART D — DISTINCT STATUS TESTS
    // =========================================================================

    @Test
    @DisplayName("Retrieves distinct statuses from repository for authenticated customer")
    void getDistinctStatuses_validAccount_returnsStatuses() {
        mockCustomerAuthentication(CUSTOMER_ID);
        List<String> expectedStatuses = List.of("COMPLETED", "FAILED");

        when(repository.getDistinctStatuses(CUSTOMER_ID, ACCOUNT_NUMBER))
                .thenReturn(expectedStatuses);

        List<String> result = transactionService.getDistinctStatuses(ACCOUNT_NUMBER);

        assertEquals(expectedStatuses, result);
        verify(repository).getDistinctStatuses(CUSTOMER_ID, ACCOUNT_NUMBER);
    }

    @Test
    @DisplayName("Blank account number for distinct statuses throws CusValidationException")
    void getDistinctStatuses_blankAccountNumber_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getDistinctStatuses("   ")
        );

        assertEquals("Account number is required.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    // =========================================================================
    // PART E — DISTINCT TYPE TESTS
    // =========================================================================

    @Test
    @DisplayName("Retrieves distinct transaction types from repository for authenticated customer")
    void getDistinctTypes_validAccount_returnsTypes() {
        mockCustomerAuthentication(CUSTOMER_ID);
        List<String> expectedTypes = List.of("INTERNAL_TRANSFER", "OTC_DEPOSIT");

        when(repository.getDistinctTypes(CUSTOMER_ID, ACCOUNT_NUMBER))
                .thenReturn(expectedTypes);

        List<String> result = transactionService.getDistinctTypes(ACCOUNT_NUMBER);

        assertEquals(expectedTypes, result);
        verify(repository).getDistinctTypes(CUSTOMER_ID, ACCOUNT_NUMBER);
    }

    @Test
    @DisplayName("Blank account number for distinct types throws CusValidationException")
    void getDistinctTypes_blankAccountNumber_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> transactionService.getDistinctTypes((String) null)
        );

        assertEquals("Account number is required.", ex.getMessage());
        verifyNoInteractions(repository);
    }

    // =========================================================================
    // PART F — OPTIONAL GENERIC DATABASE ERROR
    // =========================================================================

    @Test
    @DisplayName("Generic unhandled DataAccessException is rethrown as-is")
    void getTransactionHistory_unhandledDataAccessException_rethrowsOriginalException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        DataAccessException dae = new DataAccessException("Connection pool exhausted") {};

        when(repository.getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10))
                .thenThrow(dae);

        DataAccessException ex = assertThrows(
                DataAccessException.class,
                () -> transactionService.getTransactionHistory(ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10)
        );

        assertSame(dae, ex);
        verify(repository).getTransactionHistory(CUSTOMER_ID, ACCOUNT_NUMBER, null, null, null, null, null, null, 0, 10);
    }
}
