package com.corebanking.service;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.AccountStatusUpdateDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.dto.JointHolderAddDTO;
import com.corebanking.entity.AccountSignatories;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.Customers;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.SignatoryRole;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.AccountSignatoriesRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.StaffUsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.concurrent.ThreadLocalRandom;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final PasswordEncoder passwordEncoder;
    private final AccountSignatoriesRepository accountSignatoriesRepository; // [Error 1 ဖြေရှင်းချက်: Missing Repository ထည့်သွင်းခြင်း]

    @Transactional
    public AccountResponseDTO createAccount(AccountCreateDTO dto) {
        // 1. Verify Customer exists and is ACTIVE
        Customers customer = customerRepository.findByCustomerCode(dto.getCustomerCode())
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + dto.getCustomerCode()));

        if (customer.getStatus() != CustomerStatus.ACTIVE) {
            throw new RuntimeException("Cannot open account for an inactive customer");
        }

        // 2. Identify the authenticated Staff creating this account
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentStaffUsername = (auth != null) ? auth.getName() : "admin";

        StaffUsers staff = staffUsersRepository.findByUsername(currentStaffUsername)
                .orElseThrow(() -> new RuntimeException("Authenticated staff record not found"));

        // 3. Generate a unique Account Number
        AccountType accountType = (dto.getAccountType() != null) ? dto.getAccountType() : AccountType.SAVINGS;
        String accountNumber = generateUniqueAccountNumber(accountType);

        
        BigDecimal initialDeposit = (dto.getInitialDeposit() != null) ? dto.getInitialDeposit() : BigDecimal.ZERO;
        String currency = (dto.getCurrency() != null && !dto.getCurrency().isBlank()) ? dto.getCurrency().toUpperCase() : "MMK";
        boolean isJoint = (dto.getIsJointAccount() != null) && dto.getIsJointAccount();

        AccountCategory category;
        BigDecimal dailyTransferLimit;
        short approvals;

        if (customer.getCustomerType() == CustomerType.COMPANY) {
            category = AccountCategory.CORPORATE;
            dailyTransferLimit = new BigDecimal("100000000.0000"); // သိန်း ၁၀၀၀
            approvals = (dto.getRequiredApprovals() != null && dto.getRequiredApprovals() > 1) 
                        ? dto.getRequiredApprovals() 
                        : (short) 2;
        } else {
            category = (dto.getAccountCategory() != null) ? dto.getAccountCategory() : AccountCategory.RETAIL;
            dailyTransferLimit = new BigDecimal("5000000.0000"); // သိန်း ၅၀
            approvals = (dto.getRequiredApprovals() != null) ? dto.getRequiredApprovals() : (short) 1;
        }

        String rawAccountPassword = (dto.getAccountPassword() != null && !dto.getAccountPassword().isBlank())
                ? dto.getAccountPassword()
                : "123456";
        String encodedAccountPassword = passwordEncoder.encode(rawAccountPassword);

        // 5. Build and save the Account entity
        Accounts account = Accounts.builder()
                .customer(customer)
                .accountNumber(accountNumber)
                .accountCategory(category)
                .accountType(accountType)
                .isJointAccount(isJoint)
                .requiredApprovals(approvals)
                .currency(currency)
                .currentBalance(initialDeposit)
                .availableBalance(initialDeposit)
                .minimumBalance(BigDecimal.ZERO)
                .dailyTransferLimit(dailyTransferLimit)
                .accountPasswordHash(encodedAccountPassword)
                .status(AccountStatus.ACTIVE)
                .openedAt(LocalDateTime.now())
                .createdByStaff(staff)
                .build();

        Accounts saved = accountRepository.save(account);

        return AccountResponseDTO.builder()
                .accountNumber(saved.getAccountNumber())
                .accountType(saved.getAccountType().name())
                .accountCategory(saved.getAccountCategory().name())
                .isJointAccount(saved.isJointAccount())
                .customerCode(customer.getCustomerCode())
                .customerName(customer.getFullName())
                .currentBalance(saved.getCurrentBalance())
                .availableBalance(saved.getAvailableBalance())
                .currency(saved.getCurrency())
                .status(saved.getStatus().name())
                .openedAt(saved.getOpenedAt())
                .build();
    }

    private String generateUniqueAccountNumber(AccountType type) {
        String prefix = (type == AccountType.CURRENT) ? "200" : "100";

        String accNum;
        do {
            long randomDigits = ThreadLocalRandom.current().nextLong(1000000L, 9999999L);
            accNum = prefix + randomDigits;
        } while (accountRepository.existsByAccountNumber(accNum));

        return accNum;
    }
    
    /**
     * Company Account အား CEO (PRIMARY_HOLDER) နှင့် Accountant (JOINT_HOLDER) တို့ဖြင့် ဖွင့်လှစ်ခြင်း
     */
    /**
     * Company Account အား CEO (PRIMARY_HOLDER) နှင့် Accountant (JOINT_HOLDER) တို့ဖြင့် ဖွင့်လှစ်ခြင်း
     */
    @Transactional
    public String createCorporateAccountWithExistingRoles(CorporateAccountCreateDTO dto) {
        // ၁။ Company Customer ရှိမရှိ စစ်ဆေးခြင်း
        Customers company = customerRepository.findByCustomerCode(dto.getCompanyCustomerCode())
                .orElseThrow(() -> new RuntimeException("Company record not found: " + dto.getCompanyCustomerCode()));

        if (company.getCustomerType() != CustomerType.COMPANY) {
            throw new IllegalArgumentException("Customer must be of type COMPANY");
        }

        // ၂။ CEO နှင့် Accountant Customers Entity များကို ရယူပါ
        Customers ceoCustomer = customerRepository.findByCustomerCode(dto.getCeoCustomerCode())
                .orElseThrow(() -> new RuntimeException("CEO record not found: " + dto.getCeoCustomerCode()));

        Customers accountantCustomer = customerRepository.findByCustomerCode(dto.getAccountantCustomerCode())
                .orElseThrow(() -> new RuntimeException("Accountant record not found: " + dto.getAccountantCustomerCode()));

        // ၃။ Current Staff အား ရယူခြင်း
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentStaffUsername = (auth != null) ? auth.getName() : "admin";
        StaffUsers staff = staffUsersRepository.findByUsername(currentStaffUsername)
                .orElseThrow(() -> new RuntimeException("Authenticated staff record not found"));

        // ၄။ Account Number နှင့် Initial Balances များ တွက်ချက်ခြင်း
        AccountType accountType = (dto.getAccountType() != null && dto.getAccountType().equalsIgnoreCase("CURRENT")) 
                ? AccountType.CURRENT : AccountType.SAVINGS;
        String accountNumber = generateUniqueAccountNumber(accountType);
        BigDecimal initialDeposit = (dto.getInitialDeposit() != null) ? dto.getInitialDeposit() : BigDecimal.ZERO;
        String currency = (dto.getCurrency() != null && !dto.getCurrency().isBlank()) ? dto.getCurrency().toUpperCase() : "MMK";

        String rawPassword = (dto.getAccountPassword() != null && !dto.getAccountPassword().isBlank()) 
                ? dto.getAccountPassword() : "123456";
        String encodedPassword = passwordEncoder.encode(rawPassword);

        // ၅။ Company အတွက် Accounts Record အား စတင်တည်ဆောက်ပြီး Save လုပ်ခြင်း
        Accounts account = Accounts.builder()
                .customer(company)
                .accountNumber(accountNumber)
                .accountCategory(AccountCategory.CORPORATE)
                .accountType(accountType)
                .isJointAccount(false)
                .requiredApprovals((short) 2)
                .currency(currency)
                .currentBalance(initialDeposit)
                .availableBalance(initialDeposit)
                .minimumBalance(BigDecimal.ZERO)
                .dailyTransferLimit(new BigDecimal("100000000.0000"))
                .accountPasswordHash(encodedPassword)
                .status(AccountStatus.ACTIVE)
                .openedAt(LocalDateTime.now())
                .createdByStaff(staff)
                .build();

        Accounts savedAccount = accountRepository.save(account);

        // ၆။ CEO အား PRIMARY_HOLDER (Approver) အဖြစ် စာရင်းသွင်းခြင်း
        AccountSignatories ceoSignatory = AccountSignatories.builder()
                .account(savedAccount)                        // သိမ်းဆည်းပြီးသော savedAccount ကို ထည့်သွင်းခြင်း
                .customer(ceoCustomer)
                .signatoryRole(SignatoryRole.PRIMARY_HOLDER)
                .canInitiate(false)
                .canApprove(true)
                .status(com.corebanking.entity.enums.SignatoryStatus.ACTIVE)
                .build();

        // ၇။ Accountant အား JOINT_HOLDER (Initiator) အဖြစ် စာရင်းသွင်းခြင်း
        AccountSignatories accountantSignatory = AccountSignatories.builder()
                .account(savedAccount)                        // သိမ်းဆည်းပြီးသော savedAccount ကို ထည့်သွင်းခြင်း
                .customer(accountantCustomer)
                .signatoryRole(SignatoryRole.JOINT_HOLDER)
                .canInitiate(true)
                .canApprove(false)
                .status(com.corebanking.entity.enums.SignatoryStatus.ACTIVE)
                .build();

        // ၈။ Database သို့ Signatories သိမ်းဆည်းခြင်း
        accountSignatoriesRepository.save(ceoSignatory);
        accountSignatoriesRepository.save(accountantSignatory);

        return accountNumber;
    }
    

    @Transactional(readOnly = true)
    public AccountResponseDTO getAccountByNumber(String accountNumber) {
        Accounts account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found with number: " + accountNumber));

        Customers customer = account.getCustomer();

        return AccountResponseDTO.builder()
                .accountNumber(account.getAccountNumber())
                .accountType(account.getAccountType().name())
                .accountCategory(account.getAccountCategory().name())
                .isJointAccount(account.isJointAccount())
                .customerCode(customer.getCustomerCode())
                .customerName(customer.getFullName())
                .currentBalance(account.getCurrentBalance())
                .availableBalance(account.getAvailableBalance())
                .currency(account.getCurrency())
                .status(account.getStatus().name())
                .openedAt(account.getOpenedAt())
                .build();
    }

    @Transactional(readOnly = true)
    public java.util.List<AccountResponseDTO> getAccountsByCustomerCode(String customerCode) {
        Customers customer = customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + customerCode));

        java.util.List<Accounts> accounts = accountRepository.findByCustomerCustomerCode(customerCode);

        return accounts.stream()
                .map(acc -> AccountResponseDTO.builder()
                        .accountNumber(acc.getAccountNumber())
                        .accountType(acc.getAccountType().name())
                        .accountCategory(acc.getAccountCategory().name())
                        .isJointAccount(acc.isJointAccount())
                        .customerCode(customer.getCustomerCode())
                        .customerName(customer.getFullName())
                        .currentBalance(acc.getCurrentBalance())
                        .availableBalance(acc.getAvailableBalance())
                        .currency(acc.getCurrency())
                        .status(acc.getStatus().name())
                        .openedAt(acc.getOpenedAt())
                        .build())
                .toList();
    }

    @Transactional
    public AccountResponseDTO updateAccountStatus(String accountNumber, AccountStatusUpdateDTO dto) {
        Accounts account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found with number: " + accountNumber));

        if (dto.getStatus() == AccountStatus.CLOSED) {
            if (account.getCurrentBalance().compareTo(BigDecimal.ZERO) > 0) {
                throw new IllegalStateException("Cannot close account with remaining balance. Balance must be zero.");
            }
            account.setClosedAt(LocalDateTime.now());
        }

        account.setStatus(dto.getStatus());
        account.setUpdatedAt(LocalDateTime.now());

        Accounts updatedAccount = accountRepository.save(account);
        Customers customer = updatedAccount.getCustomer();

        return AccountResponseDTO.builder()
                .accountNumber(updatedAccount.getAccountNumber())
                .accountType(updatedAccount.getAccountType().name())
                .accountCategory(updatedAccount.getAccountCategory().name())
                .isJointAccount(updatedAccount.isJointAccount())
                .customerCode(customer.getCustomerCode())
                .customerName(customer.getFullName())
                .currentBalance(updatedAccount.getCurrentBalance())
                .availableBalance(updatedAccount.getAvailableBalance())
                .currency(updatedAccount.getCurrency())
                .status(updatedAccount.getStatus().name())
                .openedAt(updatedAccount.getOpenedAt())
                .build();
    }

    @Transactional
    public AccountResponseDTO addJointHolder(String accountNumber, JointHolderAddDTO dto) {
        Accounts account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found with number: " + accountNumber));

        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Cannot add joint holder to a non-active or frozen account");
        }

        Customers jointCustomer = customerRepository.findByCustomerCode(dto.getJointCustomerCode())
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + dto.getJointCustomerCode()));

        if (jointCustomer.getStatus() != CustomerStatus.ACTIVE) {
            throw new IllegalStateException("Joint customer is not active");
        }

        if (account.getCustomer().getCustomerCode().equals(dto.getJointCustomerCode())) {
            throw new IllegalArgumentException("Primary account holder cannot be added as a joint holder");
        }

        account.setJointAccount(true);
        if (account.getRequiredApprovals() < 2) {
            account.setRequiredApprovals((short) 2);
        }
        account.setUpdatedAt(LocalDateTime.now());

        Accounts updatedAccount = accountRepository.save(account);

        return AccountResponseDTO.builder()
                .accountNumber(updatedAccount.getAccountNumber())
                .accountType(updatedAccount.getAccountType().name())
                .accountCategory(updatedAccount.getAccountCategory().name())
                .isJointAccount(updatedAccount.isJointAccount())
                .customerCode(updatedAccount.getCustomer().getCustomerCode())
                .customerName(updatedAccount.getCustomer().getFullName())
                .currentBalance(updatedAccount.getCurrentBalance())
                .availableBalance(updatedAccount.getAvailableBalance())
                .currency(updatedAccount.getCurrency())
                .status(updatedAccount.getStatus().name())
                .openedAt(updatedAccount.getOpenedAt())
                .build();
    }
}