package com.corebanking.service;

import com.corebanking.dto.GatewayAccountVerificationResponseDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.repository.AccountRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class GatewayAccountVerificationService {

    private final AccountRepository accountRepository;

    @Transactional(readOnly = true)
    public GatewayAccountVerificationResponseDto verifyCorporateAccount(String accountNumber) {
        if (accountNumber == null || accountNumber.isBlank()) {
            throw new IllegalArgumentException("Account number must not be blank.");
        }

        String cleanAccNo = accountNumber.trim();

        Accounts account = accountRepository.findByAccountNumberWithCustomerAndCompany(cleanAccNo)
                .orElseThrow(() -> new AccountNotFoundException("Bank account not found: " + cleanAccNo));

        Customers customer = account.getCustomer();
        CompanyInfo companyInfo = (customer != null) ? customer.getCompanyInfo() : null;

        boolean isCorporateCategory = account.getAccountCategory() == AccountCategory.CORPORATE;
        boolean isCompanyCustomer = customer != null && customer.getCustomerType() == CustomerType.COMPANY;
        boolean hasCompanyInfo = companyInfo != null 
                && companyInfo.getCompanyName() != null 
                && !companyInfo.getCompanyName().isBlank();

        boolean isCorporate = isCorporateCategory || isCompanyCustomer || hasCompanyInfo;

        String companyName = null;
        String businessRegNo = null;
        String taxId = null;

        if (companyInfo != null) {
            companyName = (companyInfo.getCompanyName() != null && !companyInfo.getCompanyName().isBlank())
                    ? companyInfo.getCompanyName().trim()
                    : null;
            businessRegNo = companyInfo.getRegistrationNumber();
            taxId = companyInfo.getTaxId();
        }

        if (companyName == null && isCorporate && customer != null) {
            companyName = customer.getFullName() != null ? customer.getFullName().trim() : null;
        }

        boolean isActive = account.getStatus() == AccountStatus.ACTIVE;
        boolean verified = isCorporate && isActive;

        String message;
        if (!isActive) {
            message = "Bank account is not active. Current status: " + account.getStatus();
        } else if (!isCorporate) {
            message = "Bank account is not a corporate or company account (Category: " + account.getAccountCategory() + ").";
        } else {
            message = "Corporate bank account verified successfully.";
        }

        log.info("Gateway corporate account check completed for account: {}, isCorporate: {}, active: {}, verified: {}",
                cleanAccNo, isCorporate, isActive, verified);

        return GatewayAccountVerificationResponseDto.builder()
                .accountNumber(account.getAccountNumber())
                .companyName(companyName)
                .isCorporate(isCorporate)
                .verified(verified)
                .accountCategory(account.getAccountCategory() != null ? account.getAccountCategory().name() : null)
                .customerType(customer != null && customer.getCustomerType() != null ? customer.getCustomerType().name() : null)
                .accountType(account.getAccountType() != null ? account.getAccountType().name() : null)
                .currency(account.getCurrency())
                .status(account.getStatus() != null ? account.getStatus().name() : null)
                .businessRegistrationNo(businessRegNo)
                .taxId(taxId)
                .message(message)
                .build();
    }
}
