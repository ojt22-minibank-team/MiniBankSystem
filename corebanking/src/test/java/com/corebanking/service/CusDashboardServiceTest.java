package com.corebanking.service;

import com.corebanking.dto.CusDashboardAccountDTO;
import com.corebanking.dto.CusDashboardResponseDTO;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.CustomerRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CusDashboardService Unit Tests")
class CusDashboardServiceTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String CUSTOMER_CODE = "CUS-2026-0001";
    private static final String FULL_NAME = "Daw Thida Win";
    private static final CustomerType CUSTOMER_TYPE = CustomerType.INDIVIDUAL;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private TransferLimitService transferLimitService;

    @InjectMocks
    private CusDashboardService dashboardService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    // -------------------------------------------------------------------------
    // Helper Methods
    // -------------------------------------------------------------------------

    @SuppressWarnings({"rawtypes", "unchecked"})
    private void mockSecurityContext(String name, boolean isAuthenticated, String... roles) {
        Authentication authentication = mock(Authentication.class);
        SecurityContext securityContext = mock(SecurityContext.class);

        when(securityContext.getAuthentication()).thenReturn(authentication);
        when(authentication.isAuthenticated()).thenReturn(isAuthenticated);

        if (isAuthenticated) {
            lenient().when(authentication.getName()).thenReturn(name);
            List<SimpleGrantedAuthority> authorities = java.util.Arrays.stream(roles)
                    .map(SimpleGrantedAuthority::new)
                    .toList();
            doReturn((Collection) authorities).when(authentication).getAuthorities();
        }

        SecurityContextHolder.setContext(securityContext);
    }

    private void mockAuthenticatedCustomer(UUID customerId) {
        mockSecurityContext(customerId.toString(), true, "ROLE_CUSTOMER");
    }

    private Customers createSampleCustomer(UUID customerId) {
        return Customers.builder()
                .customerId(customerId)
                .customerCode(CUSTOMER_CODE)
                .fullName(FULL_NAME)
                .customerType(CUSTOMER_TYPE)
                .build();
    }

    private Accounts createSampleAccount(
            String accountNumber,
            AccountCategory category,
            AccountType type,
            BigDecimal currentBalance,
            BigDecimal availableBalance,
            BigDecimal minimumBalance,
            AccountStatus status,
            boolean isJoint,
            LocalDateTime openedAt) {
        return Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber(accountNumber)
                .accountCategory(category)
                .accountType(type)
                .currency("MMK")
                .currentBalance(currentBalance)
                .availableBalance(availableBalance)
                .minimumBalance(minimumBalance)
                .status(status)
                .isJointAccount(isJoint)
                .openedAt(openedAt)
                .build();
    }

    // -------------------------------------------------------------------------
    // Authentication Validation Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Authentication Context Tests")
    class AuthenticationContextTests {

        @Test
        @DisplayName("Throws RuntimeException when Authentication object is null in SecurityContext")
        void getDashboard_ThrowsException_WhenNoAuthenticationInContext() {
            SecurityContext securityContext = mock(SecurityContext.class);
            when(securityContext.getAuthentication()).thenReturn(null);
            SecurityContextHolder.setContext(securityContext);

            assertThatThrownBy(() -> dashboardService.getDashboard())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer authentication is required.");

            verifyNoInteractions(customerRepository, accountRepository, transferLimitService);
        }

        @Test
        @DisplayName("Throws RuntimeException when Authentication.isAuthenticated() is false")
        void getDashboard_ThrowsException_WhenAuthenticationNotAuthenticated() {
            mockSecurityContext(CUSTOMER_ID.toString(), false);

            assertThatThrownBy(() -> dashboardService.getDashboard())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer authentication is required.");

            verifyNoInteractions(customerRepository, accountRepository, transferLimitService);
        }

        @Test
        @DisplayName("Throws RuntimeException when user lacks ROLE_CUSTOMER authority")
        void getDashboard_ThrowsException_WhenLacksRoleCustomer() {
            mockSecurityContext(CUSTOMER_ID.toString(), true, "ROLE_STAFF", "ROLE_ADMIN");

            assertThatThrownBy(() -> dashboardService.getDashboard())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer access is required.");

            verifyNoInteractions(customerRepository, accountRepository, transferLimitService);
        }

        @Test
        @DisplayName("Throws RuntimeException with cause when authentication.getName() is not a valid UUID")
        void getDashboard_ThrowsException_WhenInvalidUuidPrincipal() {
            mockSecurityContext("not-a-valid-uuid", true, "ROLE_CUSTOMER");

            assertThatThrownBy(() -> dashboardService.getDashboard())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Invalid authenticated customer identity.")
                    .hasCauseInstanceOf(IllegalArgumentException.class);

            verifyNoInteractions(customerRepository, accountRepository, transferLimitService);
        }
    }

    // -------------------------------------------------------------------------
    // Customer Retrieval Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Customer Retrieval Tests")
    class CustomerRetrievalTests {

        @Test
        @DisplayName("Throws IllegalStateException when authenticated customer does not exist in repository")
        void getDashboard_ThrowsIllegalStateException_WhenCustomerNotFound() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> dashboardService.getDashboard())
                    .isInstanceOf(IllegalStateException.class)
                    .hasMessage("Authenticated customer record was not found.");

            verify(customerRepository).findById(CUSTOMER_ID);
            verifyNoInteractions(accountRepository, transferLimitService);
        }
    }

    // -------------------------------------------------------------------------
    // Successful Dashboard Fetching & Calculations
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Dashboard Retrieval & Balance Calculation Tests")
    class DashboardRetrievalTests {

        @Test
        @DisplayName("Returns correct dashboard response with multiple accounts and calculated balances")
        void getDashboard_Success_WithMultipleAccounts() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createSampleCustomer(CUSTOMER_ID);
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

            LocalDateTime openedTime1 = LocalDateTime.of(2026, 1, 15, 10, 0);
            LocalDateTime openedTime2 = LocalDateTime.of(2026, 2, 20, 14, 30);

            // Account 1: Savings, minBalance 10,000, current 200,000, available 190,000
            Accounts account1 = createSampleAccount(
                    "1001234567",
                    AccountCategory.RETAIL,
                    AccountType.SAVINGS,
                    new BigDecimal("200000.00"),
                    new BigDecimal("190000.00"),
                    new BigDecimal("10000.00"),
                    AccountStatus.ACTIVE,
                    false,
                    openedTime1
            );

            // Account 2: Current, minBalance 5,000, current 100,000, available 95,000, frozen
            Accounts account2 = createSampleAccount(
                    "1009876543",
                    AccountCategory.RETAIL,
                    AccountType.CURRENT,
                    new BigDecimal("100000.00"),
                    new BigDecimal("95000.00"),
                    new BigDecimal("5000.00"),
                    AccountStatus.FROZEN,
                    true,
                    openedTime2
            );

            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID))
                    .thenReturn(List.of(account1, account2));

            CusDashboardResponseDTO response = dashboardService.getDashboard();

            assertThat(response).isNotNull();
            assertThat(response.getCustomerCode()).isEqualTo(CUSTOMER_CODE);
            assertThat(response.getFullName()).isEqualTo(FULL_NAME);
            assertThat(response.getCustomerType()).isEqualTo(CUSTOMER_TYPE);
            assertThat(response.getAccountCount()).isEqualTo(2);
            // Total balance: 190,000 + 95,000 = 285,000
            assertThat(response.getTotalBalance()).isEqualByComparingTo(new BigDecimal("285000.00"));
            assertThat(response.getAccounts()).hasSize(2);

            CusDashboardAccountDTO dto1 = response.getAccounts().get(0);
            assertThat(dto1.getAccountNumber()).isEqualTo("1001234567");
            assertThat(dto1.getAccountCategory()).isEqualTo("RETAIL");
            assertThat(dto1.getAccountType()).isEqualTo("SAVINGS");
            assertThat(dto1.getCurrency()).isEqualTo("MMK");
            assertThat(dto1.getCurrentBalance()).isEqualByComparingTo(new BigDecimal("200000.00"));
            assertThat(dto1.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("190000.00"));
            assertThat(dto1.getStatus()).isEqualTo("ACTIVE");
            assertThat(dto1.getJointAccount()).isFalse();
            assertThat(dto1.getOpenedAt()).isEqualTo(openedTime1);

            CusDashboardAccountDTO dto2 = response.getAccounts().get(1);
            assertThat(dto2.getAccountNumber()).isEqualTo("1009876543");
            assertThat(dto2.getAccountCategory()).isEqualTo("RETAIL");
            assertThat(dto2.getAccountType()).isEqualTo("CURRENT");
            assertThat(dto2.getCurrency()).isEqualTo("MMK");
            assertThat(dto2.getCurrentBalance()).isEqualByComparingTo(new BigDecimal("100000.00"));
            assertThat(dto2.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("95000.00"));
            assertThat(dto2.getStatus()).isEqualTo("FROZEN");
            assertThat(dto2.getJointAccount()).isTrue();
            assertThat(dto2.getOpenedAt()).isEqualTo(openedTime2);

            verify(customerRepository).findById(CUSTOMER_ID);
            verify(accountRepository).findByCustomerCustomerId(CUSTOMER_ID);
        }

        @Test
        @DisplayName("Returns empty accounts list, 0 account count, and 0 total balance when customer has no accounts")
        void getDashboard_Success_WhenNoAccountsFound() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createSampleCustomer(CUSTOMER_ID);
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID)).thenReturn(Collections.emptyList());

            CusDashboardResponseDTO response = dashboardService.getDashboard();

            assertThat(response).isNotNull();
            assertThat(response.getCustomerCode()).isEqualTo(CUSTOMER_CODE);
            assertThat(response.getFullName()).isEqualTo(FULL_NAME);
            assertThat(response.getCustomerType()).isEqualTo(CUSTOMER_TYPE);
            assertThat(response.getAccountCount()).isEqualTo(0);
            assertThat(response.getTotalBalance()).isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(response.getAccounts()).isEmpty();
        }

        @Test
        @DisplayName("Excludes CLOSED accounts from accountCount but includes them in mapped accounts list")
        void getDashboard_ExcludesClosedAccountsFromAccountCount() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createSampleCustomer(CUSTOMER_ID);
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

            Accounts activeAcc = createSampleAccount("ACC-01", AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("50000.00"), new BigDecimal("40000.00"), new BigDecimal("10000.00"),
                    AccountStatus.ACTIVE, false, LocalDateTime.now());

            Accounts dormantAcc = createSampleAccount("ACC-02", AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("30000.00"), new BigDecimal("20000.00"), new BigDecimal("10000.00"),
                    AccountStatus.DORMANT, false, LocalDateTime.now());

            Accounts closedAcc = createSampleAccount("ACC-03", AccountCategory.RETAIL, AccountType.SAVINGS,
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO,
                    AccountStatus.CLOSED, false, LocalDateTime.now());

            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID))
                    .thenReturn(List.of(activeAcc, dormantAcc, closedAcc));
            when(transferLimitService.getMinimumBalance()).thenReturn(new BigDecimal("10000.00"));

            CusDashboardResponseDTO response = dashboardService.getDashboard();

            // Active (1) + Dormant (1) = 2 (CLOSED account excluded)
            assertThat(response.getAccountCount()).isEqualTo(2);
            assertThat(response.getAccounts()).hasSize(3);
        }

        @Test
        @DisplayName("Falls back to transferLimitService.getMinimumBalance() when account minimumBalance is null or zero")
        void getDashboard_FallsBackToTransferLimitService_WhenAccountMinimumBalanceIsZeroOrNull() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createSampleCustomer(CUSTOMER_ID);
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

            when(transferLimitService.getMinimumBalance()).thenReturn(new BigDecimal("10000.00"));

            // minimumBalance is ZERO
            Accounts account = createSampleAccount("ACC-NO-MIN", AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("50000.00"), null, BigDecimal.ZERO,
                    AccountStatus.ACTIVE, false, LocalDateTime.now());

            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID)).thenReturn(List.of(account));

            CusDashboardResponseDTO response = dashboardService.getDashboard();

            // effectiveAvail = 50,000 - 10,000 = 40,000
            assertThat(response.getAccounts()).hasSize(1);
            assertThat(response.getAccounts().get(0).getAvailableBalance())
                    .isEqualByComparingTo(new BigDecimal("40000.00"));
            verify(transferLimitService).getMinimumBalance();
        }

        @Test
        @DisplayName("Available balance becomes 0 when current balance is less than required minimum balance")
        void getDashboard_SetsAvailableBalanceToZero_WhenCurrentBalanceLessThanMinimumBalance() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createSampleCustomer(CUSTOMER_ID);
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

            Accounts account = createSampleAccount("ACC-LOW-BAL", AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("4000.00"), new BigDecimal("4000.00"), new BigDecimal("10000.00"),
                    AccountStatus.ACTIVE, false, LocalDateTime.now());

            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID)).thenReturn(List.of(account));

            CusDashboardResponseDTO response = dashboardService.getDashboard();

            // current 4,000 - min 10,000 < 0 => effectiveAvail = 0
            assertThat(response.getAccounts().get(0).getAvailableBalance())
                    .isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(response.getTotalBalance()).isEqualByComparingTo(BigDecimal.ZERO);
        }

        @Test
        @DisplayName("Keeps lower existing availableBalance when it is smaller than calculated effectiveAvail")
        void getDashboard_RetainsLowerExistingAvailableBalance_WhenHoldApplied() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createSampleCustomer(CUSTOMER_ID);
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

            // current = 100,000; minBalance = 10,000 => effectiveAvail = 90,000
            // but account has holds, so availableBalance is already 60,000 (< current 100,000)
            Accounts account = createSampleAccount("ACC-WITH-HOLD", AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("100000.00"), new BigDecimal("60000.00"), new BigDecimal("10000.00"),
                    AccountStatus.ACTIVE, false, LocalDateTime.now());

            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID)).thenReturn(List.of(account));

            CusDashboardResponseDTO response = dashboardService.getDashboard();

            // min(60,000, 90,000) = 60,000
            assertThat(response.getAccounts().get(0).getAvailableBalance())
                    .isEqualByComparingTo(new BigDecimal("60000.00"));
            assertThat(response.getTotalBalance()).isEqualByComparingTo(new BigDecimal("60000.00"));
        }

        @Test
        @DisplayName("Handles null current balance by defaulting to BigDecimal.ZERO")
        void getDashboard_HandlesNullCurrentBalance() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createSampleCustomer(CUSTOMER_ID);
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));

            Accounts account = createSampleAccount("ACC-NULL-BAL", AccountCategory.RETAIL, AccountType.SAVINGS,
                    null, null, new BigDecimal("10000.00"),
                    AccountStatus.ACTIVE, false, LocalDateTime.now());

            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID)).thenReturn(List.of(account));

            CusDashboardResponseDTO response = dashboardService.getDashboard();

            assertThat(response.getAccounts().get(0).getCurrentBalance())
                    .isEqualByComparingTo(BigDecimal.ZERO);
            assertThat(response.getAccounts().get(0).getAvailableBalance())
                    .isEqualByComparingTo(BigDecimal.ZERO);
        }
    }
}
