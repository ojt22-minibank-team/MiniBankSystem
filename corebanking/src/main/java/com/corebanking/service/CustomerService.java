package com.corebanking.service;

import com.corebanking.dto.CustomerDTO;
import com.corebanking.dto.CustomerDetailResponseDTO;
import com.corebanking.dto.CustomerResponseDTO;
import com.corebanking.dto.CustomerUpdateDTO;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.Customers;
import com.corebanking.entity.PersonalInfo;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.GenderType;
import com.corebanking.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public String createCustomer(CustomerDTO dto, Long staffId) {
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int randomDigits = ThreadLocalRandom.current().nextInt(1000, 9999);
        String customerCode = "CUST-" + dateStr + "-" + randomDigits;

        LocalDateTime now = LocalDateTime.now();

        CustomerType customerType = CustomerType.valueOf(dto.getCustomerType().toUpperCase());
        CustomerStatus initialStatus = (dto.getStatus() != null && !dto.getStatus().isBlank())
                ? CustomerStatus.valueOf(dto.getStatus().toUpperCase())
                : CustomerStatus.ACTIVE;

        // full_name, email, phone တွက်ချက်ခြင်း
        String fullName;
        String email = dto.getEmail();
        String phone = dto.getPhone();

        if (customerType == CustomerType.PERSONAL) {
            fullName = ((dto.getFirstName() != null ? dto.getFirstName() : "") + " " +
                        (dto.getLastName() != null ? dto.getLastName() : "")).trim();
        } else {
            fullName = dto.getCompanyName();
        }

        Customers customer = Customers.builder()
                .customerId(UUID.randomUUID())
                .customerCode(customerCode)
                .customerType(customerType)
                .fullName(fullName)
                .email(email)
                .phone(phone)
                .status(initialStatus)
                .createdAt(now)
                .updatedAt(now)
                .build();

        if (customerType == CustomerType.PERSONAL) {
            PersonalInfo personalInfo = new PersonalInfo();
            personalInfo.setCustomer(customer);
            personalInfo.setFirstName(dto.getFirstName());
            personalInfo.setLastName(dto.getLastName());

            if (dto.getGender() != null && !dto.getGender().isBlank()) {
                personalInfo.setGender(GenderType.valueOf(dto.getGender().toUpperCase()));
            }

            personalInfo.setDateOfBirth(dto.getDateOfBirth());
            personalInfo.setNrc(dto.getNrc());
            personalInfo.setPhone(dto.getPhone());
            personalInfo.setEmail(dto.getEmail());
            personalInfo.setAddress(dto.getAddress());
            personalInfo.setOccupation(dto.getOccupation());

            customer.setPersonalInfo(personalInfo);

        } else if (customerType == CustomerType.COMPANY) {
            CompanyInfo companyInfo = new CompanyInfo();
            companyInfo.setCustomer(customer);
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

        customerRepository.save(customer);
        return customerCode;
    }
    
    /**
     * Customer List တစ်ခုလုံးကို ဆွဲယူခြင်း
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
                        .build())
                .collect(Collectors.toList());
    }
    
    /**
     * Customer Profile Update ပြုလုပ်ခြင်း
     */
    @Transactional
    public void updateCustomer(String customerCode, CustomerUpdateDTO dto, Long staffId) {
        // ၁။ Customer ရှိမရှိ စစ်ဆေးခြင်း
        Customers customer = customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + customerCode));

        LocalDateTime now = LocalDateTime.now();

        // ၂။ Parent Customer fields များ ပြင်ဆင်ခြင်း
        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            customer.setEmail(dto.getEmail());
        }
        if (dto.getPhone() != null && !dto.getPhone().isBlank()) {
            customer.setPhone(dto.getPhone());
        }
        customer.setUpdatedAt(now);

        // ၃။ Type ပေါ်မူတည်၍ Child Entity အချက်အလက်များ ပြင်ဆင်ခြင်း
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

        // ၄။ Database ထဲသို့ Update အပြောင်းအလဲများ သိမ်းဆည်းခြင်း
        customerRepository.save(customer);
    }
    
    /**
     * Customer Code ဖြင့် Customer အသေးစိတ် ရှာဖွေခြင်း (Search Customer)
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

        // Personal Customer ဖြစ်ပါက PersonalInfo ထည့်သွင်းခြင်း
        if (customer.getCustomerType() == CustomerType.PERSONAL && customer.getPersonalInfo() != null) {
            PersonalInfo p = customer.getPersonalInfo();
            builder.firstName(p.getFirstName())
                   .lastName(p.getLastName())
                   .gender(p.getGender() != null ? p.getGender().name() : null)
                   .dateOfBirth(p.getDateOfBirth())
                   .nrc(p.getNrc())
                   .address(p.getAddress())
                   .occupation(p.getOccupation());

        // Company Customer ဖြစ်ပါက CompanyInfo ထည့်သွင်းခြင်း
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
}
