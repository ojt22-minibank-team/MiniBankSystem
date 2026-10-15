package com.corebanking.service;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.dto.CorporateAccountResponseDTO;
import com.corebanking.dto.JointHolderAddDTO;
import com.corebanking.entity.AccountSignatories;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.CorporateCredential;
import com.corebanking.entity.CorporateUser;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.CorporateRole;
import com.corebanking.entity.enums.CorporateUserStatus;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.MfaMethod;
import com.corebanking.entity.enums.SignatoryRole;
import com.corebanking.entity.enums.SignatoryStatus;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.AccountSignatoriesRepository;
import com.corebanking.repository.CompanyInfoRepository;
import com.corebanking.repository.CorporateCredentialRepository;
import com.corebanking.repository.CorporateUserRepository;
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
import java.security.SecureRandom;
import java.time.LocalDateTime;
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
    private final CorporateUserRepository corporateUserRepository;
    private final CorporateCredentialRepository corporateCredentialRepository;
    private final CompanyInfoRepository companyInfoRepository;
    
    /**
     * ၁။ Retail Account (Savings / Current) အသစ်ဖွင့်လှစ်ခြင်း
     */
    @Transactional
    public AccountResponseDTO createAccount(AccountCreateDTO dto) {
        Customers customer = customerRepository.findByCustomerCode(dto.getCustomerCode())
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + dto.getCustomerCode()));

        StaffUsers staff = getCurrentAuthenticatedStaff();
        String accountNumber = generateUniqueAccountNumber(dto.getAccountType());
        BigDecimal initialDeposit = (dto.getInitialDeposit() != null) ? dto.getInitialDeposit() : BigDecimal.ZERO;
        String currency = (dto.getCurrency() != null && !dto.getCurrency().isBlank()) ? dto.getCurrency().toUpperCase() : "MMK";

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

        // Personal Login Password ကို ထုတ်ယူပြီး customer_credentials တွင် သိမ်းဆည်းခြင်း
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

        // Customer Email သို့ အသိပေးခြင်း
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
     * Corporate Account ဖွင့်လှစ်ခြင်း (CorporateUser entity အသစ်နှင့် အတိအကျ ကိုက်ညီအောင် ပြင်ဆင်ပြီး)
     */
    @Transactional
    public CorporateAccountResponseDTO createCorporateAccount(CorporateAccountCreateDTO dto) {

        // ၁။ Company, CEO နှင့် Accountant customer များကို စစ်ဆေးရှာဖွေခြင်း
        Customers companyCustomer = customerRepository.findByCustomerCode(dto.getCompanyCustomerCode())
                .orElseThrow(() -> new RuntimeException("Company record not found: " + dto.getCompanyCustomerCode()));

        if (companyCustomer.getCustomerType() != CustomerType.COMPANY) {
            throw new IllegalArgumentException("Target customer must be of type COMPANY");
        }

        // CompanyInfo ကို ရှာဖွေခြင်း (CorporateUser တွင် companyInfo လိုအပ်သောကြောင့် ဖြစ်ပါသည်)
        CompanyInfo companyInfo = companyInfoRepository.findByCustomer(companyCustomer)
                .orElseThrow(() -> new RuntimeException("CompanyInfo not found for customer: " + companyCustomer.getCustomerCode()));

        Customers ceoCustomer = customerRepository.findByCustomerCode(dto.getCeoCustomerCode())
                .orElseThrow(() -> new RuntimeException("CEO record not found: " + dto.getCeoCustomerCode()));

        Customers accountantCustomer = customerRepository.findByCustomerCode(dto.getAccountantCustomerCode())
                .orElseThrow(() -> new RuntimeException("Accountant record not found: " + dto.getAccountantCustomerCode()));

        StaffUsers staff = getCurrentAuthenticatedStaff();
        AccountType accountType = (dto.getAccountType() != null && dto.getAccountType().equalsIgnoreCase("SAVINGS"))
                ? AccountType.SAVINGS : AccountType.CURRENT;

        String newAccountNumber = generateUniqueAccountNumber(accountType);
        BigDecimal initialDeposit = (dto.getInitialDeposit() != null) ? dto.getInitialDeposit() : BigDecimal.ZERO;
        String currency = (dto.getCurrency() != null && !dto.getCurrency().isBlank()) ? dto.getCurrency().toUpperCase() : "MMK";

        // ၂။ Corporate Account တည်ဆောက်၍ သိမ်းဆည်းခြင်း
        Accounts corporateAccount = Accounts.builder()
                .customer(companyCustomer)
                .accountNumber(newAccountNumber)
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
        Accounts savedAccount = accountRepository.save(corporateAccount);

        // ၃။ Signatories ချိတ်ဆက်ခြင်း (CEO: Approver, Accountant: Maker)
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

        // ၄။ CEO အတွက် CorporateUser နှင့် CorporateCredential တည်ဆောက်ခြင်း
        String ceoRawPassword = generateSecureTempPassword();
        String ceoUserCode = "CORP-CEO-" + System.currentTimeMillis();

        CorporateUser ceoCorporateUser = CorporateUser.builder()
                .companyInfo(companyInfo) // 👈 သင်၏ Entity အတိုင်း companyInfo ထည့်သွင်းထားပါသည်
                .corporateUserCode(ceoUserCode)
                .corporateRole(CorporateRole.CEO) // 👈 corporateRole သို့ ပြင်ဆင်ထားပါသည်
                .fullName(ceoCustomer.getFullName())
                .email(ceoCustomer.getEmail() != null ? ceoCustomer.getEmail() : companyCustomer.getEmail())
                .phone(ceoCustomer.getPhone())
                .status(CorporateUserStatus.ACTIVE)
                .build();
        CorporateUser savedCeoUser = corporateUserRepository.save(ceoCorporateUser);

        CorporateCredential ceoCredential = CorporateCredential.builder()
                .corporateUser(savedCeoUser) // 👈 @MapsId ကြောင့် corporateUser တစ်ခုတည်း ပေးရုံဖြင့် လုံလောက်ပါသည်
                .passwordHash(passwordEncoder.encode(ceoRawPassword))
                .failedLoginCount(0)
                .failedPinAttemptCount(0)
                .mfaEnabled(true)
                .mfaMethod(MfaMethod.EMAIL)
                .mustChangePassword(true)
                .tokenVersion(0L)
                .isNew(true)
                .build();
        corporateCredentialRepository.save(ceoCredential);

        // ၅။ Accountant အတွက် CorporateUser နှင့် CorporateCredential တည်ဆောက်ခြင်း
        String accRawPassword = generateSecureTempPassword();
        String accUserCode = "CORP-ACC-" + System.currentTimeMillis();

        CorporateUser accountantCorporateUser = CorporateUser.builder()
                .companyInfo(companyInfo) // 👈 သင်၏ Entity အတိုင်း companyInfo ထည့်သွင်းထားပါသည်
                .corporateUserCode(accUserCode)
                .corporateRole(CorporateRole.ACCOUNTANT) // 👈 corporateRole သို့ ပြင်ဆင်ထားပါသည်
                .fullName(accountantCustomer.getFullName())
                .email(accountantCustomer.getEmail() != null ? accountantCustomer.getEmail() : companyCustomer.getEmail())
                .phone(accountantCustomer.getPhone())
                .status(CorporateUserStatus.ACTIVE)
                .build();
        CorporateUser savedAccUser = corporateUserRepository.save(accountantCorporateUser);

        CorporateCredential accCredential = CorporateCredential.builder()
                .corporateUser(savedAccUser) // 👈 @MapsId ကြောင့် corporateUser တစ်ခုတည်း ပေးရုံဖြင့် လုံလောက်ပါသည်
                .passwordHash(passwordEncoder.encode(accRawPassword))
                .failedLoginCount(0)
                .failedPinAttemptCount(0)
                .mfaEnabled(true)
                .mfaMethod(MfaMethod.EMAIL)
                .mustChangePassword(true)
                .tokenVersion(0L)
                .isNew(true)
                .build();
        corporateCredentialRepository.save(accCredential);

        // ၆။ CEO ထံသို့ Company Password အား Email ပေးပို့ခြင်း
        if (ceoCustomer.getEmail() != null && !ceoCustomer.getEmail().isBlank()) {
            cusEmailService.sendAccountOpeningConfirmation(
                    ceoCustomer.getEmail(),
                    companyCustomer.getFullName() + " (CEO: " + ceoCustomer.getFullName() + ")",
                    savedAccount.getAccountNumber(),
                    savedAccount.getAccountType().name() + " [CORPORATE]",
                    ceoRawPassword
            );
        }

        // ၇။ Accountant ထံသို့ Company Password အား Email ပေးပို့ခြင်း
        if (accountantCustomer.getEmail() != null && !accountantCustomer.getEmail().isBlank()) {
            cusEmailService.sendAccountOpeningConfirmation(
                    accountantCustomer.getEmail(),
                    companyCustomer.getFullName() + " (Accountant: " + accountantCustomer.getFullName() + ")",
                    savedAccount.getAccountNumber(),
                    savedAccount.getAccountType().name() + " [CORPORATE]",
                    accRawPassword
            );
        }

        // ၈။ Response ပြန်ထုတ်ပေးခြင်း
        return CorporateAccountResponseDTO.builder()
                .accountNumber(savedAccount.getAccountNumber())
                .companyCustomerCode(companyCustomer.getCustomerCode())
                .companyName(companyCustomer.getFullName())
                .accountType(savedAccount.getAccountType().name())
                .currentBalance(savedAccount.getCurrentBalance())
                .currency(savedAccount.getCurrency())
                .ceoCustomerCode(ceoCustomer.getCustomerCode())
                .ceoTempCorporatePassword(ceoRawPassword)
                .accountantCustomerCode(accountantCustomer.getCustomerCode())
                .accountantTempCorporatePassword(accRawPassword)
                .build();
    }

    @Transactional(readOnly = true)
    public AccountResponseDTO getAccountByNumber(String accountNumber) {
        Accounts account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new RuntimeException("Account not found with number: " + accountNumber));

        return mapToResponseDTO(account);
    }

    @Transactional(readOnly = true)
    public List<AccountResponseDTO> getAccountsByCustomerCode(String customerCode) {
        customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + customerCode));

        List<Accounts> accounts = accountRepository.findByCustomerCustomerCode(customerCode);

        return accounts.stream()
                .map(this::mapToResponseDTO)
                .toList();
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

    @Transactional(readOnly = true)
    public List<AccountResponseDTO> getAllAccounts() {
        return accountRepository.findAll().stream()
                .map(this::mapToResponseDTO)
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

    private String generateSecureTempPassword() {
        SecureRandom random = new SecureRandom();
        return "Corp@" + (100000 + random.nextInt(900000)) + "!";
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
}