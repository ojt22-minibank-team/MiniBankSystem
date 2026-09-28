package com.corebanking.service;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.AccountStatusUpdateDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.dto.JointHolderAddDTO;
import com.corebanking.entity.AccountSignatory;
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
import com.corebanking.repository.AccountSignatoryRepository;
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
    private final AccountSignatoryRepository accountSignatoryRepository; // [Error 1 ဖြေရှင်းချက်: Missing Repository ထည့်သွင်းခြင်း]

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
    @Transactional
    public String createCorporateAccountWithExistingRoles(CorporateAccountCreateDTO dto) {
        // ၁။ Company Customer စစ်ဆေးခြင်း
        Customers company = customerRepository.findByCustomerCode(dto.getCompanyCustomerCode())
                .orElseThrow(() -> new RuntimeException("Company record not found: " + dto.getCompanyCustomerCode()));

        if (company.getCustomerType() != CustomerType.COMPANY) {
            throw new IllegalArgumentException("Customer must be of type COMPANY");
        }

        // ၂။ CEO နှင့် Accountant ရှိမရှိ စစ်ဆေးခြင်း
        customerRepository.findByCustomerCode(dto.getCeoCustomerCode())
                .orElseThrow(() -> new RuntimeException("CEO record not found: " + dto.getCeoCustomerCode()));

        customerRepository.findByCustomerCode(dto.getAccountantCustomerCode())
                .orElseThrow(() -> new RuntimeException("Accountant record not found: " + dto.getAccountantCustomerCode()));

        // Authenticated Staff ကို ရယူခြင်း
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentStaffUsername = (auth != null) ? auth.getName() : "admin";
        StaffUsers staff = staffUsersRepository.findByUsername(currentStaffUsername)
                .orElseThrow(() -> new RuntimeException("Authenticated staff record not found"));

        // ၃။ Account Number ထုတ်ယူခြင်း (Corporate Current Account အတွက် Prefix 200)
        String prefix = (dto.getAccountType() != null && dto.getAccountType().equalsIgnoreCase("CURRENT")) ? "200" : "100";
        String accountNumber;
        do {
            accountNumber = prefix + String.valueOf(ThreadLocalRandom.current().nextInt(1000000, 9999999));
        } while (accountRepository.existsByAccountNumber(accountNumber));

        BigDecimal initialDeposit = dto.getInitialDeposit() != null ? dto.getInitialDeposit() : BigDecimal.ZERO;

        // ၄။ Accounts Table ထဲသို့ Entity Builder အမှန်ဖြင့် သိမ်းဆည်းခြင်း
        Accounts account = Accounts.builder()
                .accountNumber(accountNumber)
                .customer(company)
                .accountCategory(AccountCategory.CORPORATE)
                .accountType(AccountType.valueOf(dto.getAccountType().toUpperCase()))
                .currentBalance(initialDeposit)
                .availableBalance(initialDeposit)
                .minimumBalance(BigDecimal.ZERO)
                .dailyTransferLimit(new BigDecimal("100000000.0000"))
                .currency("MMK")
                .isJointAccount(false)
                .requiredApprovals((short) 2) // CEO Approve လုပ်ရန် Approvals 2 သတ်မှတ်ခြင်း
                .status(AccountStatus.ACTIVE)
                .openedAt(LocalDateTime.now())
                .createdByStaff(staff)
                .build();

        accountRepository.save(account);

        // ၅။ CEO အား PRIMARY_HOLDER အဖြစ် စာရင်းသွင်းခြင်း
        AccountSignatory ceoSignatory = AccountSignatory.builder()
                .accountNumber(accountNumber)
                .customerCode(dto.getCeoCustomerCode())
                .role(SignatoryRole.PRIMARY_HOLDER) // CEO = PRIMARY_HOLDER
                .build();

        // ၆။ Accountant အား JOINT_HOLDER အဖြစ် စာရင်းသွင်းခြင်း
        AccountSignatory accountantSignatory = AccountSignatory.builder()
                .accountNumber(accountNumber)
                .customerCode(dto.getAccountantCustomerCode())
                .role(SignatoryRole.JOINT_HOLDER) // Accountant = JOINT_HOLDER
                .build();

        accountSignatoryRepository.save(ceoSignatory);
        accountSignatoryRepository.save(accountantSignatory);

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