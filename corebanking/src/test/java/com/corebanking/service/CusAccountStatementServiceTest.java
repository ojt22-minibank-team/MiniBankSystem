package com.corebanking.service;

import com.corebanking.dto.CusAccountStatementDTO;
import com.corebanking.dto.CusStatementRowDTO;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.repository.CusAccountStatementRepository;
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
import java.util.Collection;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CusAccountStatementServiceTest {

    private static final UUID CUSTOMER_ID =
            UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String ACCOUNT_NUMBER = "2003513817";

    @Mock
    private CusAccountStatementRepository statementRepository;

    @InjectMocks
    private CusAccountStatementService statementService;

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
    // Test Data Fixture Helper
    // -------------------------------------------------------------------------

    private CusAccountStatementDTO createSampleStatement(String accountNumber, LocalDate from, LocalDate to) {
        return CusAccountStatementDTO.builder()
                .accountNumber(accountNumber)
                .accountType("CURRENT")
                .customerName("Thiri Ngwe Yee")
                .phone("0912345678")
                .nrc("12/KAMAYA(N)123456")
                .currency("MMK")
                .fromDate(from)
                .toDate(to)
                .openingBalance(new BigDecimal("200000.00"))
                .closingBalance(new BigDecimal("199000.00"))
                .numberOfCreditEntries(1)
                .totalCredit(new BigDecimal("20000.00"))
                .numberOfDebitEntries(1)
                .totalDebit(new BigDecimal("21000.00"))
                .transactions(List.of(
                        CusStatementRowDTO.builder()
                                .transactionDate(from.atTime(10, 30))
                                .transactionRef("TXN-20261019-001")
                                .description("P2P Transfer Credit to Acc: " + accountNumber)
                                .creditAmount(new BigDecimal("20000.00"))
                                .debitAmount(BigDecimal.ZERO)
                                .balance(new BigDecimal("220000.00"))
                                .build()
                ))
                .build();
    }

    // -------------------------------------------------------------------------
    // 1. Success Flow
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Valid request retrieves statement DTO and verifies repository delegation")
    void getAccountStatement_validRequest_returnsStatementDTO() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().minusDays(30);
        LocalDate toDate = LocalDate.now();

        CusAccountStatementDTO expectedStatement = createSampleStatement(ACCOUNT_NUMBER, fromDate, toDate);
        when(statementRepository.getAccountStatement(CUSTOMER_ID, ACCOUNT_NUMBER, fromDate, toDate))
                .thenReturn(expectedStatement);

        CusAccountStatementDTO result = statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate);

        assertNotNull(result);
        assertEquals(ACCOUNT_NUMBER, result.getAccountNumber());
        assertEquals(new BigDecimal("200000.00"), result.getOpeningBalance());
        assertEquals(new BigDecimal("199000.00"), result.getClosingBalance());
        assertEquals(1, result.getTransactions().size());
        verify(statementRepository).getAccountStatement(CUSTOMER_ID, ACCOUNT_NUMBER, fromDate, toDate);
    }

    // -------------------------------------------------------------------------
    // 2. Authentication Scenarios
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Unauthenticated caller throws CusAuthenticationException")
    void getAccountStatement_unauthenticated_throwsCusAuthenticationException() {
        LocalDate fromDate = LocalDate.now().minusDays(10);
        LocalDate toDate = LocalDate.now();

        CusAuthenticationException ex = assertThrows(
                CusAuthenticationException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertEquals("Customer authentication is required.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    @Test
    @DisplayName("Authenticated principal with missing ROLE_CUSTOMER throws CusAuthenticationException")
    @SuppressWarnings({"rawtypes", "unchecked"})
    void getAccountStatement_missingCustomerRole_throwsCusAuthenticationException() {
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        doReturn((Collection) List.of(new SimpleGrantedAuthority("ROLE_ADMIN")))
                .when(authentication).getAuthorities();

        SecurityContextHolder.setContext(securityContext);

        LocalDate fromDate = LocalDate.now().minusDays(10);
        LocalDate toDate = LocalDate.now();

        CusAuthenticationException ex = assertThrows(
                CusAuthenticationException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertEquals("Customer access is required.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    @Test
    @DisplayName("Authenticated principal with invalid UUID throws CusAuthenticationException")
    @SuppressWarnings({"rawtypes", "unchecked"})
    void getAccountStatement_invalidUuidPrincipal_throwsCusAuthenticationException() {
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getName()).thenReturn("not-a-valid-uuid");
        doReturn((Collection) List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")))
                .when(authentication).getAuthorities();

        SecurityContextHolder.setContext(securityContext);

        LocalDate fromDate = LocalDate.now().minusDays(10);
        LocalDate toDate = LocalDate.now();

        CusAuthenticationException ex = assertThrows(
                CusAuthenticationException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertEquals("Invalid customer identity.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    @Test
    @DisplayName("Explicit null customer UUID throws CusAuthenticationException")
    void getAccountStatement_nullCustomerId_throwsCusAuthenticationException() {
        LocalDate fromDate = LocalDate.now().minusDays(10);
        LocalDate toDate = LocalDate.now();

        CusAuthenticationException ex = assertThrows(
                CusAuthenticationException.class,
                () -> statementService.getAccountStatement((UUID) null, ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertEquals("Customer identity is required.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    // -------------------------------------------------------------------------
    // 3. Validation Scenarios
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Blank account number throws CusValidationException")
    void getAccountStatement_blankAccountNumber_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().minusDays(10);
        LocalDate toDate = LocalDate.now();

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> statementService.getAccountStatement("   ", fromDate, toDate)
        );

        assertEquals("Account number is required.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    @Test
    @DisplayName("Null account number throws CusValidationException")
    void getAccountStatement_nullAccountNumber_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().minusDays(10);
        LocalDate toDate = LocalDate.now();

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> statementService.getAccountStatement(null, fromDate, toDate)
        );

        assertEquals("Account number is required.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    @Test
    @DisplayName("Null fromDate throws CusValidationException")
    void getAccountStatement_nullFromDate_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate toDate = LocalDate.now();

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, null, toDate)
        );

        assertEquals("From Date is required.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    @Test
    @DisplayName("Null toDate throws CusValidationException")
    void getAccountStatement_nullToDate_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().minusDays(10);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, null)
        );

        assertEquals("To Date is required.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    @Test
    @DisplayName("Future fromDate throws CusValidationException")
    void getAccountStatement_futureFromDate_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().plusDays(1);
        LocalDate toDate = LocalDate.now().plusDays(5);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertEquals("From Date cannot be in the future.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    @Test
    @DisplayName("Future toDate throws CusValidationException")
    void getAccountStatement_futureToDate_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().minusDays(5);
        LocalDate toDate = LocalDate.now().plusDays(1);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertEquals("To Date cannot be in the future.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    @Test
    @DisplayName("fromDate after toDate throws CusValidationException")
    void getAccountStatement_fromDateAfterToDate_throwsCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().minusDays(2);
        LocalDate toDate = LocalDate.now().minusDays(5);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertEquals("From Date cannot be later than To Date.", ex.getMessage());
        verifyNoInteractions(statementRepository);
    }

    // -------------------------------------------------------------------------
    // 4. Repository Null Result Handling
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("Repository returning null throws AccountNotFoundException")
    void getAccountStatement_repositoryReturnsNull_throwsAccountNotFoundException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().minusDays(10);
        LocalDate toDate = LocalDate.now();

        when(statementRepository.getAccountStatement(CUSTOMER_ID, ACCOUNT_NUMBER, fromDate, toDate))
                .thenReturn(null);

        AccountNotFoundException ex = assertThrows(
                AccountNotFoundException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertEquals("Account not found or access denied for this customer", ex.getMessage());
        verify(statementRepository).getAccountStatement(CUSTOMER_ID, ACCOUNT_NUMBER, fromDate, toDate);
    }

    // -------------------------------------------------------------------------
    // 5. Database Exception Translation (SQLSTATE 45000 & Generic)
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("SQLSTATE 45000 opening date error translates to CusValidationException")
    void getAccountStatement_spOpeningDateError_translatesToCusValidationException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().minusDays(30);
        LocalDate toDate = LocalDate.now();

        SQLException sqlException = new SQLException(
                "From Date cannot be earlier than the account opening date",
                "45000"
        );
        DataAccessException dae = new DataAccessException("SP execution error", sqlException) {};

        when(statementRepository.getAccountStatement(CUSTOMER_ID, ACCOUNT_NUMBER, fromDate, toDate))
                .thenThrow(dae);

        CusValidationException ex = assertThrows(
                CusValidationException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertEquals("From Date cannot be earlier than the account opening date.", ex.getMessage());
        verify(statementRepository).getAccountStatement(CUSTOMER_ID, ACCOUNT_NUMBER, fromDate, toDate);
    }

    @Test
    @DisplayName("SQLSTATE 45000 access denied error translates to AccountNotFoundException")
    void getAccountStatement_spAccountNotFoundError_translatesToAccountNotFoundException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().minusDays(30);
        LocalDate toDate = LocalDate.now();

        SQLException sqlException = new SQLException(
                "Account not found or access denied for this customer",
                "45000"
        );
        DataAccessException dae = new DataAccessException("SP execution error", sqlException) {};

        when(statementRepository.getAccountStatement(CUSTOMER_ID, ACCOUNT_NUMBER, fromDate, toDate))
                .thenThrow(dae);

        AccountNotFoundException ex = assertThrows(
                AccountNotFoundException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertEquals("Account not found or access denied for this customer", ex.getMessage());
        verify(statementRepository).getAccountStatement(CUSTOMER_ID, ACCOUNT_NUMBER, fromDate, toDate);
    }

    @Test
    @DisplayName("Generic DataAccessException without handled SQLSTATE is rethrown as-is")
    void getAccountStatement_unhandledDataAccessException_rethrowsOriginalException() {
        mockCustomerAuthentication(CUSTOMER_ID);
        LocalDate fromDate = LocalDate.now().minusDays(30);
        LocalDate toDate = LocalDate.now();

        DataAccessException dae = new DataAccessException("Database connection timeout") {};

        when(statementRepository.getAccountStatement(CUSTOMER_ID, ACCOUNT_NUMBER, fromDate, toDate))
                .thenThrow(dae);

        DataAccessException ex = assertThrows(
                DataAccessException.class,
                () -> statementService.getAccountStatement(ACCOUNT_NUMBER, fromDate, toDate)
        );

        assertSame(dae, ex);
        verify(statementRepository).getAccountStatement(CUSTOMER_ID, ACCOUNT_NUMBER, fromDate, toDate);
    }
}
