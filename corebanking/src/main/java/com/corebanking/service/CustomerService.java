package com.corebanking.service;

import com.corebanking.dto.CustomerDTO;
import com.corebanking.dto.CustomerDetailResponseDTO;
import com.corebanking.dto.CustomerResponseDTO;
import com.corebanking.dto.CustomerUpdateDTO;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.PersonalInfo;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.GenderType;
import com.corebanking.entity.enums.MfaMethod;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.repository.CompanyInfoRepository;
import com.corebanking.repository.CustomerCredentialsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.PersonalInfoRepository;
import com.corebanking.repository.StaffUsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final PersonalInfoRepository personalInfoRepository;
    private final CompanyInfoRepository companyInfoRepository;
    private final CustomerCredentialsRepository customerCredentialsRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final PasswordEncoder passwordEncoder;
    private final CusEmailService cusEmailService; // Email Service ကို ထည့်သွင်းခြင်း

    /**
     * ၁။ Customer Profile (Personal/Company Info) နှင့် CustomerCredentials ကို တစ်ပြိုင်နက် ဖန်တီးသိမ်းဆည်းပြီး Email ပေးပို့ခြင်း
     */
    @Transactional
    public CustomerResponseDTO createCustomer(CustomerDTO dto) {
        // Authenticated Staff Record ကို ရယူခြင်း
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentStaffUsername = (auth != null && auth.getName() != null && !auth.getName().equalsIgnoreCase("anonymousUser"))
                ? auth.getName() : null;

        StaffUsers staff = null;
        if (currentStaffUsername != null) {
            staff = staffUsersRepository.findByUsername(currentStaffUsername).orElse(null);
        }
        if (staff == null) {
            staff = staffUsersRepository.findByUsername("admin.nay")
                    .or(() -> staffUsersRepository.findByUsername("teller.zin"))
                    .or(() -> staffUsersRepository.findByUsername("admin"))
                    .or(() -> staffUsersRepository.findAll().stream().findFirst())
                    .orElseThrow(() -> new RuntimeException("Authenticated staff record not found"));
        }

        LocalDateTime now = LocalDateTime.now();

        // String မှ CustomerType Enum သို့ ပြောင်းလဲခြင်း
        CustomerType customerType = CustomerType.PERSONAL;
        if (dto.getCustomerType() != null && !dto.getCustomerType().isBlank()) {
            String rawType = dto.getCustomerType().trim().toUpperCase();
            if ("INDIVIDUAL".equals(rawType)) {
                customerType = CustomerType.PERSONAL;
            } else if ("CORPORATE".equals(rawType)) {
                customerType = CustomerType.COMPANY;
            } else {
                try {
                    customerType = CustomerType.valueOf(rawType);
                } catch (IllegalArgumentException e) {
                    throw new IllegalArgumentException("Invalid customer type: " + dto.getCustomerType());
                }
            }
        }

        // Phone Number format & uniqueness check
        if (dto.getPhone() != null && !dto.getPhone().isBlank()) {
            String phone = dto.getPhone().trim();
            if (phone.length() != 11) {
                throw new IllegalArgumentException("Phone number must be exactly 11 digits long: " + phone);
            }
            if (customerRepository.existsByPhone(phone)) {
                throw new IllegalArgumentException("Phone number is already registered in the system: " + phone);
            }
        }

        // Email Uniqueness: at most 1 PERSONAL customer, at most 1 COMPANY customer
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            String email = dto.getEmail().trim();
            boolean isPersonal = (customerType == CustomerType.PERSONAL || customerType == CustomerType.INDIVIDUAL);
            if (isPersonal) {
                boolean personalExists = customerRepository.existsByEmailAndCustomerType(email, CustomerType.PERSONAL)
                        || customerRepository.existsByEmailAndCustomerType(email, CustomerType.INDIVIDUAL);
                if (personalExists) {
                    throw new IllegalArgumentException("Email is already associated with an existing Personal customer: " + email);
                }
            } else {
                boolean companyExists = customerRepository.existsByEmailAndCustomerType(email, CustomerType.COMPANY);
                if (companyExists) {
                    throw new IllegalArgumentException("Email is already associated with an existing Company customer: " + email);
                }
            }
        }

        // Duplicate Checks by Customer Type (NRC, Registration Number, Tax ID)
        if (customerType == CustomerType.PERSONAL || customerType == CustomerType.INDIVIDUAL) {
            if (dto.getNrc() != null && !dto.getNrc().isBlank()) {
                String nrc = dto.getNrc().trim();
                if (!nrc.matches(".*\\d{6}$")) {
                    throw new IllegalArgumentException("NRC format must end with exactly 6 trailing digits: " + nrc);
                }
                if (personalInfoRepository.existsByNrc(nrc)) {
                    throw new IllegalArgumentException("NRC number is already registered: " + nrc);
                }
            }
        } else {
            if (dto.getRegistrationNumber() != null && !dto.getRegistrationNumber().isBlank()) {
                if (companyInfoRepository.existsByRegistrationNumber(dto.getRegistrationNumber().trim())) {
                    throw new IllegalArgumentException("Company registration number is already registered: " + dto.getRegistrationNumber().trim());
                }
            }
            if (dto.getTaxId() != null && !dto.getTaxId().isBlank()) {
                if (companyInfoRepository.existsByTaxId(dto.getTaxId().trim())) {
                    throw new IllegalArgumentException("Tax ID is already registered: " + dto.getTaxId().trim());
                }
            }
        }

        // Full Name သတ်မှတ်ခြင်း
        String resolvedFullName;
        if (customerType == CustomerType.COMPANY) {
            if (dto.getCompanyName() == null || dto.getCompanyName().isBlank()) {
                throw new IllegalArgumentException("Company name is required for company customer");
            }
            resolvedFullName = dto.getCompanyName().trim();
        } else {
            String firstName = (dto.getFirstName() != null) ? dto.getFirstName().trim() : "";
            String lastName = (dto.getLastName() != null) ? dto.getLastName().trim() : "";
            resolvedFullName = (firstName + " " + lastName).trim();
            if (resolvedFullName.isEmpty()) {
                throw new IllegalArgumentException("Customer name cannot be empty");
            }
        }

        // Unique Customer Code ထုတ်ယူခြင်း (Personal: CUST-YYYYMMDD-XXXX, Company: COMP-YYYYMMDD-XXXX)
        String customerCode = generateUniqueCustomerCode(customerType);

        // Customers Entity အသစ် တည်ဆောက်ခြင်း
        UUID generatedCustomerId = UUID.randomUUID();

        Customers customer = Customers.builder()
                .customerId(generatedCustomerId)
                .customerCode(customerCode)
                .customerType(customerType)
                .fullName(resolvedFullName)
                .email(dto.getEmail())
                .phone(dto.getPhone())
                .address(dto.getAddress())
                .status(CustomerStatus.ACTIVE)
                .createdAt(now)
                .updatedAt(now)
                .isNew(true)
                .build();

        // PersonalInfo သို့မဟုတ် CompanyInfo ထည့်သွင်းခြင်း
        if (customerType == CustomerType.PERSONAL) {
            PersonalInfo personalInfo = new PersonalInfo();
            personalInfo.setFirstName(dto.getFirstName());
            personalInfo.setLastName(dto.getLastName());
            if (dto.getGender() != null && !dto.getGender().isBlank()) {
                personalInfo.setGender(GenderType.valueOf(dto.getGender().trim().toUpperCase()));
            }
            personalInfo.setDateOfBirth(dto.getDateOfBirth());
            personalInfo.setNrc(dto.getNrc());
            personalInfo.setPhone(dto.getPhone());
            personalInfo.setEmail(dto.getEmail());
            personalInfo.setAddress(dto.getAddress());
            personalInfo.setOccupation(dto.getOccupation());

            customer.setPersonalInfo(personalInfo);
        } else {
            CompanyInfo companyInfo = new CompanyInfo();
            companyInfo.setCompanyName(dto.getCompanyName());
            companyInfo.setRegistrationNumber(dto.getRegistrationNumber());
            companyInfo.setTaxId(dto.getTaxId());
            companyInfo.setBusinessType(dto.getBusinessType());
            companyInfo.setCompanyPhone(dto.getPhone());
            companyInfo.setCompanyEmail(dto.getEmail());
            companyInfo.setAddress(dto.getAddress());
            companyInfo.setCountry("Myanmar");

            customer.setCompanyInfo(companyInfo);
        }

        // Customers Entity အား Database သို့ အရင် Save ပြုလုပ်ခြင်း
        Customers savedCustomer = customerRepository.saveAndFlush(customer);

        // Temporary Password Auto-Generate ပြုလုပ်၍ BCrypt Hash ပြုလုပ်ခြင်း
        String autoGeneratedPassword = generateSecureTemporaryPassword();
        String encodedPassword = passwordEncoder.encode(autoGeneratedPassword);

        // CustomerCredentials Entity တည်ဆောက်ပြီး Save လုပ်ခြင်း
        CustomerCredentials credentials = CustomerCredentials.builder()
                .customerId(savedCustomer.getCustomerId())
                .customer(savedCustomer)
                .passwordHash(encodedPassword)
                .transactionPinHash(null)
                .mfaEnabled(true)
                .mfaMethod(MfaMethod.EMAIL)
                .mustChangePassword(true)
                .failedLoginCount(0)
                .failedPinAttemptCount(0)
                .tokenVersion(1L)
                .updatedByType(UpdatedByType.STAFF)
                .updatedById(staff.getStaffId())
                .isNew(true)
                .build();

        customerCredentialsRepository.saveAndFlush(credentials);

        // Customer Code နှင့် Temporary Password ကို Customer ၏ Email သို့ တိုက်ရိုက် ပေးပို့ခြင်း
        if (savedCustomer.getEmail() != null && !savedCustomer.getEmail().isBlank()) {
            cusEmailService.sendCustomerRegistrationCredentials(
                    savedCustomer.getEmail(),
                    savedCustomer.getFullName(),
                    savedCustomer.getCustomerCode(),
                    autoGeneratedPassword
            );
        }

        // Response DTO ပြန်လည်ပေးပို့ခြင်း (Temporary Password ပါဝင်သည်)
        return CustomerResponseDTO.builder()
                .customerCode(savedCustomer.getCustomerCode())
                .customerType(savedCustomer.getCustomerType().name())
                .fullName(savedCustomer.getFullName())
                .email(savedCustomer.getEmail())
                .phone(savedCustomer.getPhone())
                .status(savedCustomer.getStatus().name())
                .createdAt(savedCustomer.getCreatedAt())
                .temporaryPassword(autoGeneratedPassword)
                .build();
    }

    /**
     * ၂။ Customer စာရင်းအားလုံးကို ရယူပြသသော Method
     */
    @Transactional(readOnly = true)
    public List<CustomerResponseDTO> getAllCustomers() {
        return customerRepository.findAll().stream()
                .map(cust -> CustomerResponseDTO.builder()
                        .customerCode(cust.getCustomerCode())
                        .customerType(cust.getCustomerType().name())
                        .fullName(cust.getFullName())
                        .email(cust.getEmail())
                        .phone(cust.getPhone())
                        .status(cust.getStatus().name())
                        .createdAt(cust.getCreatedAt())
                        .temporaryPassword(null)
                        .build())
                .collect(Collectors.toList());
    }

    /**
     * ၃။ Customer အချက်အလက် ပြင်ဆင်မွမ်းမံသော Method
     */
    @Transactional
    public void updateCustomer(String customerCode, CustomerUpdateDTO dto, Long staffId) {
        Customers customer = customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + customerCode));

        LocalDateTime now = LocalDateTime.now();

        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            customer.setEmail(dto.getEmail());
        }
        if (dto.getPhone() != null && !dto.getPhone().isBlank()) {
            customer.setPhone(dto.getPhone());
        }
        customer.setUpdatedAt(now);

        if (customer.getCustomerType() == CustomerType.PERSONAL && customer.getPersonalInfo() != null) {
            PersonalInfo personalInfo = customer.getPersonalInfo();
            if (dto.getPhone() != null) personalInfo.setPhone(dto.getPhone());
            if (dto.getEmail() != null) personalInfo.setEmail(dto.getEmail());
            if (dto.getAddress() != null) personalInfo.setAddress(dto.getAddress());
            if (dto.getOccupation() != null) personalInfo.setOccupation(dto.getOccupation());

        } else if (customer.getCustomerType() == CustomerType.COMPANY && customer.getCompanyInfo() != null) {
            CompanyInfo companyInfo = customer.getCompanyInfo();
            if (dto.getPhone() != null) companyInfo.setCompanyPhone(dto.getPhone());
            if (dto.getEmail() != null) companyInfo.setCompanyEmail(dto.getEmail());
            if (dto.getAddress() != null) companyInfo.setAddress(dto.getAddress());
            if (dto.getBusinessType() != null) companyInfo.setBusinessType(dto.getBusinessType());
        }

        customerRepository.save(customer);
    }

    /**
     * ၄။ Customer Code ဖြင့် တစ်ဦးချင်း အသေးစိတ် အချက်အလက် ရယူသော Method
     */
    @Transactional(readOnly = true)
    public CustomerDetailResponseDTO getCustomerByCode(String customerCode) {
        Customers customer = customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + customerCode));

        CustomerDetailResponseDTO.CustomerDetailResponseDTOBuilder builder = CustomerDetailResponseDTO.builder()
                .customerCode(customer.getCustomerCode())
                .customerType(customer.getCustomerType().name())
                .fullName(customer.getFullName())
                .email(customer.getEmail())
                .phone(customer.getPhone())
                .status(customer.getStatus().name())
                .createdAt(customer.getCreatedAt())
                .updatedAt(customer.getUpdatedAt());

        if (customer.getCustomerType() == CustomerType.PERSONAL && customer.getPersonalInfo() != null) {
            PersonalInfo p = customer.getPersonalInfo();
            builder.firstName(p.getFirstName())
                   .lastName(p.getLastName())
                   .gender(p.getGender() != null ? p.getGender().name() : null)
                   .dateOfBirth(p.getDateOfBirth())
                   .nrc(p.getNrc())
                   .address(p.getAddress())
                   .occupation(p.getOccupation());

        } else if (customer.getCustomerType() == CustomerType.COMPANY && customer.getCompanyInfo() != null) {
            CompanyInfo c = customer.getCompanyInfo();
            builder.companyName(c.getCompanyName())
                   .registrationNumber(c.getRegistrationNumber())
                   .taxId(c.getTaxId())
                   .businessType(c.getBusinessType())
                   .address(c.getAddress())
                   .country(c.getCountry());
        }

        return builder.build();
    }

    /**
     * Unique Customer Code အလိုအလျောက် ထုတ်ပေးသော Method
     * Personal Customer Code format: CUST-YYYYMMDD-XXXX
     * Company Customer Code format: COMP-YYYYMMDD-XXXX
     */
    private String generateUniqueCustomerCode(CustomerType customerType) {
        String prefix = (customerType == CustomerType.COMPANY) ? "COMP-" : "CUST-";
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        SecureRandom secureRandom = new SecureRandom();
        String code;
        do {
            int randomDigits = 1000 + secureRandom.nextInt(9000);
            code = prefix + datePart + "-" + randomDigits;
        } while (customerRepository.existsByCustomerCode(code));
        return code;
    }

    private String generateUniqueCustomerCode() {
        return generateUniqueCustomerCode(CustomerType.PERSONAL);
    }

    /**
     * လုံခြုံရေးစည်းမျဉ်းနှင့် ကိုက်ညီသော ယာယီ Password အား Auto-Generate ထုတ်ပေးသော Helper
     */
    private String generateSecureTemporaryPassword() {
        String upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        String lower = "abcdefghijklmnopqrstuvwxyz";
        String digits = "0123456789";
        String special = "@#$%!&*";
        String allChars = upper + lower + digits + special;

        SecureRandom random = new SecureRandom();
        StringBuilder password = new StringBuilder();

        password.append(upper.charAt(random.nextInt(upper.length())));
        password.append(lower.charAt(random.nextInt(lower.length())));
        password.append(digits.charAt(random.nextInt(digits.length())));
        password.append(special.charAt(random.nextInt(special.length())));

        for (int i = 4; i < 8; i++) {
            password.append(allChars.charAt(random.nextInt(allChars.length())));
        }

        char[] array = password.toString().toCharArray();
        for (int i = array.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }

        return new String(array);
    }
    /**
     * Customer KYC Status ကို Database ထဲတွင် Update လုပ်ခြင်း
     */
    @Transactional
    public void updateCustomerKycStatus(String customerCode, String statusStr) {
        Customers customer = customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + customerCode));

        try {
            CustomerStatus newStatus = CustomerStatus.valueOf(statusStr.toUpperCase());
            customer.setStatus(newStatus);
            customer.setUpdatedAt(LocalDateTime.now());
            customerRepository.save(customer);
        } catch (IllegalArgumentException e) {
            // အကယ်၍ Enum ထဲတွင် ACTIVE သာရှိပါက fallback အဖြစ် ACTIVE ထားပေးခြင်း
            customer.setStatus(CustomerStatus.ACTIVE);
            customer.setUpdatedAt(LocalDateTime.now());
            customerRepository.save(customer);
        }
    }
}