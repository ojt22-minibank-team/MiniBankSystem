package com.corebanking.service;

import com.corebanking.dto.*;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.repository.*;
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
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Admin Create Operations Audit Logging Verification Test")
class AdminCreateAuditLoggingTest {

    @Mock
    private AuditTrailService auditTrailService;

    // Staff Mocks
    @Mock
    private StaffUsersRepository staffUsersRepository;
    @Mock
    private StaffUserRolesRepository staffUserRolesRepository;
    @Mock
    private RolesRepository rolesRepository;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private AuthSessionsRepository authSessionsRepository;

    private StaffManagementService staffManagementService;

    // Announcement Mocks
    @Mock
    private AnnouncementsRepository announcementsRepository;

    private AnnouncementService announcementService;

    // System Rules Mocks
    @Mock
    private SystemParametersRepository systemParametersRepository;
    @Mock
    private FeeSchedulesRepository feeSchedulesRepository;

    private SystemRulesConfigService systemRulesConfigService;

    // Customer Mocks
    @Mock
    private CustomerRepository customerRepository;
    @Mock
    private PersonalInfoRepository personalInfoRepository;
    @Mock
    private CompanyInfoRepository companyInfoRepository;
    @Mock
    private CustomerCredentialsRepository customerCredentialsRepository;
    @Mock
    private CusEmailService cusEmailService;

    private CustomerService customerService;

    // Account Mocks
    @Mock
    private AccountRepository accountRepository;
    @Mock
    private AccountSignatoriesRepository accountSignatoriesRepository;
    @Mock
    private CorporateUserRepository corporateUserRepository;
    @Mock
    private CorporateCredentialRepository corporateCredentialRepository;
    @Mock
    private CorporateAccountAccessRepository corporateAccountAccessRepository;
    @Mock
    private BankTransactionRepository bankTransactionRepository;

    private AccountService accountService;

    @BeforeEach
    void setUp() {
        staffManagementService = new StaffManagementService(
                staffUsersRepository,
                staffUserRolesRepository,
                rolesRepository,
                passwordEncoder,
                authSessionsRepository,
                auditTrailService
        );

        announcementService = new AnnouncementService(
                announcementsRepository,
                staffUsersRepository,
                auditTrailService
        );

        systemRulesConfigService = new SystemRulesConfigService(
                systemParametersRepository,
                feeSchedulesRepository,
                staffUsersRepository,
                auditTrailService
        );

        customerService = new CustomerService(
                customerRepository,
                personalInfoRepository,
                companyInfoRepository,
                customerCredentialsRepository,
                staffUsersRepository,
                passwordEncoder,
                cusEmailService,
                auditTrailService
        );

        accountService = new AccountService(
                accountRepository,
                customerRepository,
                staffUsersRepository,
                cusEmailService,
                accountSignatoriesRepository,
                customerCredentialsRepository,
                passwordEncoder,
                companyInfoRepository,
                corporateUserRepository,
                corporateCredentialRepository,
                corporateAccountAccessRepository,
                bankTransactionRepository,
                auditTrailService
        );
    }

    @Test
    @DisplayName("Staff Creation should generate CREATE_STAFF audit entry")
    void createStaff_GeneratesAuditLog() {
        Integer roleId = 2;
        Roles tellerRole = new Roles();
        tellerRole.setRoleId(roleId);
        tellerRole.setRoleCode("TELLER");
        tellerRole.setRoleName("Teller");

        when(staffUsersRepository.existsByEmailIgnoreCase(anyString())).thenReturn(false);
        when(staffUsersRepository.existsByUsernameCustom(anyString())).thenReturn(false);
        when(rolesRepository.findById(roleId)).thenReturn(Optional.of(tellerRole));
        when(passwordEncoder.encode(any())).thenReturn("hashed-secret");

        StaffUsers savedStaff = StaffUsers.builder()
                .staffId(UUID.randomUUID())
                .staffNo("TEL-0001")
                .username("test.teller")
                .fullName("Test Teller")
                .email("teller@bank.com")
                .status(StaffUserStatus.ACTIVE)
                .build();
        when(staffUsersRepository.save(any(StaffUsers.class))).thenReturn(savedStaff);

        StaffCreateRequest request = new StaffCreateRequest();
        request.setUsername("test.teller");
        request.setFullName("Test Teller");
        request.setEmail("teller@bank.com");
        request.setRoleId(roleId);

        staffManagementService.createStaff(request);

        ArgumentCaptor<String> actionTypeCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> entityTypeCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> entityIdCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<String> categoryCaptor = ArgumentCaptor.forClass(String.class);

        verify(auditTrailService, times(1)).logDataChange(
                categoryCaptor.capture(),
                actionTypeCaptor.capture(),
                entityTypeCaptor.capture(),
                entityIdCaptor.capture(),
                isNull(),
                any(),
                anyString()
        );

        assertThat(categoryCaptor.getValue()).isEqualTo("SECURITY");
        assertThat(actionTypeCaptor.getValue()).isEqualTo("CREATE_STAFF");
        assertThat(entityTypeCaptor.getValue()).isEqualTo("STAFF_USER");
        assertThat(entityIdCaptor.getValue()).isEqualTo("TEL-0001");
    }

    @Test
    @DisplayName("Announcement Creation should generate CREATE_ANNOUNCEMENT audit entry")
    void createAnnouncement_GeneratesAuditLog() {
        StaffUsers admin = StaffUsers.builder()
                .staffId(UUID.randomUUID())
                .username("admin.nay")
                .build();
        when(staffUsersRepository.findByUsername("admin.nay")).thenReturn(Optional.of(admin));

        Announcements saved = new Announcements();
        saved.setAnnouncementId(101);
        saved.setTitle("Scheduled System Maintenance");
        saved.setMessage("Maintenance tonight at 11 PM");
        saved.setAudience(AnnouncementAudience.ALL);
        saved.setActive(true);
        saved.setStartsAt(LocalDateTime.now().minusHours(1));
        saved.setEndsAt(LocalDateTime.now().plusDays(2));
        when(announcementsRepository.save(any(Announcements.class))).thenReturn(saved);

        AnnouncementCreateRequest request = new AnnouncementCreateRequest();
        request.setTitle("Scheduled System Maintenance");
        request.setMessage("Maintenance tonight at 11 PM");
        request.setAudience(AnnouncementAudience.ALL);
        request.setStartsAt(LocalDateTime.now().minusHours(1));
        request.setEndsAt(LocalDateTime.now().plusDays(2));

        announcementService.createAnnouncement(request, "admin.nay");

        verify(auditTrailService, times(1)).logDataChange(
                eq("SYSTEM"),
                eq("CREATE_ANNOUNCEMENT"),
                eq("ANNOUNCEMENT"),
                eq("101"),
                isNull(),
                any(),
                contains("Created announcement")
        );
    }

    @Test
    @DisplayName("System Parameter Creation should generate CREATE_SYSTEM_PARAM audit entry")
    void createParameter_GeneratesAuditLog() {
        StaffUsers admin = StaffUsers.builder()
                .staffId(UUID.randomUUID())
                .username("admin.nay")
                .build();
        when(staffUsersRepository.findByUsername(any())).thenReturn(Optional.of(admin));
        when(systemParametersRepository.existsByParameterKeyIgnoreCase("DAILY_WITHDRAW_LIMIT")).thenReturn(false);

        SystemParameters saved = SystemParameters.builder()
                .parameterId(1)
                .parameterKey("DAILY_WITHDRAW_LIMIT")
                .parameterValue("5000000")
                .description("Daily maximum withdrawal cap")
                .build();
        when(systemParametersRepository.save(any())).thenReturn(saved);

        SystemParameterCreateRequest req = new SystemParameterCreateRequest();
        req.setParameterKey("DAILY_WITHDRAW_LIMIT");
        req.setParameterValue("5000000");
        req.setDescription("Daily maximum withdrawal cap");

        systemRulesConfigService.createParameter(req);

        verify(auditTrailService, times(1)).logDataChange(
                eq("SYSTEM"),
                eq("CREATE_SYSTEM_PARAM"),
                eq("SYSTEM_PARAMETER"),
                eq("DAILY_WITHDRAW_LIMIT"),
                isNull(),
                any(),
                contains("Created system parameter")
        );
    }

    @Test
    @DisplayName("Fee Schedule Creation should generate CREATE_FEE_SCHEDULE audit entry")
    void createFee_GeneratesAuditLog() {
        StaffUsers admin = StaffUsers.builder()
                .staffId(UUID.randomUUID())
                .username("admin.nay")
                .build();
        when(staffUsersRepository.findByUsername(any())).thenReturn(Optional.of(admin));
        when(feeSchedulesRepository.existsByFeeCodeIgnoreCase("FEE_EXPRESS_TX")).thenReturn(false);

        FeeSchedules saved = FeeSchedules.builder()
                .feeScheduleId(5)
                .feeCode("FEE_EXPRESS_TX")
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .feeType(FeeType.FLAT)
                .feeValue(new BigDecimal("500.00"))
                .currency("MMK")
                .isActive(true)
                .build();
        when(feeSchedulesRepository.save(any())).thenReturn(saved);

        FeeScheduleCreateRequest req = new FeeScheduleCreateRequest();
        req.setFeeCode("FEE_EXPRESS_TX");
        req.setTransactionType(TransactionType.INTERNAL_TRANSFER);
        req.setFeeType(FeeType.FLAT);
        req.setFeeValue(new BigDecimal("500.00"));
        req.setCurrency("MMK");

        systemRulesConfigService.createFee(req);

        verify(auditTrailService, times(1)).logDataChange(
                eq("SYSTEM"),
                eq("CREATE_FEE_SCHEDULE"),
                eq("FEE_SCHEDULE"),
                eq("FEE_EXPRESS_TX"),
                isNull(),
                any(),
                contains("Created fee schedule")
        );
    }

    @Test
    @DisplayName("Customer Creation should generate CREATE_CUSTOMER audit entry")
    void createCustomer_GeneratesAuditLog() {
        StaffUsers staff = StaffUsers.builder()
                .staffId(UUID.randomUUID())
                .username("admin.nay")
                .fullName("Admin Nay")
                .build();
        when(staffUsersRepository.findByUsername("admin.nay")).thenReturn(Optional.of(staff));
        when(customerRepository.existsByEmail(anyString())).thenReturn(false);
        when(customerRepository.existsByPhone(anyString())).thenReturn(false);
        when(customerRepository.existsByCustomerCode(anyString())).thenReturn(false);
        when(personalInfoRepository.existsByNrc(anyString())).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hashed-pwd");
        when(customerRepository.saveAndFlush(any(Customers.class))).thenAnswer(inv -> inv.getArgument(0));

        CustomerDTO dto = new CustomerDTO();
        dto.setCustomerType("PERSONAL");
        dto.setFirstName("Aung");
        dto.setLastName("Kyaw");
        dto.setEmail("aung.kyaw@example.com");
        dto.setPhone("09123456789");
        dto.setNrc("12/DAGAMA(N)123456");
        dto.setGender("MALE");
        dto.setAddress("Yangon");

        customerService.createCustomer(dto);

        verify(auditTrailService, times(1)).logDataChange(
                eq("CUSTOMER"),
                eq("CREATE_CUSTOMER"),
                eq("CUSTOMER"),
                anyString(),
                isNull(),
                any(),
                contains("Created new PERSONAL customer")
        );
    }

    @Test
    @DisplayName("Account Creation should generate CREATE_ACCOUNT audit entry")
    void createAccount_GeneratesAuditLog() {
        StaffUsers staff = StaffUsers.builder()
                .staffId(UUID.randomUUID())
                .username("admin.nay")
                .fullName("Admin Nay")
                .build();
        when(staffUsersRepository.findByUsername("admin.nay")).thenReturn(Optional.of(staff));

        Customers customer = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode("CUST-20261102-1234")
                .fullName("Aung Kyaw")
                .email("aung.kyaw@example.com")
                .status(CustomerStatus.ACTIVE)
                .build();
        when(customerRepository.findByCustomerCode("CUST-20261102-1234")).thenReturn(Optional.of(customer));
        when(accountRepository.save(any(Accounts.class))).thenAnswer(inv -> inv.getArgument(0));
        when(customerCredentialsRepository.findByCustomerId(any())).thenReturn(Optional.empty());

        AccountCreateDTO accountDto = new AccountCreateDTO();
        accountDto.setCustomerCode("CUST-20261102-1234");
        accountDto.setAccountType(AccountType.SAVINGS);
        accountDto.setCurrency("MMK");
        accountDto.setInitialDeposit(BigDecimal.ZERO);

        accountService.createAccount(accountDto);

        verify(auditTrailService, times(1)).logDataChange(
                eq("ACCOUNT"),
                eq("CREATE_ACCOUNT"),
                eq("ACCOUNT"),
                anyString(),
                isNull(),
                any(),
                contains("Created new SAVINGS account")
        );
    }

    @Test
    @DisplayName("Staff Role Change should generate STAFF_ROLE_CHANGE audit entry")
    void changeRole_GeneratesAuditLog() {
        UUID staffId = UUID.randomUUID();
        StaffUsers staff = StaffUsers.builder()
                .staffId(staffId)
                .staffNo("STF-TLR-0001")
                .username("teller.user")
                .fullName("Teller User")
                .tokenVersion(1L)
                .build();

        Roles currentRole = Roles.builder()
                .roleId(2)
                .roleCode("TELLER")
                .roleName("Teller")
                .build();

        Roles newRole = Roles.builder()
                .roleId(1)
                .roleCode("ADMIN")
                .roleName("Administrator")
                .build();

        StaffUserRoles currentAssignment = new StaffUserRoles();
        currentAssignment.setStaffId(staffId);
        currentAssignment.setRoleId(currentRole.getRoleId());

        when(staffUsersRepository.findById(staffId)).thenReturn(Optional.of(staff));
        when(rolesRepository.findById(newRole.getRoleId())).thenReturn(Optional.of(newRole));
        when(rolesRepository.findById(currentRole.getRoleId())).thenReturn(Optional.of(currentRole));
        when(staffUserRolesRepository.findByStaffId(staffId)).thenReturn(Optional.of(currentAssignment));
        when(staffUsersRepository.save(any(StaffUsers.class))).thenAnswer(inv -> inv.getArgument(0));

        ChangeStaffRoleRequest request = new ChangeStaffRoleRequest();
        request.setRoleId(newRole.getRoleId());

        staffManagementService.changeRole(staffId, request);

        verify(auditTrailService, times(1)).logDataChange(
                eq("SECURITY"),
                eq("STAFF_ROLE_CHANGE"),
                eq("STAFF_USER"),
                anyString(),
                any(),
                any(),
                contains("Changed role for staff teller.user")
        );
    }

    @Test
    @DisplayName("Update Account Status should generate UPDATE_ACCOUNT_STATUS audit entry")
    void updateAccountStatus_GeneratesAuditLog() {
        Accounts account = Accounts.builder()
                .accountNumber("1001234567")
                .status(AccountStatus.ACTIVE)
                .currentBalance(new BigDecimal("500000.00"))
                .availableBalance(new BigDecimal("500000.00"))
                .build();

        when(accountRepository.findByAccountNumber("1001234567")).thenReturn(Optional.of(account));
        when(accountRepository.save(any(Accounts.class))).thenAnswer(inv -> inv.getArgument(0));

        AccountStatusUpdateDTO dto = new AccountStatusUpdateDTO();
        dto.setStatus(AccountStatus.FROZEN);
        dto.setReason("Court order freeze");

        accountService.updateAccountStatus("1001234567", dto);

        verify(auditTrailService, times(1)).logDataChange(
                eq("ACCOUNT"),
                eq("UPDATE_ACCOUNT_STATUS"),
                eq("ACCOUNT"),
                eq("1001234567"),
                any(),
                any(),
                contains("Updated account status from ACTIVE to FROZEN")
        );
    }
}
