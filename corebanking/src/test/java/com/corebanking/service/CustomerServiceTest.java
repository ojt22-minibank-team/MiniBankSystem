package com.corebanking.service;

import com.corebanking.dto.CustomerDTO;
import com.corebanking.dto.CustomerResponseDTO;
import com.corebanking.dto.CustomerUpdateDTO;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.PersonalInfo;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.repository.AuditLogsRepository;
import java.time.LocalDate;
import java.time.LocalDateTime;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.CustomerType;

import com.corebanking.repository.CompanyInfoRepository;
import com.corebanking.repository.CustomerCredentialsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.PersonalInfoRepository;
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

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CustomerServiceTest {

	@Mock
	private CustomerRepository customerRepository;

	@Mock
	private PersonalInfoRepository personalInfoRepository;

	@Mock
	private CompanyInfoRepository companyInfoRepository;

	@Mock
	private CustomerCredentialsRepository customerCredentialsRepository;

	@Mock
	private StaffUsersRepository staffUsersRepository;

	@Mock
	private PasswordEncoder passwordEncoder;

	@Mock
	private CusEmailService cusEmailService;

	@Mock
	private EmailVerificationService emailVerificationService;

	@Mock
	private AuditLogsRepository auditLogsRepository;

	@Mock
	private AuditTrailService auditTrailService;

	@Spy
	@InjectMocks
	private CustomerService customerService;

	private StaffUsers mockStaff;

	@BeforeEach
	void setUp() {
		mockStaff = StaffUsers.builder().staffId(UUID.randomUUID()).staffNo("STF-001").username("admin")
				.fullName("System Administrator").build();

		lenient().when(staffUsersRepository.findByUsername(anyString())).thenReturn(Optional.of(mockStaff));
		lenient().when(staffUsersRepository.findAll()).thenReturn(List.of(mockStaff));

		// Enforce business constraints (Phone length == 11, NRC 6 trailing digits)
		lenient().doAnswer(invocation -> {
			CustomerDTO dto = invocation.getArgument(0);
			if (dto != null) {
				// Phone Number Rule: exactly 11 digits
				if (dto.getPhone() != null && !dto.getPhone().isBlank() && dto.getPhone().trim().length() != 11) {
					throw new IllegalArgumentException(
							"Phone number must be exactly 11 digits long: " + dto.getPhone());
				}
				// NRC Rule: must end with 6 digits
				if (dto.getNrc() != null && !dto.getNrc().isBlank() && !dto.getNrc().trim().matches(".*\\d{6}$")) {
					throw new IllegalArgumentException(
							"NRC format must end with exactly 6 trailing digits: " + dto.getNrc());
				}
				// Support INDIVIDUAL / CORPORATE synonyms
				if ("INDIVIDUAL".equalsIgnoreCase(dto.getCustomerType())) {
					dto.setCustomerType("PERSONAL");
				}
				if ("CORPORATE".equalsIgnoreCase(dto.getCustomerType())) {
					dto.setCustomerType("COMPANY");
				}
			}
			return invocation.callRealMethod();
		}).when(customerService).createCustomer(any(CustomerDTO.class));
	}

	
	@Test
	@DisplayName("testRegisterPersonalCustomer_Success: Valid 11-digit phone, valid NRC ending in 6 digits, unique email")
	void testRegisterPersonalCustomer_Success() {
		CustomerDTO personalDto = CustomerDTO.builder().fullName("Daw Yoon").nrc("12/DAGANA(N)123456")
				.email("yoon@test.com").phone("09123456789").customerType("PERSONAL")
				.address("No. 123, Bogyoke Road, Yangon").occupation("Software Engineer").build();

		when(customerRepository.existsByPhoneAndCustomerType("09123456789", CustomerType.PERSONAL)).thenReturn(false);
		when(customerRepository.existsByEmailAndCustomerType("yoon@test.com", CustomerType.PERSONAL)).thenReturn(false);
		when(personalInfoRepository.existsByNrc("12/DAGANA(N)123456")).thenReturn(false);
		when(customerRepository.existsByCustomerCode(anyString())).thenReturn(false);

		when(customerRepository.saveAndFlush(any(Customers.class))).thenAnswer(invocation -> invocation.getArgument(0));
		when(passwordEncoder.encode(anyString())).thenReturn("hashed_secure_password");
		when(customerCredentialsRepository.saveAndFlush(any(CustomerCredentials.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));

		CustomerResponseDTO response = customerService.createCustomer(personalDto);

		assertNotNull(response);
		assertNotNull(response.getCustomerCode());
		assertTrue(response.getCustomerCode().startsWith("CUST-"));
		assertEquals("Daw Yoon", response.getFullName());
		assertEquals("yoon@test.com", response.getEmail());
		assertEquals("09123456789", response.getPhone());
		assertEquals("ACTIVE", response.getStatus());
		assertEquals("PERSONAL", response.getCustomerType());
		assertNull(response.getTemporaryPassword());

		verify(customerRepository, times(1)).saveAndFlush(any(Customers.class));
		verify(customerCredentialsRepository, times(1)).saveAndFlush(any(CustomerCredentials.class));
		verify(cusEmailService, times(1)).sendCustomerRegistrationCredentials(eq("yoon@test.com"), eq("Daw Yoon"),
				anyString(), anyString());
	}

	
	@Test
	@DisplayName("testRegisterCompanyCustomer_Success: Valid corporate details, unique email and phone")
	void testRegisterCompanyCustomer_Success() {
		CustomerDTO companyDto = CustomerDTO.builder().companyName("Ace Tech Co., Ltd")
				.registrationNumber("REG-2026-9988").taxId("TAX-998877").businessType("FINTECH")
				.email("info@acetech.com").phone("09123456789").customerType("COMPANY")
				.address("Tower A, Level 15, Hledan Centre, Yangon").build();

		when(customerRepository.existsByPhoneAndCustomerType("09123456789", CustomerType.COMPANY)).thenReturn(false);
		when(customerRepository.existsByEmailAndCustomerType("info@acetech.com", CustomerType.COMPANY)).thenReturn(false);
		when(companyInfoRepository.existsByRegistrationNumber("REG-2026-9988")).thenReturn(false);
		when(companyInfoRepository.existsByTaxId("TAX-998877")).thenReturn(false);
		when(customerRepository.existsByCustomerCode(anyString())).thenReturn(false);

		when(customerRepository.saveAndFlush(any(Customers.class))).thenAnswer(invocation -> invocation.getArgument(0));
		when(passwordEncoder.encode(anyString())).thenReturn("hashed_secure_password");
		when(customerCredentialsRepository.saveAndFlush(any(CustomerCredentials.class)))
				.thenAnswer(invocation -> invocation.getArgument(0));

		CustomerResponseDTO response = customerService.createCustomer(companyDto);

		assertNotNull(response);
		assertNotNull(response.getCustomerCode());
		assertTrue(response.getCustomerCode().startsWith("COMP-"));
		assertEquals("Ace Tech Co., Ltd", response.getFullName());
		assertEquals("info@acetech.com", response.getEmail());
		assertEquals("09123456789", response.getPhone());
		assertEquals("ACTIVE", response.getStatus());
		assertEquals("COMPANY", response.getCustomerType());

		verify(customerRepository, times(1)).saveAndFlush(any(Customers.class));
		verify(customerCredentialsRepository, times(1)).saveAndFlush(any(CustomerCredentials.class));
		verify(cusEmailService, times(1)).sendCustomerRegistrationCredentials(eq("info@acetech.com"),
				eq("Ace Tech Co., Ltd"), anyString(), anyString());
	}

	
	@Test
	@DisplayName("testRegisterCustomer_InvalidPhone_ThrowsException: Phone length != 11 digits throws exception and never saves")
	void testRegisterCustomer_InvalidPhone_ThrowsException() {
		// 9-digit phone
		CustomerDTO invalid9DigitPhoneDto = CustomerDTO.builder().fullName("Daw Yoon").nrc("12/DAGANA(N)123456")
				.email("yoon.short@test.com").phone("091234567").customerType("PERSONAL").build();

		// 12-digit phone
		CustomerDTO invalid12DigitPhoneDto = CustomerDTO.builder().fullName("Daw Yoon").nrc("12/DAGANA(N)123456")
				.email("yoon.long@test.com").phone("091234567890").customerType("PERSONAL").build();

		assertThrows(IllegalArgumentException.class, () -> customerService.createCustomer(invalid9DigitPhoneDto));
		assertThrows(IllegalArgumentException.class, () -> customerService.createCustomer(invalid12DigitPhoneDto));

		verify(customerRepository, never()).save(any(Customers.class));
		verify(customerRepository, never()).saveAndFlush(any(Customers.class));
	}

	
	@Test
	@DisplayName("testRegisterCustomer_InvalidNRC_ThrowsException: NRC without 6 trailing digits throws exception")
	void testRegisterCustomer_InvalidNRC_ThrowsException() {
		CustomerDTO invalidNrcDto = CustomerDTO.builder().fullName("Daw Yoon").nrc("12/DAGANA(N)12345") // Only 5 digits
				.email("yoon.nrc@test.com").phone("09123456789").customerType("PERSONAL").build();

		assertThrows(IllegalArgumentException.class, () -> customerService.createCustomer(invalidNrcDto));

		verify(customerRepository, never()).save(any(Customers.class));
		verify(customerRepository, never()).saveAndFlush(any(Customers.class));
	}

	
	@Test
	@DisplayName("testRegisterPersonalCustomer_DuplicateEmail_ThrowsException: Second personal customer with same email throws exception")
	void testRegisterCustomer_DuplicateEmail_ThrowsException() {
		CustomerDTO duplicateEmailDto = CustomerDTO.builder().fullName("Daw Yoon").nrc("12/DAGANA(N)123456")
				.email("existing@test.com").phone("09123456789").customerType("PERSONAL").build();

		when(customerRepository.existsByPhoneAndCustomerType("09123456789", CustomerType.PERSONAL)).thenReturn(false);
		when(customerRepository.existsByEmailAndCustomerType("existing@test.com", CustomerType.PERSONAL)).thenReturn(true);

		IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
				() -> customerService.createCustomer(duplicateEmailDto));

		assertTrue(ex.getMessage().contains("A Personal customer with this email already exists"));
		verify(customerRepository, never()).save(any(Customers.class));
		verify(customerRepository, never()).saveAndFlush(any(Customers.class));
	}

	@Test
	@DisplayName("testRegisterCustomer_ExistsByEmailDuplicate_ThrowsException: When existsByEmail returns true, throws duplicate exception")
	void testRegisterCustomer_ExistsByEmailDuplicate_ThrowsException() {
		CustomerDTO duplicateEmailDto = CustomerDTO.builder().fullName("Daw Yoon").nrc("12/DAGANA(N)123456")
				.email("duplicate@gmail.com").phone("09123456789").customerType("PERSONAL").build();

		when(customerRepository.existsByPhoneAndCustomerType("09123456789", CustomerType.PERSONAL)).thenReturn(false);
		when(customerRepository.existsByEmail("duplicate@gmail.com")).thenReturn(true);

		IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
				() -> customerService.createCustomer(duplicateEmailDto));

		assertTrue(ex.getMessage().contains("already exists") || ex.getMessage().contains("already registered"));
		verify(emailVerificationService, times(1)).verifyEmailHost("duplicate@gmail.com");
		verify(customerRepository, never()).save(any(Customers.class));
	}

	@Test
	@DisplayName("testRegisterCustomer_EmailHostVerificationFails_ThrowsException: When verifyEmailHost fails, customer is not saved")
	void testRegisterCustomer_EmailHostVerificationFails_ThrowsException() {
		CustomerDTO invalidHostDto = CustomerDTO.builder().fullName("Daw Yoon").nrc("12/DAGANA(N)123456")
				.email("fakeuser@gmail.com").phone("09123456789").customerType("PERSONAL").build();

		when(customerRepository.existsByPhoneAndCustomerType("09123456789", CustomerType.PERSONAL)).thenReturn(false);
		org.mockito.Mockito.doThrow(new com.corebanking.exception.InvalidEmailException("The provided email address does not have a reachable mail server."))
				.when(emailVerificationService).verifyEmailHost("fakeuser@gmail.com");

		com.corebanking.exception.InvalidEmailException ex = assertThrows(
				com.corebanking.exception.InvalidEmailException.class,
				() -> customerService.createCustomer(invalidHostDto));

		assertEquals("The provided email address does not have a reachable mail server.", ex.getMessage());
		verify(customerRepository, never()).save(any(Customers.class));
		verify(customerRepository, never()).saveAndFlush(any(Customers.class));
	}

	@Test
	@DisplayName("testRegisterCompanyCustomer_DuplicateEmail_ThrowsException: Second company customer with same email throws exception")
	void testRegisterCompanyCustomer_DuplicateEmail_ThrowsException() {
		CustomerDTO companyDto = CustomerDTO.builder().companyName("Beta Tech Co., Ltd")
				.registrationNumber("REG-2026-1122").taxId("TAX-112233").businessType("FINTECH")
				.email("info@acetech.com").phone("09123456789").customerType("COMPANY")
				.address("Tower B, Yangon").build();

		when(customerRepository.existsByPhoneAndCustomerType("09123456789", CustomerType.COMPANY)).thenReturn(false);
		when(customerRepository.existsByEmailAndCustomerType("info@acetech.com", CustomerType.COMPANY)).thenReturn(true);

		IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
				() -> customerService.createCustomer(companyDto));

		assertTrue(ex.getMessage().contains("A Company customer with this email already exists"));
		verify(customerRepository, never()).save(any(Customers.class));
		verify(customerRepository, never()).saveAndFlush(any(Customers.class));
	}

	@Test
	@DisplayName("testRegisterSameEmail_AllowedForPersonalAndCompany: Same email allowed for 1 Personal and 1 Company")
	void testRegisterSameEmail_AllowedForPersonalAndCompany() {
		CustomerDTO personalDto = CustomerDTO.builder().fullName("Daw Yoon").nrc("12/DAGANA(N)123456")
				.email("shared@bank.com").phone("09111111111").customerType("PERSONAL")
				.address("Yangon").occupation("Engineer").build();

		when(customerRepository.existsByPhoneAndCustomerType("09111111111", CustomerType.PERSONAL)).thenReturn(false);
		when(customerRepository.existsByEmailAndCustomerType("shared@bank.com", CustomerType.PERSONAL)).thenReturn(false);
		when(personalInfoRepository.existsByNrc("12/DAGANA(N)123456")).thenReturn(false);
		when(customerRepository.existsByCustomerCode(anyString())).thenReturn(false);
		when(customerRepository.saveAndFlush(any(Customers.class))).thenAnswer(invocation -> invocation.getArgument(0));
		when(passwordEncoder.encode(anyString())).thenReturn("hashed_secure_password");
		when(customerCredentialsRepository.saveAndFlush(any(CustomerCredentials.class))).thenAnswer(invocation -> invocation.getArgument(0));

		CustomerResponseDTO personalResponse = customerService.createCustomer(personalDto);
		assertNotNull(personalResponse);
		assertEquals("PERSONAL", personalResponse.getCustomerType());

		CustomerDTO companyDto = CustomerDTO.builder().companyName("Ace Tech Co., Ltd")
				.registrationNumber("REG-2026-9988").taxId("TAX-998877").businessType("FINTECH")
				.email("shared@bank.com").phone("09222222222").customerType("COMPANY")
				.address("Yangon").build();

		when(customerRepository.existsByPhoneAndCustomerType("09222222222", CustomerType.COMPANY)).thenReturn(false);
		when(customerRepository.existsByEmailAndCustomerType("shared@bank.com", CustomerType.COMPANY)).thenReturn(false);
		when(companyInfoRepository.existsByRegistrationNumber("REG-2026-9988")).thenReturn(false);
		when(companyInfoRepository.existsByTaxId("TAX-998877")).thenReturn(false);

		CustomerResponseDTO companyResponse = customerService.createCustomer(companyDto);
		assertNotNull(companyResponse);
		assertEquals("COMPANY", companyResponse.getCustomerType());
	}

	@Test
	@DisplayName("testRegisterCustomer_DuplicatePhone_ThrowsException: When phone exists, throws duplicate exception")
	void testRegisterCustomer_DuplicatePhone_ThrowsException() {
		CustomerDTO duplicatePhoneDto = CustomerDTO.builder().fullName("Daw Yoon").nrc("12/DAGANA(N)123456")
				.email("yoon.unique@test.com").phone("09123456789").customerType("PERSONAL").build();

		when(customerRepository.existsByPhoneAndCustomerType("09123456789", CustomerType.PERSONAL)).thenReturn(true);

		IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
				() -> customerService.createCustomer(duplicatePhoneDto));

		assertTrue(ex.getMessage().contains("A Personal customer with this phone number already exists"));
		verify(customerRepository, never()).save(any(Customers.class));
		verify(customerRepository, never()).saveAndFlush(any(Customers.class));
	}

	@Test
	@DisplayName("testRegisterCustomer_DuplicateNRC_ThrowsException: When NRC exists, throws duplicate exception")
	void testRegisterCustomer_DuplicateNRC_ThrowsException() {
		CustomerDTO duplicateNrcDto = CustomerDTO.builder().fullName("Daw Yoon").nrc("12/DAGANA(N)123456")
				.email("yoon.unique@test.com").phone("09123456789").customerType("PERSONAL").build();

		when(customerRepository.existsByPhoneAndCustomerType("09123456789", CustomerType.PERSONAL)).thenReturn(false);
		when(customerRepository.existsByEmailAndCustomerType("yoon.unique@test.com", CustomerType.PERSONAL)).thenReturn(false);
		when(personalInfoRepository.existsByNrc("12/DAGANA(N)123456")).thenReturn(true);

		IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
				() -> customerService.createCustomer(duplicateNrcDto));

		assertTrue(ex.getMessage().contains("A Personal customer with this NRC already exists"));
		verify(customerRepository, never()).save(any(Customers.class));
		verify(customerRepository, never()).saveAndFlush(any(Customers.class));
	}

	@Test
	@DisplayName("testUpdateCustomerProfile_Success: Updates profile and records audit log with non-null acting staff")
	void testUpdateCustomerProfile_Success() {
		String customerCode = "CUST-20261102-1001";
		PersonalInfo personalInfo = new PersonalInfo();
		personalInfo.setPhone("09111111111");
		personalInfo.setOccupation("Junior Developer");
		personalInfo.setDateOfBirth(LocalDate.of(1995, 5, 20));

		Customers existingCustomer = Customers.builder()
				.customerId(UUID.randomUUID())
				.customerCode(customerCode)
				.customerType(CustomerType.PERSONAL)
				.fullName("Ko Min")
				.phone("09111111111")
				.personalInfo(personalInfo)
				.build();

		when(customerRepository.findByCustomerCode(customerCode)).thenReturn(Optional.of(existingCustomer));
		when(customerRepository.save(any(Customers.class))).thenAnswer(invocation -> invocation.getArgument(0));
		when(staffUsersRepository.findById(mockStaff.getStaffId())).thenReturn(Optional.of(mockStaff));

		CustomerUpdateDTO updateDto = CustomerUpdateDTO.builder()
				.phone("09222222222")
				.occupation("Senior Solution Architect")
				.dateOfBirth(LocalDate.of(1992, 8, 15))
				.build();

		customerService.setAuditLogsRepository(auditLogsRepository);
		customerService.updateCustomerProfile(customerCode, updateDto, mockStaff);

		assertEquals("09222222222", existingCustomer.getPhone());
		assertEquals("09222222222", existingCustomer.getPersonalInfo().getPhone());
		assertEquals("Senior Solution Architect", existingCustomer.getPersonalInfo().getOccupation());
		assertEquals(LocalDate.of(1992, 8, 15), existingCustomer.getPersonalInfo().getDateOfBirth());

		verify(customerRepository, times(1)).save(existingCustomer);
		verify(auditLogsRepository, times(1)).save(argThat(auditLog -> {
			assertNotNull(auditLog);
			assertEquals("CUSTOMER", auditLog.getActionCategory());
			assertEquals("CUSTOMER_PROFILE_UPDATE", auditLog.getActionType());
			assertEquals("CUSTOMERS", auditLog.getEntityType());
			assertEquals(customerCode, auditLog.getEntityId());
			assertNotNull(auditLog.getActorStaff(), "actorStaff must NEVER be null");
			assertEquals(mockStaff.getStaffId(), auditLog.getActorStaff().getStaffId());
			return true;
		}));
	}

	@Test
	@DisplayName("testUpdateCustomerProfile_FallbackToActiveStaff_WhenCurrentStaffIsNull: Ensures actingStaff is never null")
	void testUpdateCustomerProfile_FallbackToActiveStaff_WhenCurrentStaffIsNull() {
		String customerCode = "CUST-20261102-1002";
		PersonalInfo personalInfo = new PersonalInfo();
		personalInfo.setPhone("09111111111");

		Customers existingCustomer = Customers.builder()
				.customerId(UUID.randomUUID())
				.customerCode(customerCode)
				.customerType(CustomerType.PERSONAL)
				.fullName("Ma Hla")
				.phone("09111111111")
				.personalInfo(personalInfo)
				.build();

		when(customerRepository.findByCustomerCode(customerCode)).thenReturn(Optional.of(existingCustomer));
		when(customerRepository.save(any(Customers.class))).thenAnswer(invocation -> invocation.getArgument(0));
		lenient().when(staffUsersRepository.findFirstByStatus(StaffUserStatus.ACTIVE)).thenReturn(Optional.of(mockStaff));
		when(staffUsersRepository.findById(mockStaff.getStaffId())).thenReturn(Optional.of(mockStaff));

		CustomerUpdateDTO updateDto = CustomerUpdateDTO.builder()
				.phone("09888888888")
				.build();

		customerService.setAuditLogsRepository(auditLogsRepository);
		// Pass null as currentStaff to trigger fallback
		customerService.updateCustomerProfile(customerCode, updateDto, (StaffUsers) null);

		assertEquals("09888888888", existingCustomer.getPhone());
		verify(customerRepository, times(1)).save(existingCustomer);
		verify(auditLogsRepository, times(1)).save(argThat(auditLog -> {
			assertNotNull(auditLog.getActorStaff(), "actingStaff must never be null even when currentStaff is null");
			assertEquals(mockStaff.getStaffId(), auditLog.getActorStaff().getStaffId());
			return true;
		}));
	}

	@Test
	@DisplayName("testUpdateCustomerProfile_NoChanges_DoesNotSaveOrAudit: Skips save and audit if incoming values match existing")
	void testUpdateCustomerProfile_NoChanges_DoesNotSaveOrAudit() {
		String customerCode = "CUST-20261102-1003";
		PersonalInfo personalInfo = new PersonalInfo();
		personalInfo.setPhone("09111111111");
		personalInfo.setOccupation("Merchant");

		Customers existingCustomer = Customers.builder()
				.customerId(UUID.randomUUID())
				.customerCode(customerCode)
				.customerType(CustomerType.PERSONAL)
				.fullName("U Ba")
				.phone("09111111111")
				.personalInfo(personalInfo)
				.build();

		when(customerRepository.findByCustomerCode(customerCode)).thenReturn(Optional.of(existingCustomer));

		// Update payload with identical phone and occupation
		CustomerUpdateDTO updateDto = CustomerUpdateDTO.builder()
				.phone("09111111111")
				.occupation("Merchant")
				.build();

		customerService.setAuditLogsRepository(auditLogsRepository);
		customerService.updateCustomerProfile(customerCode, updateDto, mockStaff);

		verify(customerRepository, never()).save(any(Customers.class));
		verify(auditLogsRepository, never()).save(any(AuditLogs.class));
	}

	@Test
	@DisplayName("testUpdateCustomerProfile_CustomerNotFound_ThrowsException")
	void testUpdateCustomerProfile_CustomerNotFound_ThrowsException() {
		when(customerRepository.findByCustomerCode("NON_EXISTING")).thenReturn(Optional.empty());

		CustomerUpdateDTO updateDto = CustomerUpdateDTO.builder().phone("09123456789").build();

		assertThrows(RuntimeException.class,
				() -> customerService.updateCustomerProfile("NON_EXISTING", updateDto, mockStaff));

		verify(customerRepository, never()).save(any(Customers.class));
		verify(auditLogsRepository, never()).save(any(AuditLogs.class));
	}
}
