package com.corebanking.service;

import com.corebanking.dto.AccessibleAccountDTO;
import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.AccountStatusUpdateDTO;
import com.corebanking.dto.DepositRequestDTO;
import com.corebanking.entity.AccountSignatories;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.SignatoryRole;
import com.corebanking.entity.enums.SignatoryStatus;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.AccountSignatoriesRepository;
import com.corebanking.repository.CustomerCredentialsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.StaffUsersRepository;
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
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AccountServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private StaffUsersRepository staffUsersRepository;

    @Mock
    private CusEmailService cusEmailService;

    @Mock
    private AccountSignatoriesRepository accountSignatoriesRepository;

    @Mock
    private CustomerCredentialsRepository customerCredentialsRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AccountService accountService;

    private Customers mockCustomer;
    private Accounts mockAccount;

    @BeforeEach
    void setUp() {
        mockCustomer = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode("CUST-1001")
                .fullName("John Doe")
                .email("john@example.com")
                .status(CustomerStatus.ACTIVE)
                .customerType(CustomerType.PERSONAL)
                .build();

        mockAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .customer(mockCustomer)
                .accountNumber("1001234567")
                .accountType(AccountType.SAVINGS)
                .accountCategory(AccountCategory.RETAIL)
                .currentBalance(new BigDecimal("50000.00"))
                .availableBalance(new BigDecimal("50000.00"))
                .currency("MMK")
                .status(AccountStatus.ACTIVE)
                .openedAt(LocalDateTime.now())
                .build();
    }

    @Test
    @DisplayName("Deposit funds successfully via Account Number")
    void testDepositFunds_Success_ByAccountNumber() {
        DepositRequestDTO dto = DepositRequestDTO.builder()
                .accountNumber("1001234567")
                .amount(new BigDecimal("20000.00"))
                .remarks("Branch Counter Cash Deposit")
                .build();

        when(accountRepository.findByAccountNumber("1001234567")).thenReturn(Optional.of(mockAccount));
        when(accountRepository.save(any(Accounts.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AccountResponseDTO response = accountService.depositFunds(dto);

        assertThat(response).isNotNull();
        assertThat(response.getAccountNumber()).isEqualTo("1001234567");
        assertThat(response.getCurrentBalance()).isEqualByComparingTo(new BigDecimal("70000.00"));
        assertThat(response.getAvailableBalance()).isEqualByComparingTo(new BigDecimal("70000.00"));
        verify(accountRepository).save(any(Accounts.class));
    }

    @Test
    @DisplayName("Deposit funds successfully via Customer Code")
    void testDepositFunds_Success_ByCustomerCode() {
        DepositRequestDTO dto = DepositRequestDTO.builder()
                .customerCode("CUST-1001")
                .amount(new BigDecimal("10000.00"))
                .remarks("Customer Code Deposit")
                .build();

        when(accountRepository.findByCustomerCustomerCode("CUST-1001")).thenReturn(List.of(mockAccount));
        when(accountRepository.save(any(Accounts.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AccountResponseDTO response = accountService.depositFunds(dto);

        assertThat(response).isNotNull();
        assertThat(response.getCurrentBalance()).isEqualByComparingTo(new BigDecimal("60000.00"));
    }

    @Test
    @DisplayName("Deposit funds throws exception if account is not active")
    void testDepositFunds_Fails_WhenAccountInactive() {
        mockAccount.setStatus(AccountStatus.FROZEN);

        DepositRequestDTO dto = DepositRequestDTO.builder()
                .accountNumber("1001234567")
                .amount(new BigDecimal("10000.00"))
                .build();

        when(accountRepository.findByAccountNumber("1001234567")).thenReturn(Optional.of(mockAccount));

        assertThatThrownBy(() -> accountService.depositFunds(dto))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot deposit funds to an account that is FROZEN");
    }

    @Test
    @DisplayName("Deposit funds throws exception if neither account number nor customer code is provided")
    void testDepositFunds_Fails_WhenNoIdentifier() {
        DepositRequestDTO dto = DepositRequestDTO.builder()
                .amount(new BigDecimal("10000.00"))
                .build();

        assertThatThrownBy(() -> accountService.depositFunds(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Either accountNumber or customerCode must be provided");
    }

    @Test
    @DisplayName("Get accessible accounts returns personal accounts and corporate signatory accounts")
    void testGetAccessibleAccountsForCustomer() {
        when(customerRepository.findByCustomerCode("CUST-1001")).thenReturn(Optional.of(mockCustomer));
        when(accountRepository.findByCustomer(mockCustomer)).thenReturn(List.of(mockAccount));

        Customers companyCustomer = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode("CUST-COMP-01")
                .fullName("Acme Corp")
                .customerType(CustomerType.COMPANY)
                .build();

        Accounts corporateAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .customer(companyCustomer)
                .accountNumber("2009999999")
                .accountType(AccountType.CURRENT)
                .accountCategory(AccountCategory.CORPORATE)
                .currentBalance(new BigDecimal("10000000.00"))
                .availableBalance(new BigDecimal("10000000.00"))
                .currency("MMK")
                .status(AccountStatus.ACTIVE)
                .build();

        AccountSignatories signatory = AccountSignatories.builder()
                .account(corporateAccount)
                .customer(mockCustomer)
                .signatoryRole(SignatoryRole.PRIMARY_HOLDER)
                .canInitiate(false)
                .canApprove(true)
                .status(SignatoryStatus.ACTIVE)
                .build();

        when(accountSignatoriesRepository.findByCustomerAndStatus(mockCustomer, SignatoryStatus.ACTIVE))
                .thenReturn(List.of(signatory));

        List<AccessibleAccountDTO> accessibleAccounts = accountService.getAccessibleAccountsForCustomer("CUST-1001");

        assertThat(accessibleAccounts).hasSize(2);

        AccessibleAccountDTO personal = accessibleAccounts.get(0);
        assertThat(personal.getAccountNumber()).isEqualTo("1001234567");
        assertThat(personal.getAccountCategory()).isEqualTo("RETAIL");
        assertThat(personal.getRole()).isEqualTo("OWNER");
        assertThat(personal.isCanInitiate()).isTrue();
        assertThat(personal.isCanApprove()).isTrue();

        AccessibleAccountDTO corporate = accessibleAccounts.get(1);
        assertThat(corporate.getAccountNumber()).isEqualTo("2009999999");
        assertThat(corporate.getAccountCategory()).isEqualTo("CORPORATE");
        assertThat(corporate.getCompanyName()).isEqualTo("Acme Corp");
        assertThat(corporate.getRole()).isEqualTo("PRIMARY_HOLDER");
        assertThat(corporate.isCanInitiate()).isFalse();
        assertThat(corporate.isCanApprove()).isTrue();
    }

    @Test
    @DisplayName("Cannot close account if current balance is greater than zero")
    void testUpdateAccountStatus_CannotCloseWithRemainingBalance() {
        when(accountRepository.findByAccountNumber("1001234567")).thenReturn(Optional.of(mockAccount));

        AccountStatusUpdateDTO dto = new AccountStatusUpdateDTO();
        dto.setStatus(AccountStatus.CLOSED);

        assertThatThrownBy(() -> accountService.updateAccountStatus("1001234567", dto))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Cannot close account with remaining balance");
    }

    @Test
    @DisplayName("Find account by number returns correct DTO")
    void testGetAccountByNumber_Success() {
        when(accountRepository.findByAccountNumber("1001234567")).thenReturn(Optional.of(mockAccount));

        AccountResponseDTO response = accountService.getAccountByNumber("1001234567");

        assertThat(response).isNotNull();
        assertThat(response.getAccountNumber()).isEqualTo("1001234567");
        assertThat(response.getCustomerCode()).isEqualTo("CUST-1001");
    }
}
