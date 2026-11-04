package com.corebanking.service;

import com.corebanking.dto.CusProfileResponseDTO;
import com.corebanking.dto.CusProfileUpdateDTO;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.Customers;
import com.corebanking.entity.PersonalInfo;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.GenderType;
import com.corebanking.repository.CompanyInfoRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.PersonalInfoRepository;
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
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CusProfileService Unit Tests")
class CusProfileServiceTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("22222222-2222-4222-8222-222222222222");
    private static final String CUSTOMER_CODE = "CUS-2026-0002";

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private PersonalInfoRepository personalInfoRepository;

    @Mock
    private CompanyInfoRepository companyInfoRepository;

    @Mock
    private CloudinaryService cloudinaryService;

    @InjectMocks
    private CusProfileService profileService;

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

    private Customers createRetailCustomer(UUID customerId) {
        return Customers.builder()
                .customerId(customerId)
                .customerCode(CUSTOMER_CODE)
                .customerType(CustomerType.INDIVIDUAL)
                .status(CustomerStatus.ACTIVE)
                .fullName("Thiri Win")
                .email("thiri@example.com")
                .phone("09123456789")
                .build();
    }

    private Customers createCorporateCustomer(UUID customerId) {
        return Customers.builder()
                .customerId(customerId)
                .customerCode(CUSTOMER_CODE)
                .customerType(CustomerType.COMPANY)
                .status(CustomerStatus.ACTIVE)
                .fullName("Tech Innovators Co., Ltd.")
                .email("contact@techinnovators.com")
                .phone("09987654321")
                .build();
    }

    private PersonalInfo createSamplePersonalInfo(Customers customer) {
        return PersonalInfo.builder()
                .customerId(customer.getCustomerId())
                .customer(customer)
                .firstName("Thiri")
                .lastName("Win")
                .dateOfBirth(LocalDate.of(1995, 5, 20))
                .gender(GenderType.FEMALE)
                .nrc("12/DAGAMA(N)123456")
                .passportNumber("MM1234567")
                .email("thiri@example.com")
                .phone("09123456789")
                .occupation("Software Engineer")
                .address("No. 12, Strand Road")
                .city("Yangon")
                .stateRegion("Yangon Region")
                .country("Myanmar")
                .profileImageUrl("https://res.cloudinary.com/demo/image/upload/v1/customer-personal.jpg")
                .build();
    }

    private CompanyInfo createSampleCompanyInfo(Customers customer) {
        return CompanyInfo.builder()
                .customerId(customer.getCustomerId())
                .customer(customer)
                .companyName("Tech Innovators Co., Ltd.")
                .registrationNumber("REG-987654")
                .taxId("TAX-123456")
                .businessType("Technology")
                .incorporationDate(LocalDate.of(2020, 1, 15))
                .companyPhone("09987654321")
                .companyEmail("contact@techinnovators.com")
                .address("Tower A, Level 10, Hledan Centre")
                .city("Yangon")
                .stateRegion("Yangon Region")
                .country("Myanmar")
                .profileImageUrl("https://res.cloudinary.com/demo/image/upload/v1/customer-company.jpg")
                .build();
    }

    // -------------------------------------------------------------------------
    // Authentication Validation Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("Authentication Context Tests")
    class AuthenticationContextTests {

        @Test
        @DisplayName("Throws RuntimeException when Authentication object is null")
        void getMyProfile_ThrowsException_WhenNoAuthenticationInContext() {
            SecurityContext securityContext = mock(SecurityContext.class);
            when(securityContext.getAuthentication()).thenReturn(null);
            SecurityContextHolder.setContext(securityContext);

            assertThatThrownBy(() -> profileService.getMyProfile())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer authentication is required.");

            verifyNoInteractions(customerRepository, personalInfoRepository, companyInfoRepository);
        }

        @Test
        @DisplayName("Throws RuntimeException when Authentication is not authenticated")
        void getMyProfile_ThrowsException_WhenNotAuthenticated() {
            mockSecurityContext(CUSTOMER_ID.toString(), false);

            assertThatThrownBy(() -> profileService.getMyProfile())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer authentication is required.");

            verifyNoInteractions(customerRepository, personalInfoRepository, companyInfoRepository);
        }

        @Test
        @DisplayName("Throws RuntimeException when user lacks ROLE_CUSTOMER authority")
        void getMyProfile_ThrowsException_WhenLacksRoleCustomer() {
            mockSecurityContext(CUSTOMER_ID.toString(), true, "ROLE_STAFF");

            assertThatThrownBy(() -> profileService.getMyProfile())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer access is required.");

            verifyNoInteractions(customerRepository, personalInfoRepository, companyInfoRepository);
        }

        @Test
        @DisplayName("Throws RuntimeException when customer identity is not a valid UUID")
        void getMyProfile_ThrowsException_WhenInvalidUuid() {
            mockSecurityContext("invalid-uuid-format", true, "ROLE_CUSTOMER");

            assertThatThrownBy(() -> profileService.getMyProfile())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Invalid customer authentication.");

            verifyNoInteractions(customerRepository, personalInfoRepository, companyInfoRepository);
        }
    }

    // -------------------------------------------------------------------------
    // Customer Retrieval & Mapping Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("getMyProfile() Tests")
    class GetMyProfileTests {

        @Test
        @DisplayName("Throws RuntimeException when Customer record is not found in database")
        void getMyProfile_ThrowsException_WhenCustomerNotFound() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> profileService.getMyProfile())
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer not found.");

            verify(customerRepository).findById(CUSTOMER_ID);
            verifyNoInteractions(personalInfoRepository, companyInfoRepository);
        }

        @Test
        @DisplayName("Successfully returns retail customer profile with personal information")
        void getMyProfile_Success_RetailCustomer() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createRetailCustomer(CUSTOMER_ID);
            PersonalInfo personalInfo = createSamplePersonalInfo(customer);

            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(personalInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(personalInfo));
            when(companyInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

            CusProfileResponseDTO response = profileService.getMyProfile();

            assertThat(response).isNotNull();
            assertThat(response.getCustomerCode()).isEqualTo(CUSTOMER_CODE);
            assertThat(response.getCustomerType()).isEqualTo("INDIVIDUAL");
            assertThat(response.getStatus()).isEqualTo("ACTIVE");
            assertThat(response.getFirstName()).isEqualTo("Thiri");
            assertThat(response.getLastName()).isEqualTo("Win");
            assertThat(response.getDateOfBirth()).isEqualTo(LocalDate.of(1995, 5, 20));
            assertThat(response.getGender()).isEqualTo("FEMALE");
            assertThat(response.getNrc()).isEqualTo("12/DAGAMA(N)123456");
            assertThat(response.getPassportNumber()).isEqualTo("MM1234567");
            assertThat(response.getEmail()).isEqualTo("thiri@example.com");
            assertThat(response.getPhone()).isEqualTo("09123456789");
            assertThat(response.getOccupation()).isEqualTo("Software Engineer");
            assertThat(response.getAddress()).isEqualTo("No. 12, Strand Road");
            assertThat(response.getCity()).isEqualTo("Yangon");
            assertThat(response.getStateRegion()).isEqualTo("Yangon Region");
            assertThat(response.getCountry()).isEqualTo("Myanmar");
            assertThat(response.getProfileImageUrl()).isEqualTo("https://res.cloudinary.com/demo/image/upload/v1/customer-personal.jpg");

            // Company fields should be null for retail customer
            assertThat(response.getCompanyName()).isNull();
            assertThat(response.getRegistrationNumber()).isNull();
        }

        @Test
        @DisplayName("Successfully returns corporate customer profile with company information")
        void getMyProfile_Success_CorporateCustomer() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createCorporateCustomer(CUSTOMER_ID);
            CompanyInfo companyInfo = createSampleCompanyInfo(customer);

            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(personalInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());
            when(companyInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(companyInfo));

            CusProfileResponseDTO response = profileService.getMyProfile();

            assertThat(response).isNotNull();
            assertThat(response.getCustomerCode()).isEqualTo(CUSTOMER_CODE);
            assertThat(response.getCustomerType()).isEqualTo("COMPANY");
            assertThat(response.getStatus()).isEqualTo("ACTIVE");
            assertThat(response.getCompanyName()).isEqualTo("Tech Innovators Co., Ltd.");
            assertThat(response.getRegistrationNumber()).isEqualTo("REG-987654");
            assertThat(response.getTaxId()).isEqualTo("TAX-123456");
            assertThat(response.getBusinessType()).isEqualTo("Technology");
            assertThat(response.getIncorporationDate()).isEqualTo(LocalDate.of(2020, 1, 15));
            assertThat(response.getCompanyPhone()).isEqualTo("09987654321");
            assertThat(response.getCompanyEmail()).isEqualTo("contact@techinnovators.com");
            assertThat(response.getAddress()).isEqualTo("Tower A, Level 10, Hledan Centre");
            assertThat(response.getCity()).isEqualTo("Yangon");
            assertThat(response.getStateRegion()).isEqualTo("Yangon Region");
            assertThat(response.getCountry()).isEqualTo("Myanmar");
            assertThat(response.getProfileImageUrl()).isEqualTo("https://res.cloudinary.com/demo/image/upload/v1/customer-company.jpg");

            // Personal fields should be null for corporate customer
            assertThat(response.getFirstName()).isNull();
            assertThat(response.getLastName()).isNull();
        }

        @Test
        @DisplayName("Successfully returns basic profile when both personalInfo and companyInfo are absent")
        void getMyProfile_Success_WhenNoExtendedInfoExists() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createRetailCustomer(CUSTOMER_ID);

            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(personalInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());
            when(companyInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

            CusProfileResponseDTO response = profileService.getMyProfile();

            assertThat(response).isNotNull();
            assertThat(response.getCustomerCode()).isEqualTo(CUSTOMER_CODE);
            assertThat(response.getCustomerType()).isEqualTo("INDIVIDUAL");
            assertThat(response.getStatus()).isEqualTo("ACTIVE");
            assertThat(response.getFirstName()).isNull();
            assertThat(response.getCompanyName()).isNull();
        }
    }

    // -------------------------------------------------------------------------
    // updateMyProfile() Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("updateMyProfile() Tests")
    class UpdateMyProfileTests {

        @Test
        @DisplayName("Updates address fields for personal info and saves repository")
        void updateMyProfile_Success_ForPersonalInfo() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createRetailCustomer(CUSTOMER_ID);
            PersonalInfo personalInfo = createSamplePersonalInfo(customer);

            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(personalInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(personalInfo));
            when(companyInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

            CusProfileUpdateDTO updateDTO = new CusProfileUpdateDTO();
            updateDTO.setAddress("No. 99, Pyay Road");
            updateDTO.setCity("Mandalay");
            updateDTO.setStateRegion("Mandalay Region");
            updateDTO.setCountry("Myanmar");

            CusProfileResponseDTO updated = profileService.updateMyProfile(updateDTO);

            assertThat(personalInfo.getAddress()).isEqualTo("No. 99, Pyay Road");
            assertThat(personalInfo.getCity()).isEqualTo("Mandalay");
            assertThat(personalInfo.getStateRegion()).isEqualTo("Mandalay Region");
            assertThat(personalInfo.getCountry()).isEqualTo("Myanmar");

            verify(personalInfoRepository).save(personalInfo);
            verify(companyInfoRepository, never()).save(any());
            assertThat(updated).isNotNull();
            assertThat(updated.getAddress()).isEqualTo("No. 99, Pyay Road");
            assertThat(updated.getCity()).isEqualTo("Mandalay");
        }

        @Test
        @DisplayName("Updates only non-null address fields in personal info (partial update)")
        void updateMyProfile_PartialUpdate_KeepsExistingFields() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createRetailCustomer(CUSTOMER_ID);
            PersonalInfo personalInfo = createSamplePersonalInfo(customer);

            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(personalInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(personalInfo));
            when(companyInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

            CusProfileUpdateDTO updateDTO = new CusProfileUpdateDTO();
            updateDTO.setCity("Naypyidaw");
            // address, stateRegion, country are null

            profileService.updateMyProfile(updateDTO);

            assertThat(personalInfo.getAddress()).isEqualTo("No. 12, Strand Road"); // Unchanged
            assertThat(personalInfo.getCity()).isEqualTo("Naypyidaw"); // Updated
            assertThat(personalInfo.getStateRegion()).isEqualTo("Yangon Region"); // Unchanged
            assertThat(personalInfo.getCountry()).isEqualTo("Myanmar"); // Unchanged

            verify(personalInfoRepository).save(personalInfo);
        }

        @Test
        @DisplayName("Updates address fields for company info and saves repository")
        void updateMyProfile_Success_ForCompanyInfo() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createCorporateCustomer(CUSTOMER_ID);
            CompanyInfo companyInfo = createSampleCompanyInfo(customer);

            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(personalInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());
            when(companyInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(companyInfo));

            CusProfileUpdateDTO updateDTO = new CusProfileUpdateDTO();
            updateDTO.setAddress("Industrial Zone 1");
            updateDTO.setCity("Bago");
            updateDTO.setStateRegion("Bago Region");
            updateDTO.setCountry("Myanmar");

            CusProfileResponseDTO updated = profileService.updateMyProfile(updateDTO);

            assertThat(companyInfo.getAddress()).isEqualTo("Industrial Zone 1");
            assertThat(companyInfo.getCity()).isEqualTo("Bago");
            assertThat(companyInfo.getStateRegion()).isEqualTo("Bago Region");
            assertThat(companyInfo.getCountry()).isEqualTo("Myanmar");

            verify(companyInfoRepository).save(companyInfo);
            verify(personalInfoRepository, never()).save(any());
            assertThat(updated).isNotNull();
            assertThat(updated.getAddress()).isEqualTo("Industrial Zone 1");
            assertThat(updated.getCity()).isEqualTo("Bago");
        }

        @Test
        @DisplayName("Throws RuntimeException when customer does not exist during profile update")
        void updateMyProfile_ThrowsException_WhenCustomerNotFound() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

            CusProfileUpdateDTO updateDTO = new CusProfileUpdateDTO();
            updateDTO.setCity("Yangon");

            assertThatThrownBy(() -> profileService.updateMyProfile(updateDTO))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Customer not found.");

            verify(customerRepository).findById(CUSTOMER_ID);
            verifyNoInteractions(personalInfoRepository, companyInfoRepository);
        }
    }

    // -------------------------------------------------------------------------
    // updateProfileImage() Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("updateProfileImage() Tests")
    class UpdateProfileImageTests {

        @Test
        @DisplayName("Uploads profile image and updates PersonalInfo image URL")
        void updateProfileImage_Success_ForPersonalInfo() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createRetailCustomer(CUSTOMER_ID);
            PersonalInfo personalInfo = createSamplePersonalInfo(customer);

            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(personalInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(personalInfo));
            when(companyInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

            MultipartFile mockFile = mock(MultipartFile.class);
            String uploadedUrl = "https://res.cloudinary.com/demo/image/upload/v2/new-avatar.jpg";
            when(cloudinaryService.uploadProfileImage(mockFile, CUSTOMER_ID.toString())).thenReturn(uploadedUrl);

            CusProfileResponseDTO response = profileService.updateProfileImage(mockFile);

            verify(cloudinaryService).uploadProfileImage(mockFile, CUSTOMER_ID.toString());
            assertThat(personalInfo.getProfileImageUrl()).isEqualTo(uploadedUrl);
            verify(personalInfoRepository).save(personalInfo);
            verify(companyInfoRepository, never()).save(any());
            assertThat(response).isNotNull();
        }

        @Test
        @DisplayName("Uploads profile image and updates CompanyInfo image URL")
        void updateProfileImage_Success_ForCompanyInfo() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createCorporateCustomer(CUSTOMER_ID);
            CompanyInfo companyInfo = createSampleCompanyInfo(customer);

            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(personalInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());
            when(companyInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(companyInfo));

            MultipartFile mockFile = mock(MultipartFile.class);
            String uploadedUrl = "https://res.cloudinary.com/demo/image/upload/v2/new-company-logo.jpg";
            when(cloudinaryService.uploadProfileImage(mockFile, CUSTOMER_ID.toString())).thenReturn(uploadedUrl);

            CusProfileResponseDTO response = profileService.updateProfileImage(mockFile);

            verify(cloudinaryService).uploadProfileImage(mockFile, CUSTOMER_ID.toString());
            assertThat(companyInfo.getProfileImageUrl()).isEqualTo(uploadedUrl);
            verify(companyInfoRepository).save(companyInfo);
            verify(personalInfoRepository, never()).save(any());
            assertThat(response).isNotNull();
        }

        @Test
        @DisplayName("Propagates RuntimeException when Cloudinary upload fails")
        void updateProfileImage_PropagatesException_WhenUploadFails() {
            mockAuthenticatedCustomer(CUSTOMER_ID);
            Customers customer = createRetailCustomer(CUSTOMER_ID);
            PersonalInfo personalInfo = createSamplePersonalInfo(customer);

            when(customerRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(customer));
            when(personalInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.of(personalInfo));
            when(companyInfoRepository.findById(CUSTOMER_ID)).thenReturn(Optional.empty());

            MultipartFile mockFile = mock(MultipartFile.class);
            when(cloudinaryService.uploadProfileImage(mockFile, CUSTOMER_ID.toString()))
                    .thenThrow(new RuntimeException("Cloudinary service error"));

            assertThatThrownBy(() -> profileService.updateProfileImage(mockFile))
                    .isInstanceOf(RuntimeException.class)
                    .hasMessage("Cloudinary service error");

            verify(personalInfoRepository, never()).save(any());
            verify(companyInfoRepository, never()).save(any());
        }
    }
}
