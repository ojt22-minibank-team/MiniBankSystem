package com.corebanking.service;

import com.corebanking.dto.CusAccountResponseDTO;
import com.corebanking.dto.TransferLimitInfoResponseDto;
import com.corebanking.dto.UpdateTransferLimitRequestDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.repository.AccountRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;
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
@DisplayName("CusAccountService Unit Tests")
class CusAccountServiceTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("33333333-3333-4333-8333-333333333333");
    private static final UUID OTHER_CUSTOMER_ID = UUID.fromString("99999999-9999-4999-8999-999999999999");
    private static final String ACCOUNT_NUMBER_1 = "1002003001";
    private static final String ACCOUNT_NUMBER_2 = "1002003002";

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private TransferLimitService transferLimitService;

    @InjectMocks
    private CusAccountService cusAccountService;

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

    private Customers createCustomer(UUID customerId) {
        return Customers.builder()
                .customerId(customerId)
                .customerCode("CUS-001")
                .fullName("Ko Min Thu")
                .build();
    }

    private Accounts createAccount(
            UUID accountId,
            Customers customer,
            String accountNumber,
            AccountCategory category,
            AccountType type,
            BigDecimal currentBalance,
            BigDecimal availableBalance,
            BigDecimal minimumBalance,
            BigDecimal dailyLimit,
            AccountStatus status,
            boolean isJoint,
            short approvals,
            LocalDateTime openedAt,
            LocalDateTime closedAt) {
        return Accounts.builder()
                .accountId(accountId)
                .customer(customer)
                .accountNumber(accountNumber)
                .accountCategory(category)
                .accountType(type)
                .currency("MMK")
                .currentBalance(currentBalance)
                .availableBalance(availableBalance)
                .minimumBalance(minimumBalance)
                .dailyTransferLimit(dailyLimit)
                .status(status)
                .isJointAccount(isJoint)
                .requiredApprovals(approvals)
                .openedAt(openedAt)
                .closedAt(closedAt)
                .build();
    }

    // -------------------------------------------------------------------------
    // Authentication Context Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Authentication Context Tests")
    class AuthenticationContextTests {

        @Test
        @DisplayName("Throws RuntimeException when Authentication object is null in SecurityContext")
        void getMyAccounts_ThrowsException_WhenNoAuthenticationInContext() {
            SecurityContext securityContext = mock(SecurityContext.class);
            when(securityContext.getAuthentication()).thenReturn(null);
            SecurityContextHolder.setContext(securityContext);

            assertThatThrownBy(() -> cusAccountService.getMyAccounts())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer authentication is required.");

            verifyNoInteractions(accountRepository, transferLimitService);
        }

        @Test
        @DisplayName("Throws RuntimeException when Authentication.isAuthenticated() is false")
        void getMyAccounts_ThrowsException_WhenNotAuthenticated() {
            mockSecurityContext(CUSTOMER_ID.toString(), false);

            assertThatThrownBy(() -> cusAccountService.getMyAccounts())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer authentication is required.");

            verifyNoInteractions(accountRepository, transferLimitService);
        }

        @Test
        @DisplayName("Throws RuntimeException when user lacks ROLE_CUSTOMER authority")
        void getMyAccounts_ThrowsException_WhenLacksCustomerRole() {
            mockSecurityContext(CUSTOMER_ID.toString(), true, "ROLE_STAFF");

            assertThatThrownBy(() -> cusAccountService.getMyAccounts())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer access is required.");

            verifyNoInteractions(accountRepository, transferLimitService);
        }

        @Test
        @DisplayName("Throws RuntimeException when authentication.getName() is not a valid UUID")
        void getMyAccounts_ThrowsException_WhenInvalidUuid() {
            mockSecurityContext("invalid-uuid-string", true, "ROLE_CUSTOMER");

            assertThatThrownBy(() -> cusAccountService.getMyAccounts())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Invalid customer identity.");

            verifyNoInteractions(accountRepository, transferLimitService);
        }
    }

    // -------------------------------------------------------------------------
    // getMyAccounts() Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("getMyAccounts() Tests")
    class GetMyAccountsTests {

        @Test
        @DisplayName("Returns list of account response DTOs for authenticated customer")
        void getMyAccounts_Success_ReturnsMappedAccounts() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createCustomer(CUSTOMER_ID);

            LocalDateTime openedAt1 = LocalDateTime.of(2026, 1, 10, 8, 30);
            LocalDateTime openedAt2 = LocalDateTime.of(2026, 2, 14, 12, 0);

            Accounts acc1 = createAccount(
                    UUID.randomUUID(), customer, ACCOUNT_NUMBER_1,
                    AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("300000.00"), new BigDecimal("290000.00"), new BigDecimal("10000.00"),
                    new BigDecimal("5000000.00"), AccountStatus.ACTIVE, false, (short) 1,
                    openedAt1, null
            );

            Accounts acc2 = createAccount(
                    UUID.randomUUID(), customer, ACCOUNT_NUMBER_2,
                    AccountCategory.RETAIL, AccountType.CURRENT,
                    new BigDecimal("150000.00"), new BigDecimal("145000.00"), new BigDecimal("5000.00"),
                    new BigDecimal("10000000.00"), AccountStatus.FROZEN, true, (short) 2,
                    openedAt2, null
            );

            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID))
                    .thenReturn(List.of(acc1, acc2));

            List<CusAccountResponseDTO> result = cusAccountService.getMyAccounts();

            assertThat(result).hasSize(2);

            CusAccountResponseDTO dto1 = result.get(0);
            assertThat(dto1.getAccountNumber()).isEqualTo(ACCOUNT_NUMBER_1);
            assertThat(dto1.getAccountCategory()).isEqualTo("RETAIL");
            assertThat(dto1.getAccountType()).isEqualTo("SAVINGS");
            assertThat(dto1.getCurrency()).isEqualTo("MMK");
            assertThat(dto1.getCurrentBalance()).isEqualByComparingTo(new BigDecimal("300000.00"));
            assertThat(dto1.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("290000.00"));
            assertThat(dto1.getMinimumBalance()).isEqualByComparingTo(new BigDecimal("10000.00"));
            assertThat(dto1.getDailyTransferLimit()).isEqualByComparingTo(new BigDecimal("5000000.00"));
            assertThat(dto1.getStatus()).isEqualTo("ACTIVE");
            assertThat(dto1.getJointAccount()).isFalse();
            assertThat(dto1.getRequiredApprovals()).isEqualTo(1);
            assertThat(dto1.getOpenedAt()).isEqualTo(openedAt1);
            assertThat(dto1.getClosedAt()).isNull();

            CusAccountResponseDTO dto2 = result.get(1);
            assertThat(dto2.getAccountNumber()).isEqualTo(ACCOUNT_NUMBER_2);
            assertThat(dto2.getAccountType()).isEqualTo("CURRENT");
            assertThat(dto2.getStatus()).isEqualTo("FROZEN");
            assertThat(dto2.getJointAccount()).isTrue();
            assertThat(dto2.getRequiredApprovals()).isEqualTo(2);

            verify(accountRepository).findByCustomerCustomerId(CUSTOMER_ID);
        }

        @Test
        @DisplayName("Returns empty list when customer has no accounts")
        void getMyAccounts_Success_WhenNoAccounts() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID)).thenReturn(Collections.emptyList());

            List<CusAccountResponseDTO> result = cusAccountService.getMyAccounts();

            assertThat(result).isNotNull().isEmpty();
            verify(accountRepository).findByCustomerCustomerId(CUSTOMER_ID);
        }

        @Test
        @DisplayName("Falls back to transferLimitService minimum balance when account minimumBalance is null or zero")
        void getMyAccounts_FallsBackToTransferLimitService_WhenMinBalanceNull() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createCustomer(CUSTOMER_ID);

            Accounts acc = createAccount(
                    UUID.randomUUID(), customer, ACCOUNT_NUMBER_1,
                    AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("50000.00"), null, null, // null minimum balance
                    null, AccountStatus.ACTIVE, false, (short) 1,
                    LocalDateTime.now(), null
            );

            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID)).thenReturn(List.of(acc));
            when(transferLimitService.getMinimumBalance()).thenReturn(new BigDecimal("10000.00"));

            List<CusAccountResponseDTO> result = cusAccountService.getMyAccounts();

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getMinimumBalance()).isEqualByComparingTo(new BigDecimal("10000.00"));
            assertThat(result.get(0).getAvailableBalance()).isEqualByComparingTo(new BigDecimal("40000.00"));
            verify(transferLimitService).getMinimumBalance();
        }

        @Test
        @DisplayName("Sets available balance to ZERO when current balance is less than minimum reserve balance")
        void getMyAccounts_SetsAvailableBalanceToZero_WhenCurrentBelowMinimum() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createCustomer(CUSTOMER_ID);

            Accounts acc = createAccount(
                    UUID.randomUUID(), customer, ACCOUNT_NUMBER_1,
                    AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("8000.00"), null, new BigDecimal("10000.00"),
                    null, AccountStatus.ACTIVE, false, (short) 1,
                    LocalDateTime.now(), null
            );

            when(accountRepository.findByCustomerCustomerId(CUSTOMER_ID)).thenReturn(List.of(acc));

            List<CusAccountResponseDTO> result = cusAccountService.getMyAccounts();

            assertThat(result.get(0).getAvailableBalance()).isEqualByComparingTo(BigDecimal.ZERO);
        }
    }

    // -------------------------------------------------------------------------
    // getMyAccount(accountNumber) Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("getMyAccount(accountNumber) Tests")
    class GetMyAccountTests {

        @ParameterizedTest
        @NullAndEmptySource
        @ValueSource(strings = {"   ", "\t"})
        @DisplayName("Throws RuntimeException when accountNumber is null or blank")
        void getMyAccount_ThrowsException_WhenAccountNumberBlank(String invalidAccNum) {
            assertThatThrownBy(() -> cusAccountService.getMyAccount(invalidAccNum))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Account number is required.");

            verifyNoInteractions(accountRepository, transferLimitService);
        }

        @Test
        @DisplayName("Throws RuntimeException when account does not exist in repository")
        void getMyAccount_ThrowsException_WhenAccountNotFound() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            when(accountRepository.findByAccountNumber(ACCOUNT_NUMBER_1)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> cusAccountService.getMyAccount(ACCOUNT_NUMBER_1))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Account not found.");

            verify(accountRepository).findByAccountNumber(ACCOUNT_NUMBER_1);
        }

        @Test
        @DisplayName("Throws RuntimeException when account belongs to a different customer (ownership check)")
        void getMyAccount_ThrowsException_WhenAccountBelongsToOtherCustomer() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers otherCustomer = createCustomer(OTHER_CUSTOMER_ID);

            Accounts acc = createAccount(
                    UUID.randomUUID(), otherCustomer, ACCOUNT_NUMBER_1,
                    AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("50000.00"), new BigDecimal("40000.00"), new BigDecimal("10000.00"),
                    null, AccountStatus.ACTIVE, false, (short) 1,
                    LocalDateTime.now(), null
            );

            when(accountRepository.findByAccountNumber(ACCOUNT_NUMBER_1)).thenReturn(Optional.of(acc));

            assertThatThrownBy(() -> cusAccountService.getMyAccount(ACCOUNT_NUMBER_1))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("You are not authorized to access this account.");
        }

        @Test
        @DisplayName("Throws RuntimeException when account has null customer reference")
        void getMyAccount_ThrowsException_WhenAccountCustomerIsNull() {
            mockAuthenticatedCustomer(CUSTOMER_ID);

            Accounts acc = createAccount(
                    UUID.randomUUID(), null, ACCOUNT_NUMBER_1,
                    AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("50000.00"), new BigDecimal("40000.00"), new BigDecimal("10000.00"),
                    null, AccountStatus.ACTIVE, false, (short) 1,
                    LocalDateTime.now(), null
            );

            when(accountRepository.findByAccountNumber(ACCOUNT_NUMBER_1)).thenReturn(Optional.of(acc));

            assertThatThrownBy(() -> cusAccountService.getMyAccount(ACCOUNT_NUMBER_1))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("You are not authorized to access this account.");
        }

        @Test
        @DisplayName("Successfully returns account details when customer is the authorized owner")
        void getMyAccount_Success_WhenAuthorizedOwner() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createCustomer(CUSTOMER_ID);

            Accounts acc = createAccount(
                    UUID.randomUUID(), customer, ACCOUNT_NUMBER_1,
                    AccountCategory.RETAIL, AccountType.SAVINGS,
                    new BigDecimal("200000.00"), new BigDecimal("190000.00"), new BigDecimal("10000.00"),
                    new BigDecimal("5000000.00"), AccountStatus.ACTIVE, false, (short) 1,
                    LocalDateTime.of(2026, 1, 10, 10, 0), null
            );

            when(accountRepository.findByAccountNumber(ACCOUNT_NUMBER_1)).thenReturn(Optional.of(acc));

            CusAccountResponseDTO result = cusAccountService.getMyAccount(ACCOUNT_NUMBER_1);

            assertThat(result).isNotNull();
            assertThat(result.getAccountNumber()).isEqualTo(ACCOUNT_NUMBER_1);
            assertThat(result.getCurrentBalance()).isEqualByComparingTo(new BigDecimal("200000.00"));
            assertThat(result.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("190000.00"));
            assertThat(result.getStatus()).isEqualTo("ACTIVE");

            verify(accountRepository).findByAccountNumber(ACCOUNT_NUMBER_1);
        }
    }

    // -------------------------------------------------------------------------
    // Transfer Limit Management Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Transfer Limit Tests")
    class TransferLimitTests {

        @Test
        @DisplayName("getAccountTransferLimits delegates to transferLimitService with customerId and accountNumber")
        void getAccountTransferLimits_Success_DelegatesToService() {
            mockAuthenticatedCustomer(CUSTOMER_ID);

            TransferLimitInfoResponseDto expectedDto = TransferLimitInfoResponseDto.builder()
                    .accountNumber(ACCOUNT_NUMBER_1)
                    .accountType("SAVINGS")
                    .currency("MMK")
                    .bankMaxDailyLimit(new BigDecimal("10000000.00"))
                    .effectiveDailyLimit(new BigDecimal("5000000.00"))
                    .build();

            when(transferLimitService.getTransferLimitInfo(CUSTOMER_ID.toString(), ACCOUNT_NUMBER_1))
                    .thenReturn(expectedDto);

            TransferLimitInfoResponseDto actualDto =
                    cusAccountService.getAccountTransferLimits(ACCOUNT_NUMBER_1);

            assertThat(actualDto).isEqualTo(expectedDto);
            verify(transferLimitService).getTransferLimitInfo(CUSTOMER_ID.toString(), ACCOUNT_NUMBER_1);
        }

        @Test
        @DisplayName("updateAccountTransferLimits delegates to transferLimitService with customerId, accountNumber and request")
        void updateAccountTransferLimits_Success_DelegatesToService() {
            mockAuthenticatedCustomer(CUSTOMER_ID);

            UpdateTransferLimitRequestDto request = UpdateTransferLimitRequestDto.builder()
                    .transactionPin("123456")
                    .customOneTimeLimit(new BigDecimal("1000000.00"))
                    .customDailyLimit(new BigDecimal("5000000.00"))
                    .build();

            TransferLimitInfoResponseDto updatedDto = TransferLimitInfoResponseDto.builder()
                    .accountNumber(ACCOUNT_NUMBER_1)
                    .userCustomOneTimeLimit(new BigDecimal("1000000.00"))
                    .userCustomDailyLimit(new BigDecimal("5000000.00"))
                    .build();

            when(transferLimitService.updateCustomLimits(CUSTOMER_ID.toString(), ACCOUNT_NUMBER_1, request))
                    .thenReturn(updatedDto);

            TransferLimitInfoResponseDto result =
                    cusAccountService.updateAccountTransferLimits(ACCOUNT_NUMBER_1, request);

            assertThat(result).isEqualTo(updatedDto);
            verify(transferLimitService).updateCustomLimits(CUSTOMER_ID.toString(), ACCOUNT_NUMBER_1, request);
        }
    }
}
