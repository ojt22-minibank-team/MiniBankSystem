package com.corebanking.service;

import com.corebanking.dto.AccessibleAccountDTO;
import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.AccountStatusUpdateDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.dto.JointHolderAddDTO;
import com.corebanking.entity.AccountSignatories;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.SignatoryRole;
import com.corebanking.entity.enums.SignatoryStatus;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.AccountSignatoriesRepository;
import com.corebanking.repository.CustomerCredentialsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.util.PasswordGeneratorUtil;

import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final CusEmailService cusEmailService;
    private final AccountSignatoriesRepository accountSignatoriesRepository;
    private final CustomerCredentialsRepository customerCredentialsRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * ၁။ Retail Account (Savings / Current) အသစ်ဖွင့်လှစ်ခြင်း
     */
    @Transactional
    public AccountResponseDTO createAccount(AccountCreateDTO dto) {
        // Customer ရှိမရှိ စစ်ဆေးခြင်း
        Customers customer = customerRepository.findByCustomerCode(dto.getCustomerCode())
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + dto.getCustomerCode()));

        StaffUsers staff = getCurrentAuthenticatedStaff();
        String accountNumber = generateUniqueAccountNumber(dto.getAccountType());
        BigDecimal initialDeposit = (dto.getInitialDeposit() != null) ? dto.getInitialDeposit() : BigDecimal.ZERO;
        String currency = (dto.getCurrency() != null && !dto.getCurrency().isBlank()) ? dto.getCurrency().toUpperCase() : "MMK";

        // Accounts Record တည်ဆောက်ခြင်း
        Accounts account = Accounts.builder()
                .customer(customer)
                .accountNumber(accountNumber)
                .accountCategory(AccountCategory.RETAIL)
                .accountType(dto.getAccountType())
                .isJointAccount(false)
                .requiredApprovals((short) 1)
                .currency(currency)
                .currentBalance(initialDeposit)
                .availableBalance(initialDeposit)
                .minimumBalance(BigDecimal.ZERO)
                .dailyTransferLimit(new BigDecimal("50000000.0000"))
                .status(AccountStatus.ACTIVE)
                .openedAt(LocalDateTime.now())
                .createdByStaff(staff)
                .build();

        Accounts savedAccount = accountRepository.save(account);

        // Temporary Password ကို Auto-generate ထုတ်ယူပြီး Credential Table တွင် သိမ်းဆည်းခြင်း
        String rawPassword = PasswordGeneratorUtil.generateTemporaryPassword(8);
        String hashedPassword = passwordEncoder.encode(rawPassword);

        CustomerCredentials credentials = customerCredentialsRepository.findByCustomerId(customer.getId())
                .orElseGet(() -> {
                    CustomerCredentials newCred = new CustomerCredentials();
                    newCred.setCustomerId(customer.getId());
                    return newCred;
                });

        credentials.setPasswordHash(hashedPassword);
        credentials.setUpdatedAt(LocalDateTime.now());
        customerCredentialsRepository.save(credentials);

        // Customer Gmail သို့ Account Number နှင့် Login Temporary Password အား ပို့ဆောင်ပေးခြင်း
        if (customer.getEmail() != null && !customer.getEmail().isBlank()) {
            cusEmailService.sendAccountOpeningConfirmation(
                    customer.getEmail(),
                    customer.getFullName(),
                    savedAccount.getAccountNumber(),
                    savedAccount.getAccountType().name(),
                    rawPassword
            );
        }

        return mapToResponseDTO(savedAccount);
    }

    /**
     * ၂။ Company Account အား CEO (PRIMARY_HOLDER) နှင့် Accountant (JOINT_HOLDER) တို့ဖြင့် ဖွင့်လှစ်ခြင်း
     */
    @Transactional
    public String createCorporateAccountWithExistingRoles(CorporateAccountCreateDTO dto) {
        Customers company = customerRepository.findByCustomerCode(dto.getCompanyCustomerCode())
                .orElseThrow(() -> new RuntimeException("Company record not found: " + dto.getCompanyCustomerCode()));

        if (company.getCustomerType() != CustomerType.COMPANY) {
            throw new IllegalArgumentException("Customer must be of type COMPANY");
        }

        Customers ceoCustomer = customerRepository.findByCustomerCode(dto.getCeoCustomerCode())
                .orElseThrow(() -> new RuntimeException("CEO record not found: " + dto.getCeoCustomerCode()));

        Customers accountantCustomer = customerRepository.findByCustomerCode(dto.getAccountantCustomerCode())
                .orElseThrow(() -> new RuntimeException("Accountant record not found: " + dto.getAccountantCustomerCode()));

        StaffUsers staff = getCurrentAuthenticatedStaff();

        AccountType accountType = (dto.getAccountType() != null && dto.getAccountType().equalsIgnoreCase("CURRENT"))
                ? AccountType.CURRENT : AccountType.SAVINGS;
        String accountNumber = generateUniqueAccountNumber(accountType);
        BigDecimal initialDeposit = (dto.getInitialDeposit() != null) ? dto.getInitialDeposit() : BigDecimal.ZERO;
        String currency = (dto.getCurrency() != null && !dto.getCurrency().isBlank()) ? dto.getCurrency().toUpperCase() : "MMK";

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
                .status(AccountStatus.ACTIVE)
                .openedAt(LocalDateTime.now())
                .createdByStaff(staff)
                .build();

        Accounts savedAccount = accountRepository.save(account);

        // Signatories ချိတ်ဆက်ခြင်း
        AccountSignatories ceoSignatory = AccountSignatories.builder()
                .account(savedAccount)
                .customer(ceoCustomer)
                .signatoryRole(SignatoryRole.PRIMARY_HOLDER)
                .canInitiate(false)
                .canApprove(true)
                .status(SignatoryStatus.ACTIVE)
                .build();

        AccountSignatories accountantSignatory = AccountSignatories.builder()
                .account(savedAccount)
                .customer(accountantCustomer)
                .signatoryRole(SignatoryRole.JOINT_HOLDER)
                .canInitiate(true)
                .canApprove(false)
                .status(SignatoryStatus.ACTIVE)
                .build();

        accountSignatoriesRepository.save(ceoSignatory);
        accountSignatoriesRepository.save(accountantSignatory);

        // CEO အတွက် Login Temporary Password ထုတ်ပေးပြီး Credential သိမ်းဆည်းခြင်း
        String rawPassword = PasswordGeneratorUtil.generateTemporaryPassword(8);
        String hashedPassword = passwordEncoder.encode(rawPassword);

        CustomerCredentials ceoCred = customerCredentialsRepository.findByCustomerId(ceoCustomer.getId())
                .orElseGet(() -> {
                    CustomerCredentials newCred = new CustomerCredentials();
                    newCred.setCustomerId(ceoCustomer.getId());
                    return newCred;
                });
        ceoCred.setPasswordHash(hashedPassword);
        ceoCred.setUpdatedAt(LocalDateTime.now());
        customerCredentialsRepository.save(ceoCred);

        // CEO ၏ Email သို့ အကောင့်နံပါတ်နှင့် Temporary Password ပို့ပေးခြင်း
        String targetEmail = (ceoCustomer.getEmail() != null && !ceoCustomer.getEmail().isBlank())
                ? ceoCustomer.getEmail() : company.getEmail();

        if (targetEmail != null && !targetEmail.isBlank()) {
            cusEmailService.sendAccountOpeningConfirmation(
                    targetEmail,
                    company.getFullName() + " (Attn: " + ceoCustomer.getFullName() + ")",
                    savedAccount.getAccountNumber(),
                    savedAccount.getAccountType().name(),
                    rawPassword
            );
        }

        return accountNumber;
    }

    @Transactional(readOnly = true)
    public AccountResponseDTO getAccountByNumber(String accountNumber) {
        Accounts account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found with number: " + accountNumber));

        return mapToResponseDTO(account);
    }

    @Transactional(readOnly = true)
    public List<AccountResponseDTO> getAccountsByCustomerCode(String customerCode) {
        Customers customer = customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + customerCode));

        List<Accounts> accounts = accountRepository.findByCustomerCustomerCode(customerCode);

        return accounts.stream()
                .map(this::mapToResponseDTO)
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
        return mapToResponseDTO(updatedAccount);
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
        return mapToResponseDTO(updatedAccount);
    }

    /**
     * Dashboard နှင့် Staff Portal အတွက် စနစ်အတွင်းရှိ အကောင့်အားလုံးကို ဆွဲယူခြင်း (Fix: mapToResponseDTO သို့ ပြင်ဆင်ပြီး)
     */
    @Transactional(readOnly = true)
    public List<AccountResponseDTO> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(this::mapToResponseDTO) // mapToAccountResponseDTO အစား mapToResponseDTO အမှန်ကို အသုံးပြုထားပါသည်
                .toList();
    }

    private StaffUsers getCurrentAuthenticatedStaff() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        String currentStaffUsername = (auth != null && auth.getName() != null && !auth.getName().equalsIgnoreCase("anonymousUser"))
                ? auth.getName() : "admin";

        return staffUsersRepository.findByUsername(currentStaffUsername)
                .orElseThrow(() -> new RuntimeException("Authenticated staff record not found for username: " + currentStaffUsername));
    }

    private String generateUniqueAccountNumber(AccountType type) {
        String prefix = (type == AccountType.SAVINGS) ? "100" : "200";
        long randomNum = (long) (Math.random() * 9000000L) + 1000000L;
        return prefix + randomNum;
    }

    private AccountResponseDTO mapToResponseDTO(Accounts account) {
        Customers customer = account.getCustomer();
        return AccountResponseDTO.builder()
                .accountNumber(account.getAccountNumber())
                .accountType(account.getAccountType() != null ? account.getAccountType().name() : null)
                .accountCategory(account.getAccountCategory() != null ? account.getAccountCategory().name() : null)
                .isJointAccount(account.isJointAccount())
                .customerCode(customer != null ? customer.getCustomerCode() : null)
                .customerName(customer != null ? customer.getFullName() : null)
                .currentBalance(account.getCurrentBalance())
                .availableBalance(account.getAvailableBalance())
                .currency(account.getCurrency())
                .status(account.getStatus() != null ? account.getStatus().name() : null)
                .openedAt(account.getOpenedAt())
                .build();
    }
    /**
     * Teller/Staff မှ ငွေသားသွင်းပေးခြင်း (Cash Deposit)
     * Account Number ဖြင့်ဖြစ်စေ၊ Customer Code ဖြင့်ဖြစ်စေ ငွေသွင်းနိုင်သည်
     */
    @Transactional
    public AccountResponseDTO depositFunds(DepositRequestDTO dto) {
        Accounts account;

        // ၁။ Account Number ဖြင့် ရှာဖွေခြင်း (Account Number ပေးထားပါက)
        if (dto.getAccountNumber() != null && !dto.getAccountNumber().isBlank()) {
            account = accountRepository.findByAccountNumber(dto.getAccountNumber().trim())
                    .orElseThrow(() -> new RuntimeException("Account not found with number: " + dto.getAccountNumber()));
        } 
        // ၂။ Customer Code သာ ပေးထားပါက ထို Customer ၏ ပထမဆုံး Active ဖြစ်သော Account ကို ရှာဖွေခြင်း
        else if (dto.getCustomerCode() != null && !dto.getCustomerCode().isBlank()) {
            List<Accounts> customerAccounts = accountRepository.findByCustomerCustomerCode(dto.getCustomerCode().trim());
            if (customerAccounts.isEmpty()) {
                throw new RuntimeException("No bank accounts found for customer code: " + dto.getCustomerCode());
            }
            // Active ဖြစ်နေသော အကောင့်ကို ဦးစားပေး ရွေးချယ်ခြင်း
            account = customerAccounts.stream()
                    .filter(acc -> acc.getStatus() == AccountStatus.ACTIVE)
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("No active account found for customer code: " + dto.getCustomerCode()));
        } else {
            throw new IllegalArgumentException("Either accountNumber or customerCode must be provided for deposit.");
        }

        // ၃။ အကောင့် အခြေအနေ စစ်ဆေးခြင်း
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Cannot deposit funds to an account that is " + account.getStatus());
        }

        // ၄။ Balance ပေါင်းထည့်ခြင်း
        BigDecimal updatedCurrentBalance = account.getCurrentBalance().add(dto.getAmount());
        BigDecimal updatedAvailableBalance = account.getAvailableBalance().add(dto.getAmount());

        account.setCurrentBalance(updatedCurrentBalance);
        account.setAvailableBalance(updatedAvailableBalance);
        account.setUpdatedAt(LocalDateTime.now());

        Accounts savedAccount = accountRepository.save(account);

        System.out.println("✅ Successfully deposited " + dto.getAmount() + " MMK into Account: " + savedAccount.getAccountNumber());

        return mapToResponseDTO(savedAccount);
    }
    
    /**
     * Group 2 Logic:
     * Customer တစ်ဦးတည်း၏ Login ဖြင့် Personal Account ရော Company Account ပါ
     * တစ်ခါတည်း ကြည့်ရှုခွင့်ပြုသော Method
     */
    @Transactional(readOnly = true)
    public List<AccessibleAccountDTO> getAccessibleAccountsForCustomer(String customerCode) {
        Customers customer = customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + customerCode));

        List<AccessibleAccountDTO> accountList = new ArrayList<>();

        // ၁။ မိမိ၏ ကိုယ်ပိုင် Personal Accounts များကို ထည့်သွင်းခြင်း
        List<Accounts> personalAccounts = accountRepository.findByCustomer(customer);
        for (Accounts acc : personalAccounts) {
            accountList.add(AccessibleAccountDTO.builder()
                    .accountNumber(acc.getAccountNumber())
                    .accountType(acc.getAccountType().name())
                    .accountCategory("PERSONAL")
                    .companyName(null)
                    .role("OWNER")
                    .currentBalance(acc.getCurrentBalance())
                    .availableBalance(acc.getAvailableBalance())
                    .currency(acc.getCurrency())
                    .canInitiate(true)
                    .canApprove(true)
                    .build());
        }

        // ၂။ မိမိအား Signatory (CEO/Accountant) အဖြစ် ချိတ်ဆက်ထားသော Company Accounts များကို ထည့်သွင်းခြင်း
        List<AccountSignatories> corporateSignatories = 
                accountSignatoriesRepository.findByCustomerAndStatus(customer, SignatoryStatus.ACTIVE);

        for (AccountSignatories sig : corporateSignatories) {
            Accounts compAcc = sig.getAccount();
            accountList.add(AccessibleAccountDTO.builder()
                    .accountNumber(compAcc.getAccountNumber())
                    .accountType(compAcc.getAccountType().name())
                    .accountCategory("CORPORATE")
                    .companyName(compAcc.getCustomer().getFullName()) // ကုမ္ပဏီ အမည်
                    .role(sig.getSignatoryRole().name())
                    .currentBalance(compAcc.getCurrentBalance())
                    .availableBalance(compAcc.getAvailableBalance())
                    .currency(compAcc.getCurrency())
                    .canInitiate(sig.isCanInitiate()) // Accountant ဆိုလျှင် true
                    .canApprove(sig.isCanApprove())   // CEO ဆိုလျှင် true
                    .build());
        }

        return accountList;
    }
}