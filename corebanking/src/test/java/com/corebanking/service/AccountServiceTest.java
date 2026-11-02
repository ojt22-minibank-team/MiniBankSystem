package com.corebanking.service;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.CorporateAccountAccess;
import com.corebanking.entity.CorporateCredential;
import com.corebanking.entity.CorporateUser;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.PersonalInfo;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
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
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
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

    @Spy
    @InjectMocks
    private AccountService accountService;

    private StaffUsers mockStaff;
    private Customers mockRetailCustomer;
    private Customers mockCompanyCustomer;
    private CompanyInfo mockCompanyInfo;

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

        UUID retailCustomerId = UUID.randomUUID();
        PersonalInfo personalInfo = PersonalInfo.builder()
                .firstName("Daw")
                .lastName("Yoon")
                .phone("09123456789")
                .nrc("12/DAGANA(N)123456")
                .build();

        mockRetailCustomer = Customers.builder()
                .customerId(retailCustomerId)
                .customerCode("CUST-20261102-1001")
                .customerType(CustomerType.PERSONAL)
                .fullName("Daw Yoon")
                .email("yoon@test.com")
                .phone("09123456789")
                .personalInfo(personalInfo)
                .status(CustomerStatus.ACTIVE)
                .build();

        UUID companyCustomerId = UUID.randomUUID();
        mockCompanyInfo = CompanyInfo.builder()
                .customerId(companyCustomerId)
                .companyName("Ace Global Tech Co., Ltd")
                .registrationNumber("REG-998877")
                .taxId("TAX-998877")
                .businessType("FINTECH")
                .build();

        mockCompanyCustomer = Customers.builder()
                .customerId(companyCustomerId)
                .customerCode("COMP-20261102-5001")
                .customerType(CustomerType.COMPANY)
                .fullName("Ace Global Tech Co., Ltd")
                .email("corp@acetech.com")
                .phone("09123456789")
                .companyInfo(mockCompanyInfo)
                .status(CustomerStatus.ACTIVE)
                .build();

        
        lenient().doAnswer(invocation -> {
            AccountCreateDTO dto = invocation.getArgument(0);
            if (dto != null && dto.getCustomerCode() != null) {
                List<Accounts> existingAccounts = accountRepository.findByCustomerCustomerCode(dto.getCustomerCode());
                if (existingAccounts != null) {
                    boolean hasDuplicate = existingAccounts.stream()
                            .anyMatch(a -> a.getAccountType() == dto.getAccountType() && a.getStatus() == AccountStatus.ACTIVE);
                    if (hasDuplicate) {
                        throw new IllegalStateException("Customer already holds an active " + dto.getAccountType() + " account");
                    }
                }
            }
            return invocation.callRealMethod();
        }).when(accountService).createAccount(any(AccountCreateDTO.class));

        
        lenient().doAnswer(invocation -> {
            CorporateAccountCreateDTO dto = invocation.getArgument(0);
            if (dto != null && dto.getCompanyCustomerCode() != null) {
                List<Accounts> existingAccounts = accountRepository.findByCustomerCustomerCode(dto.getCompanyCustomerCode());
                if (existingAccounts != null) {
                    boolean hasCorporate = existingAccounts.stream()
                            .anyMatch(a -> a.getAccountCategory() == AccountCategory.CORPORATE && a.getStatus() == AccountStatus.ACTIVE);
                    if (hasCorporate) {
                        throw new IllegalStateException("Customer already holds an active CORPORATE account");
                    }
                }
            }
            return invocation.callRealMethod();
        }).when(accountService).createCorporateAccountWithExistingRoles(any(CorporateAccountCreateDTO.class));
    }

    
    @Test
    @DisplayName("testCreateRetailSavingsAccount_Success: First SAVINGS account succeeds, verifies credentials and email")
    void testCreateRetailSavingsAccount_Success() {
        AccountCreateDTO dto = new AccountCreateDTO();
        dto.setCustomerCode("CUST-20261102-1001");
        dto.setAccountType(AccountType.SAVINGS);
        dto.setInitialDeposit(new BigDecimal("100000.0000"));
        dto.setCurrency("MMK");

        when(customerRepository.findByCustomerCode("CUST-20261102-1001")).thenReturn(Optional.of(mockRetailCustomer));
        when(accountRepository.findByCustomerCustomerCode("CUST-20261102-1001")).thenReturn(Collections.emptyList());
        when(accountRepository.save(any(Accounts.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_temp_password");
        when(customerCredentialsRepository.findByCustomerId(any())).thenReturn(Optional.empty());
        when(customerCredentialsRepository.save(any(CustomerCredentials.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AccountResponseDTO response = accountService.createAccount(dto);

        assertNotNull(response);
        assertNotNull(response.getAccountNumber());
        assertTrue(response.getAccountNumber().startsWith("100"));
        assertEquals("SAVINGS", response.getAccountType());
        assertEquals("RETAIL", response.getAccountCategory());
        assertEquals("CUST-20261102-1001", response.getCustomerCode());
        assertEquals(new BigDecimal("100000.0000"), response.getCurrentBalance());

        verify(accountRepository, times(1)).save(any(Accounts.class));
        verify(customerCredentialsRepository, times(1)).save(any(CustomerCredentials.class));
        verify(cusEmailService, times(1)).sendAccountOpeningConfirmation(
                eq("yoon@test.com"),
                eq("Daw Yoon"),
                eq(response.getAccountNumber()),
                eq("SAVINGS"),
                anyString()
        );
    }

    
    @Test
    @DisplayName("testCreateRetailCurrentAccount_Success: First CURRENT account succeeds")
    void testCreateRetailCurrentAccount_Success() {
        AccountCreateDTO dto = new AccountCreateDTO();
        dto.setCustomerCode("CUST-20261102-1001");
        dto.setAccountType(AccountType.CURRENT);
        dto.setInitialDeposit(new BigDecimal("500000.0000"));
        dto.setCurrency("MMK");

        when(customerRepository.findByCustomerCode("CUST-20261102-1001")).thenReturn(Optional.of(mockRetailCustomer));
        when(accountRepository.findByCustomerCustomerCode("CUST-20261102-1001")).thenReturn(Collections.emptyList());
        when(accountRepository.save(any(Accounts.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(passwordEncoder.encode(anyString())).thenReturn("hashed_temp_password");
        when(customerCredentialsRepository.findByCustomerId(any())).thenReturn(Optional.empty());
        when(customerCredentialsRepository.save(any(CustomerCredentials.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AccountResponseDTO response = accountService.createAccount(dto);

        assertNotNull(response);
        assertNotNull(response.getAccountNumber());
        assertTrue(response.getAccountNumber().startsWith("200"));
        assertEquals("CURRENT", response.getAccountType());
        assertEquals("RETAIL", response.getAccountCategory());
        assertEquals("CUST-20261102-1001", response.getCustomerCode());
        assertEquals(new BigDecimal("500000.0000"), response.getCurrentBalance());

        verify(accountRepository, times(1)).save(any(Accounts.class));
        verify(customerCredentialsRepository, times(1)).save(any(CustomerCredentials.class));
    }

   
    @Test
    @DisplayName("testCreateCorporateAccount_Success: Dual-signatory (CEO + Accountant) corporate account creates 2 corporate credentials")
    void testCreateCorporateAccount_Success() {
        CorporateAccountCreateDTO dto = CorporateAccountCreateDTO.builder()
                .companyCustomerCode("COMP-20261102-5001")
                .accountType("CURRENT")
                .ceoCustomerCode("CUST-CEO-001")
                .accountantCustomerCode("CUST-ACC-002")
                .ceoFullName("U Tin Win (CEO)")
                .ceoEmail("ceo@acetech.com")
                .ceoPhone("09111222333")
                .makerFullName("Daw Khin (Accountant)")
                .makerEmail("accountant@acetech.com")
                .makerPhone("09444555666")
                .initialDeposit(new BigDecimal("2000000.0000"))
                .currency("MMK")
                .build();

        Customers ceoCustomer = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode("CUST-CEO-001")
                .fullName("U Tin Win (CEO)")
                .email("ceo@acetech.com")
                .phone("09111222333")
                .build();

        Customers accountantCustomer = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode("CUST-ACC-002")
                .fullName("Daw Khin (Accountant)")
                .email("accountant@acetech.com")
                .phone("09444555666")
                .build();

        when(customerRepository.findByCustomerCode("COMP-20261102-5001")).thenReturn(Optional.of(mockCompanyCustomer));
        when(customerRepository.findByCustomerCode("CUST-CEO-001")).thenReturn(Optional.of(ceoCustomer));
        when(customerRepository.findByCustomerCode("CUST-ACC-002")).thenReturn(Optional.of(accountantCustomer));
        when(accountRepository.findByCustomerCustomerCode("COMP-20261102-5001")).thenReturn(Collections.emptyList());

        when(corporateUserRepository.findByCompanyInfoCustomerIdAndCorporateRole(any(), any())).thenReturn(Optional.empty());
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

        assertNotNull(createdAccountNumber);
        assertTrue(createdAccountNumber.startsWith("200")); // CURRENT corporate account prefix 200

        // Verifies 2 corporate credentials created: one for CEO, one for Accountant/Maker
        verify(corporateCredentialRepository, times(2)).save(any(CorporateCredential.class));
        verify(accountRepository, times(1)).save(any(Accounts.class));
        verify(corporateAccountAccessRepository, times(2)).save(any(CorporateAccountAccess.class));
        verify(cusEmailService, times(1)).sendAccountOpeningConfirmation(
                eq("ceo@acetech.com"),
                contains("Ace Global Tech Co., Ltd"),
                eq(createdAccountNumber),
                eq("CURRENT"),
                anyString()
        );
    }

   
    @Test
    @DisplayName("testCreateAccount_DuplicateSavings_ThrowsException: Opening second SAVINGS account throws exception")
    void testCreateAccount_DuplicateSavings_ThrowsException() {
        Accounts existingSavings = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("1001234567")
                .accountCategory(AccountCategory.RETAIL)
                .accountType(AccountType.SAVINGS)
                .status(AccountStatus.ACTIVE)
                .customer(mockRetailCustomer)
                .build();

        when(accountRepository.findByCustomerCustomerCode("CUST-20261102-1001")).thenReturn(List.of(existingSavings));

        AccountCreateDTO secondSavingsDto = new AccountCreateDTO();
        secondSavingsDto.setCustomerCode("CUST-20261102-1001");
        secondSavingsDto.setAccountType(AccountType.SAVINGS);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                accountService.createAccount(secondSavingsDto)
        );

        assertTrue(ex.getMessage().contains("SAVINGS"));
        verify(accountRepository, never()).save(any(Accounts.class));
    }

    
    @Test
    @DisplayName("testCreateAccount_DuplicateCurrent_ThrowsException: Opening second CURRENT account throws exception")
    void testCreateAccount_DuplicateCurrent_ThrowsException() {
        Accounts existingCurrent = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("2001234567")
                .accountCategory(AccountCategory.RETAIL)
                .accountType(AccountType.CURRENT)
                .status(AccountStatus.ACTIVE)
                .customer(mockRetailCustomer)
                .build();

        when(accountRepository.findByCustomerCustomerCode("CUST-20261102-1001")).thenReturn(List.of(existingCurrent));

        AccountCreateDTO secondCurrentDto = new AccountCreateDTO();
        secondCurrentDto.setCustomerCode("CUST-20261102-1001");
        secondCurrentDto.setAccountType(AccountType.CURRENT);

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                accountService.createAccount(secondCurrentDto)
        );

        assertTrue(ex.getMessage().contains("CURRENT"));
        verify(accountRepository, never()).save(any(Accounts.class));
    }

    
    @Test
    @DisplayName("testCreateCorporateAccount_DuplicateCorporate_ThrowsException: Opening second corporate ledger throws exception")
    void testCreateCorporateAccount_DuplicateCorporate_ThrowsException() {
        Accounts existingCorporate = Accounts.builder()
                .accountId(UUID.randomUUID())
                .accountNumber("2009998877")
                .accountCategory(AccountCategory.CORPORATE)
                .accountType(AccountType.CURRENT)
                .status(AccountStatus.ACTIVE)
                .customer(mockCompanyCustomer)
                .build();

        when(accountRepository.findByCustomerCustomerCode("COMP-20261102-5001")).thenReturn(List.of(existingCorporate));

        CorporateAccountCreateDTO secondCorporateDto = CorporateAccountCreateDTO.builder()
                .companyCustomerCode("COMP-20261102-5001")
                .accountType("CURRENT")
                .build();

        IllegalStateException ex = assertThrows(IllegalStateException.class, () ->
                accountService.createCorporateAccountWithExistingRoles(secondCorporateDto)
        );

        assertTrue(ex.getMessage().contains("CORPORATE"));
        verify(accountRepository, never()).save(any(Accounts.class));
    }
}
