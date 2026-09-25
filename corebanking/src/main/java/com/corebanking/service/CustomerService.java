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
import com.corebanking.repository.CustomerCredentialsRepository;
import com.corebanking.repository.CustomerRepository;
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
    private final CustomerCredentialsRepository customerCredentialsRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * ၁။ Customer Profile (Personal/Company Info) နှင့် CustomerCredentials ကို တစ်ပြိုင်နက် ဖန်တီးသိမ်းဆည်းခြင်း
     */
    @Transactional
    public CustomerResponseDTO createCustomer(CustomerDTO dto) {
        // Authenticated Staff Record ကို ရယူခြင်း
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentStaffUsername = (auth != null) ? auth.getName() : "admin";

        StaffUsers staff = staffUsersRepository.findByUsername(currentStaffUsername)
                .orElseThrow(() -> new RuntimeException("Authenticated staff record not found"));

        LocalDateTime now = LocalDateTime.now();

        // String မှ CustomerType Enum သို့ ပြောင်းလဲခြင်း
        CustomerType customerType = CustomerType.PERSONAL;
        if (dto.getCustomerType() != null && !dto.getCustomerType().isBlank()) {
            try {
                customerType = CustomerType.valueOf(dto.getCustomerType().trim().toUpperCase());
            } catch (IllegalArgumentException e) {
                throw new IllegalArgumentException("Invalid customer type: " + dto.getCustomerType());
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

        // Unique Customer Code ထုတ်ယူခြင်း
        String customerCode = generateUniqueCustomerCode();

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
                .isNew(true) // Spring Data JPA အား SQL INSERT တိုက်ရိုက်လုပ်ရန် ညွှန်ကြားခြင်း
                .build();

        customerCredentialsRepository.saveAndFlush(credentials);

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
     * ၂။ Customer စာရင်းအားလုံးကို ရယူပြသသော Method (Controller အတွက် ဖြည့်စွက်ချက်)
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
                        .temporaryPassword(null) // လုံခြုံရေးအရ စာရင်းပြသချိန်တွင် Password မထည့်ပါ
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
     */
    private String generateUniqueCustomerCode() {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String code;
        do {
            int randomDigits = ThreadLocalRandom.current().nextInt(1000, 9999);
            code = "CUST-" + datePart + "-" + randomDigits;
        } while (customerRepository.existsByCustomerCode(code));
        return code;
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

        // စည်းမျဉ်း ကိုက်ညီစေရန် တစ်မျိုးလျှင် အနည်းဆုံး ၁ လုံးစီ ထည့်သွင်းခြင်း
        password.append(upper.charAt(random.nextInt(upper.length())));
        password.append(lower.charAt(random.nextInt(lower.length())));
        password.append(digits.charAt(random.nextInt(digits.length())));
        password.append(special.charAt(random.nextInt(special.length())));

        // ကျန်ရှိသော ၄ လုံးကို ဖြည့်စွက်ခြင်း (စုစုပေါင်း ၈ လုံး)
        for (int i = 4; i < 8; i++) {
            password.append(allChars.charAt(random.nextInt(allChars.length())));
        }

        // စာလုံးများကို နေရာစုံအောင် မွှေနှောက် (Shuffle) ခြင်း
        char[] array = password.toString().toCharArray();
        for (int i = array.length - 1; i > 0; i--) {
            int j = random.nextInt(i + 1);
            char temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }

        return new String(array);
    }
}