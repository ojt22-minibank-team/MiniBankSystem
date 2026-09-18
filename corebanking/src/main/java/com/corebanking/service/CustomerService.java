package com.corebanking.service;

import com.corebanking.dto.CustomerDTO;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.Customers;
import com.corebanking.entity.PersonalInfo;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class CustomerService {

    private final CustomerRepository customerRepository;

    @Transactional
    public String createCustomer(CustomerDTO dto, Long staffId) {
        // ၁။ CIF / Customer Code generation: CUST-YYYYMMDD-XXXX
        String dateStr = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        int randomDigits = ThreadLocalRandom.current().nextInt(1000, 9999);
        String customerCode = "CUST-" + dateStr + "-" + randomDigits;
      
        // ၂။ Parent Customer Entity တည်ဆောက်ခြင်း
        LocalDateTime now = LocalDateTime.now();

        // ၂။ Parent Customer Entity တည်ဆောက်ခြင်း
        Customers customer = Customers.builder()
                .customerCode(customerCode)
                .customerType(CustomerType.fromString(dto.getCustomerType()))
                .status(CustomerStatus.valueOf(dto.getStatus().toUpperCase()))               
                .createdBy(staffId)
                .createdAt(now)
                .updatedAt(now) // Column 'updated_at' cannot be null error ကို ကာကွယ်ခြင်း
                .build();
        // ၃။ Type ပေါ်မူတည်၍ သက်ဆိုင်ရာ Child Info Entity ချိတ်ဆက်ခြင်း
        if ("PERSONAL".equalsIgnoreCase(dto.getCustomerType())) {
            PersonalInfo personalInfo = new PersonalInfo();
            
            // Customer Entity Object ကို ForeignKey/SharedKey အဖြစ် ချိတ်ဆက်ခြင်း
            personalInfo.setCustomer(customer);
            
            // Standard camelCase setters များကို အသုံးပြုခြင်း
            personalInfo.setFirst_name(dto.getFirstName());
            personalInfo.setLast_name(dto.getLastName());
            personalInfo.setGender(dto.getGender());
            personalInfo.setDate_of_birth(dto.getDateOfBirth());
            personalInfo.setNrc(dto.getNrc());
            personalInfo.setPhone(dto.getPhone());
            personalInfo.setEmail(dto.getEmail());
            personalInfo.setAddress(dto.getAddress());
            personalInfo.setOccupation(dto.getOccupation());

            // Parent ထဲသို့ Child ထည့်သွင်းခြင်း
            customer.setPersonalInfo(personalInfo);

        } else if ("COMPANY".equalsIgnoreCase(dto.getCustomerType())) {
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

            // Parent ထဲသို့ Child ထည့်သွင်းခြင်း
            customer.setCompanyInfo(companyInfo);

        } else {
            throw new IllegalArgumentException("Invalid customer type. Must be PERSONAL or COMPANY");
        }

        // ၄။ CascadeType.ALL ဖြင့် Parent ရော Child ရောကို တစ်ပြိုင်တည်း Save ပြုလုပ်ခြင်း
        customerRepository.save(customer);

        return customerCode;
    }
}