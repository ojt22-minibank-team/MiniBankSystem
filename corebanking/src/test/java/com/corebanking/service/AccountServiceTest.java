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
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.CorporateAccountAccess;
import com.corebanking.entity.CorporateCredential;
import com.corebanking.entity.CorporateUser;
import com.corebanking.entity.enums.CorporateRole;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.AccountSignatoriesRepository;
import com.corebanking.repository.BankTransactionRepository;
import com.corebanking.repository.CompanyInfoRepository;
import com.corebanking.repository.CorporateAccountAccessRepository;
import com.corebanking.repository.CorporateCredentialRepository;
import com.corebanking.repository.CorporateUserRepository;
import com.corebanking.repository.CustomerCredentialsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.StaffUsersRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
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
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
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

    @Mock
    private CompanyInfoRepository companyInfoRepository;

    @Mock
    private CorporateUserRepository corporateUserRepository;

    @Mock
    private CorporateCredentialRepository corporateCredentialRepository;

    @Mock
    private CorporateAccountAccessRepository corporateAccountAccessRepository;

    @Mock
    private BankTransactionRepository bankTransactionRepository;

    @InjectMocks
    private AccountService accountService;

    private Customers mockCustomer;
    private Accounts mockAccount;

    private StaffUsers mockStaff;

    @BeforeEach
    void setUp() {
        mockStaff = StaffUsers.builder()
                .staffId(UUID.randomUUID())
                .staffNo("STF-001")
                .username("admin")
                .fullName("System Admin")
                .build();
        lenient().when(staffUsersRepository.findByUsername(anyString())).thenReturn(Optional.of(mockStaff));
        lenient().when(staffUsersRepository.findAll()).thenReturn(List.of(mockStaff));

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

    @Test
    @DisplayName("Create first Retail Account generates credentials and sends email with customerCode")
    void testCreateRetailAccount_FirstAccount_GeneratesCredentialsAndSendsEmail() {
        AccountCreateDTO dto = new AccountCreateDTO();
        dto.setCustomerCode("CUST-1001");
        dto.setAccountType(AccountType.SAVINGS);
        dto.setInitialDeposit(new BigDecimal("10000.00"));
        dto.setCurrency("MMK");

        when(customerRepository.findByCustomerCode("CUST-1001")).thenReturn(Optional.of(mockCustomer));
        when(accountRepository.findByCustomerCustomerCode("CUST-1001")).thenReturn(Collections.emptyList());
        when(accountRepository.save(any(Accounts.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(customerCredentialsRepository.findByCustomerId(mockCustomer.getId())).thenReturn(Optional.empty());
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_password");

        AccountResponseDTO response = accountService.createAccount(dto);

        assertThat(response).isNotNull();
        assertThat(response.getAccountNumber()).isNotNull();
        assertThat(response.getCustomerCode()).isEqualTo("CUST-1001");

        // Verify credentials saved
        verify(customerCredentialsRepository, times(1)).save(any(CustomerCredentials.class));

        ArgumentCaptor<String> rawPasswordCaptor = ArgumentCaptor.forClass(String.class);
        verify(passwordEncoder, times(1)).encode(rawPasswordCaptor.capture());
        String generatedRawPassword = rawPasswordCaptor.getValue();
        assertThat(generatedRawPassword).isNotEmpty();

        // Verify email sent with customerCode, accountNumber, accountType, and the exact same tempPassword
        verify(cusEmailService, times(1)).sendAccountOpeningConfirmation(
                eq("john@example.com"),
                eq("John Doe"),
                eq("CUST-1001"),
                eq(response.getAccountNumber()),
                eq("SAVINGS"),
                eq(generatedRawPassword)
        );
    }

    @Test
    @DisplayName("Create second Retail Account for existing customer retains credentials without overwriting")
    void testCreateRetailAccount_ExistingCustomer_RetainsCredentialsWithoutOverwriting() {
        AccountCreateDTO dto = new AccountCreateDTO();
        dto.setCustomerCode("CUST-1001");
        dto.setAccountType(AccountType.CURRENT);
        dto.setInitialDeposit(new BigDecimal("10000.00"));
        dto.setCurrency("MMK");

        CustomerCredentials existingCredentials = CustomerCredentials.builder()
                .customerId(mockCustomer.getId())
                .passwordHash("existing_hash")
                .build();

        when(customerRepository.findByCustomerCode("CUST-1001")).thenReturn(Optional.of(mockCustomer));
        when(accountRepository.findByCustomerCustomerCode("CUST-1001")).thenReturn(List.of(mockAccount)); // already has SAVINGS
        when(accountRepository.save(any(Accounts.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(customerCredentialsRepository.findByCustomerId(mockCustomer.getId())).thenReturn(Optional.of(existingCredentials));

        AccountResponseDTO response = accountService.createAccount(dto);

        assertThat(response).isNotNull();
        assertThat(response.getAccountType()).isEqualTo("CURRENT");

        // Verify existing credential hash was retained without saving/overwriting it
        verify(customerCredentialsRepository, never()).save(any(CustomerCredentials.class));

        // Verify email sent
        verify(cusEmailService, times(1)).sendAccountOpeningConfirmation(
                eq("john@example.com"),
                eq("John Doe"),
                eq("CUST-1001"),
                eq(response.getAccountNumber()),
                eq("CURRENT"),
                eq("(Existing Password Retained)")
        );
    }

    @Test
    @DisplayName("Create Corporate Account generates two independent credentials and sends two formal emails")
    void testCreateCorporateAccount_CreatesTwoIndependentCredentialsAndSendsTwoFormalEmails() {
        CorporateAccountCreateDTO dto = CorporateAccountCreateDTO.builder()
                .companyCustomerCode("COMP-20261102-5001")
                .accountType("CURRENT")
                .ceoCustomerCode("CUST-CEO-001")
                .accountantCustomerCode("CUST-ACC-002")
                .ceoFullName("U Tin Win")
                .ceoEmail("ceo@acetech.com")
                .ceoPhone("09111222333")
                .makerFullName("Daw Khin")
                .makerEmail("accountant@acetech.com")
                .makerPhone("09444555666")
                .initialDeposit(new BigDecimal("2000000.00"))
                .currency("MMK")
                .build();

        UUID companyCustomerId = UUID.randomUUID();
        CompanyInfo companyInfo = CompanyInfo.builder()
                .customerId(companyCustomerId)
                .companyName("Ace Global Tech Co., Ltd")
                .registrationNumber("REG-998877")
                .taxId("TAX-998877")
                .build();

        Customers company = Customers.builder()
                .customerId(companyCustomerId)
                .customerCode("COMP-20261102-5001")
                .customerType(CustomerType.COMPANY)
                .fullName("Ace Global Tech Co., Ltd")
                .email("corp@acetech.com")
                .companyInfo(companyInfo)
                .status(CustomerStatus.ACTIVE)
                .build();

        Customers ceoCustomer = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode("CUST-CEO-001")
                .fullName("U Tin Win")
                .email("ceo@acetech.com")
                .build();

        Customers accountantCustomer = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode("CUST-ACC-002")
                .fullName("Daw Khin")
                .email("accountant@acetech.com")
                .build();

        when(customerRepository.findByCustomerCode("COMP-20261102-5001")).thenReturn(Optional.of(company));
        when(customerRepository.findByCustomerCode("CUST-CEO-001")).thenReturn(Optional.of(ceoCustomer));
        when(customerRepository.findByCustomerCode("CUST-ACC-002")).thenReturn(Optional.of(accountantCustomer));
        when(accountRepository.findByCustomerCustomerCode("COMP-20261102-5001")).thenReturn(Collections.emptyList());

        when(corporateUserRepository.findByCompanyInfoCustomerIdAndCorporateRole(any(), eq(CorporateRole.CEO)))
                .thenReturn(Optional.empty());
        when(corporateUserRepository.findByCompanyInfoCustomerIdAndCorporateRole(any(), eq(CorporateRole.MAKER)))
                .thenReturn(Optional.empty());
        when(corporateUserRepository.save(any(CorporateUser.class))).thenAnswer(invocation -> {
            CorporateUser user = invocation.getArgument(0);
            user.setCorporateUserId(UUID.randomUUID());
            return user;
        });

        when(corporateCredentialRepository.findByCorporateUserId(any())).thenReturn(Optional.empty());
        when(corporateCredentialRepository.save(any(CorporateCredential.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(accountRepository.save(any(Accounts.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(corporateAccountAccessRepository.save(any(CorporateAccountAccess.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_corporate_password");

        String createdAccountNumber = accountService.createCorporateAccountWithExistingRoles(dto);

        assertThat(createdAccountNumber).isNotNull();
        assertThat(createdAccountNumber).startsWith("200");

        // Verifies 2 corporate credentials created: one for CEO, one for Maker
        verify(corporateCredentialRepository, times(2)).save(any(CorporateCredential.class));

        ArgumentCaptor<String> encodedPasswordsCaptor = ArgumentCaptor.forClass(String.class);
        verify(passwordEncoder, times(2)).encode(encodedPasswordsCaptor.capture());
        List<String> encodedPasswords = encodedPasswordsCaptor.getAllValues();
        String ceoRawPassword = encodedPasswords.get(0);
        String makerRawPassword = encodedPasswords.get(1);

        assertThat(ceoRawPassword).isNotEmpty();
        assertThat(makerRawPassword).isNotEmpty();
        assertThat(ceoRawPassword).isNotEqualTo(makerRawPassword);

        // Verifies 2 SEPARATE formal emails dispatched: one to CEO, one to Maker with exact passwords
        verify(cusEmailService, times(1)).sendCorporateAccountCredentials(
                eq("ceo@acetech.com"),
                eq("U Tin Win"),
                eq("Ace Global Tech Co., Ltd"),
                eq("COMP-20261102-5001"),
                anyString(),
                eq("CEO / Authorizer"),
                eq(createdAccountNumber),
                eq("CURRENT"),
                eq(ceoRawPassword)
        );

        verify(cusEmailService, times(1)).sendCorporateAccountCredentials(
                eq("accountant@acetech.com"),
                eq("Daw Khin"),
                eq("Ace Global Tech Co., Ltd"),
                eq("COMP-20261102-5001"),
                anyString(),
                eq("Maker / Accountant"),
                eq(createdAccountNumber),
                eq("CURRENT"),
                eq(makerRawPassword)
        );
    }

    @Test
    @DisplayName("Create duplicate active retail account of same type throws IllegalStateException")
    void testCreateAccount_DuplicateAccountType_ThrowsException() {
        AccountCreateDTO dto = new AccountCreateDTO();
        dto.setCustomerCode("CUST-1001");
        dto.setAccountType(AccountType.SAVINGS);

        when(customerRepository.findByCustomerCode("CUST-1001")).thenReturn(Optional.of(mockCustomer));
        when(accountRepository.findByCustomerCustomerCode("CUST-1001")).thenReturn(List.of(mockAccount)); // already active SAVINGS

        assertThatThrownBy(() -> accountService.createAccount(dto))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("SAVINGS");

        verify(accountRepository, never()).save(any(Accounts.class));
    }

    @Test
    @DisplayName("Create duplicate active corporate account throws IllegalStateException")
    void testCreateCorporateAccount_DuplicateCorporateAccount_ThrowsException() {
        CorporateAccountCreateDTO dto = CorporateAccountCreateDTO.builder()
                .companyCustomerCode("COMP-20261102-5001")
                .accountType("CURRENT")
                .build();

        Customers company = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode("COMP-20261102-5001")
                .customerType(CustomerType.COMPANY)
                .fullName("Ace Global Tech Co., Ltd")
                .build();

        Accounts corporateAccount = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("2009998877")
                .accountCategory(AccountCategory.CORPORATE)
                .accountType(AccountType.CURRENT)
                .status(AccountStatus.ACTIVE)
                .customer(company)
                .build();

        when(customerRepository.findByCustomerCode("COMP-20261102-5001")).thenReturn(Optional.of(company));
        when(accountRepository.findByCustomerCustomerCode("COMP-20261102-5001")).thenReturn(List.of(corporateAccount));

        assertThatThrownBy(() -> accountService.createCorporateAccountWithExistingRoles(dto))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("CORPORATE");

        verify(accountRepository, never()).save(any(Accounts.class));
    }

    @Test
    @DisplayName("Create Retail Account with initial deposit below 10,000 MMK throws IllegalArgumentException")
    void testCreateRetailAccount_InitialDepositBelowMinimum_ThrowsException() {
        AccountCreateDTO dto = new AccountCreateDTO();
        dto.setCustomerCode("CUST-1001");
        dto.setAccountType(AccountType.SAVINGS);
        dto.setInitialDeposit(new BigDecimal("9999.00"));
        dto.setCurrency("MMK");

        when(customerRepository.findByCustomerCode("CUST-1001")).thenReturn(Optional.of(mockCustomer));
        when(accountRepository.findByCustomerCustomerCode("CUST-1001")).thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> accountService.createAccount(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Initial deposit for Personal account must be at least 10,000 MMK");

        verify(accountRepository, never()).save(any(Accounts.class));
    }

    @Test
    @DisplayName("Create Corporate Account with initial deposit below 50,000 MMK throws IllegalArgumentException")
    void testCreateCorporateAccount_InitialDepositBelowMinimum_ThrowsException() {
        CorporateAccountCreateDTO dto = CorporateAccountCreateDTO.builder()
                .companyCustomerCode("COMP-20261102-5001")
                .accountType("CURRENT")
                .initialDeposit(new BigDecimal("49999.00"))
                .currency("MMK")
                .build();

        Customers company = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode("COMP-20261102-5001")
                .customerType(CustomerType.COMPANY)
                .fullName("Ace Global Tech Co., Ltd")
                .build();

        when(customerRepository.findByCustomerCode("COMP-20261102-5001")).thenReturn(Optional.of(company));
        when(accountRepository.findByCustomerCustomerCode("COMP-20261102-5001")).thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> accountService.createCorporateAccountWithExistingRoles(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Initial deposit for Corporate account must be at least 50,000 MMK");

        verify(accountRepository, never()).save(any(Accounts.class));
    }

    @Test
    @DisplayName("Create Retail Account with non-MMK currency throws IllegalArgumentException")
    void testCreateRetailAccount_NonMmkCurrency_ThrowsException() {
        AccountCreateDTO dto = new AccountCreateDTO();
        dto.setCustomerCode("CUST-1001");
        dto.setAccountType(AccountType.SAVINGS);
        dto.setInitialDeposit(new BigDecimal("10000.00"));
        dto.setCurrency("USD");

        when(customerRepository.findByCustomerCode("CUST-1001")).thenReturn(Optional.of(mockCustomer));
        when(accountRepository.findByCustomerCustomerCode("CUST-1001")).thenReturn(Collections.emptyList());

        assertThatThrownBy(() -> accountService.createAccount(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Only MMK is supported");

        verify(accountRepository, never()).save(any(Accounts.class));
    }
}
