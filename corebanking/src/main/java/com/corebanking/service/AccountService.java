package com.corebanking.service;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.AccountStatusUpdateDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.dto.JointHolderAddDTO;
import com.corebanking.entity.AccountSignatories;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.enums.InitiatedByType;
import com.corebanking.entity.enums.TransactionChannel;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.repository.BankTransactionRepository;

import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.CorporateAccountAccess;
import com.corebanking.entity.CorporateCredential;
import com.corebanking.entity.CorporateUser;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.PersonalInfo;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.CorporateAccessStatus;
import com.corebanking.entity.enums.CorporateRole;
import com.corebanking.entity.enums.CorporateUserStatus;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.MfaMethod;
import com.corebanking.entity.enums.SignatoryRole;
import com.corebanking.entity.enums.SignatoryStatus;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.AccountSignatoriesRepository;
import com.corebanking.repository.CompanyInfoRepository;
import com.corebanking.repository.CorporateAccountAccessRepository;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.concurrent.ThreadLocalRandom;

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
    private final CompanyInfoRepository companyInfoRepository;
    private final CorporateUserRepository corporateUserRepository;
    private final CorporateCredentialRepository corporateCredentialRepository;
    private final CorporateAccountAccessRepository corporateAccountAccessRepository;
    private final BankTransactionRepository bankTransactionRepository;

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

        // Record Initial Deposit Transaction in ledger/bank_transactions if deposit > 0
        recordInitialDepositTransaction(savedAccount, initialDeposit, staff, customer);

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
     * ၂။ Company Account အား CEO (can_view=1, can_approve=1) နှင့် MAKER (can_view=1, can_initiate=1) တို့ဖြင့် ဖွင့်လှစ်ခြင်း
     * corporate_users, corporate_credentials, accounts, corporate_account_access ဇယားများ၌ သီးခြားစီ ခွဲခြားသိမ်းဆည်းသည်
     */
    @Transactional
    public String createCorporateAccountWithExistingRoles(CorporateAccountCreateDTO dto) {
        Customers company = customerRepository.findByCustomerCode(dto.getCompanyCustomerCode())
                .orElseThrow(() -> new RuntimeException("Company record not found: " + dto.getCompanyCustomerCode()));

        if (company.getCustomerType() != CustomerType.COMPANY) {
            throw new IllegalArgumentException("Customer must be of type COMPANY");
        }

        CompanyInfo companyInfo = company.getCompanyInfo();
        if (companyInfo == null) {
            companyInfo = companyInfoRepository.findById(company.getCustomerId())
                    .orElseThrow(() -> new RuntimeException("Company info not found for customer: " + company.getCustomerCode()));
        }

        StaffUsers staff = getCurrentAuthenticatedStaff();
        LocalDateTime now = LocalDateTime.now();

        // 1. CEO User အချက်အလက် ရှာဖွေခြင်း သို့မဟုတ် တည်ဆောက်ခြင်း
        Customers ceoCustomer = null;
        String ceoFullName = dto.getCeoFullName();
        String ceoEmail = dto.getCeoEmail();
        String ceoPhone = dto.getCeoPhone();

        if (dto.getCeoCustomerCode() != null && !dto.getCeoCustomerCode().isBlank()) {
            ceoCustomer = customerRepository.findByCustomerCode(dto.getCeoCustomerCode()).orElse(null);
            if (ceoCustomer != null) {
                if (ceoFullName == null || ceoFullName.isBlank()) ceoFullName = ceoCustomer.getFullName();
                if (ceoEmail == null || ceoEmail.isBlank()) ceoEmail = ceoCustomer.getEmail();
                if (ceoPhone == null || ceoPhone.isBlank()) ceoPhone = ceoCustomer.getPhone();
            }
        }
        if (ceoFullName == null || ceoFullName.isBlank()) {
            ceoFullName = company.getFullName() + " CEO";
        }
        if (ceoEmail == null || ceoEmail.isBlank()) {
            ceoEmail = (company.getEmail() != null && !company.getEmail().isBlank())
                    ? company.getEmail()
                    : "ceo@" + company.getCustomerCode().toLowerCase().replace("-", "") + ".local";
        }

        final String finalCeoFullName = ceoFullName;
        final String finalCeoEmail = ceoEmail;
        final String finalCeoPhone = ceoPhone;
        final CompanyInfo finalCompanyInfo = companyInfo;

        CorporateUser ceoUser = corporateUserRepository
                .findByCompanyInfoCustomerIdAndCorporateRole(company.getCustomerId(), CorporateRole.CEO)
                .orElseGet(() -> {
                    CorporateUser newUser = CorporateUser.builder()
                            .companyInfo(finalCompanyInfo)
                            .corporateUserCode(generateCorporateUserCode("CEO"))
                            .corporateRole(CorporateRole.CEO)
                            .fullName(finalCeoFullName)
                            .email(finalCeoEmail)
                            .phone(finalCeoPhone)
                            .status(CorporateUserStatus.ACTIVE)
                            .createdAt(now)
                            .updatedAt(now)
                            .updatedByType(UpdatedByType.STAFF)
                            .updatedById(staff.getStaffId())
                            .build();
                    return corporateUserRepository.save(newUser);
                });

        // 2. Maker User အချက်အလက် ရှာဖွေခြင်း သို့မဟုတ် တည်ဆောက်ခြင်း
        Customers makerCustomer = null;
        String resolvedMakerCode = dto.getResolvedMakerCustomerCode();
        String makerFullName = dto.getMakerFullName();
        String makerEmail = dto.getMakerEmail();
        String makerPhone = dto.getMakerPhone();

        if (resolvedMakerCode != null && !resolvedMakerCode.isBlank()) {
            makerCustomer = customerRepository.findByCustomerCode(resolvedMakerCode).orElse(null);
            if (makerCustomer != null) {
                if (makerFullName == null || makerFullName.isBlank()) makerFullName = makerCustomer.getFullName();
                if (makerEmail == null || makerEmail.isBlank()) makerEmail = makerCustomer.getEmail();
                if (makerPhone == null || makerPhone.isBlank()) makerPhone = makerCustomer.getPhone();
            }
        }
        if (makerFullName == null || makerFullName.isBlank()) {
            makerFullName = company.getFullName() + " Maker";
        }
        if (makerEmail == null || makerEmail.isBlank()) {
            makerEmail = (company.getEmail() != null && !company.getEmail().isBlank())
                    ? company.getEmail()
                    : "maker@" + company.getCustomerCode().toLowerCase().replace("-", "") + ".local";
        }

        final String finalMakerFullName = makerFullName;
        final String finalMakerEmail = makerEmail;
        final String finalMakerPhone = makerPhone;

        CorporateUser makerUser = corporateUserRepository
                .findByCompanyInfoCustomerIdAndCorporateRole(company.getCustomerId(), CorporateRole.MAKER)
                .orElseGet(() -> {
                    CorporateUser newUser = CorporateUser.builder()
                            .companyInfo(finalCompanyInfo)
                            .corporateUserCode(generateCorporateUserCode("MKR"))
                            .corporateRole(CorporateRole.MAKER)
                            .fullName(finalMakerFullName)
                            .email(finalMakerEmail)
                            .phone(finalMakerPhone)
                            .status(CorporateUserStatus.ACTIVE)
                            .createdAt(now)
                            .updatedAt(now)
                            .updatedByType(UpdatedByType.STAFF)
                            .updatedById(staff.getStaffId())
                            .build();
                    return corporateUserRepository.save(newUser);
                });

        // 3. Corporate Credentials (CEO & Maker) သိမ်းဆည်းခြင်း
        String rawCeoPassword = (dto.getAccountPassword() != null && !dto.getAccountPassword().isBlank())
                ? dto.getAccountPassword()
                : PasswordGeneratorUtil.generateTemporaryPassword(8);
        String hashedCeoPassword = passwordEncoder.encode(rawCeoPassword);

        CorporateCredential ceoCred = corporateCredentialRepository.findByCorporateUserId(ceoUser.getCorporateUserId())
                .orElseGet(() -> CorporateCredential.builder()
                        .corporateUserId(ceoUser.getCorporateUserId())
                        .corporateUser(ceoUser)
                        .failedLoginCount(0)
                        .failedPinAttemptCount(0)
                        .mfaEnabled(true)
                        .mfaMethod(MfaMethod.EMAIL)
                        .mustChangePassword(true)
                        .tokenVersion(1L)
                        .createdAt(now)
                        .isNew(true)
                        .build());
        ceoCred.setPasswordHash(hashedCeoPassword);
        ceoCred.setUpdatedAt(now);
        ceoCred.setUpdatedByType(UpdatedByType.STAFF);
        ceoCred.setUpdatedById(staff.getStaffId());
        corporateCredentialRepository.save(ceoCred);

        String rawMakerPassword = PasswordGeneratorUtil.generateTemporaryPassword(8);
        String hashedMakerPassword = passwordEncoder.encode(rawMakerPassword);

        CorporateCredential makerCred = corporateCredentialRepository.findByCorporateUserId(makerUser.getCorporateUserId())
                .orElseGet(() -> CorporateCredential.builder()
                        .corporateUserId(makerUser.getCorporateUserId())
                        .corporateUser(makerUser)
                        .failedLoginCount(0)
                        .failedPinAttemptCount(0)
                        .mfaEnabled(true)
                        .mfaMethod(MfaMethod.EMAIL)
                        .mustChangePassword(true)
                        .tokenVersion(1L)
                        .createdAt(now)
                        .isNew(true)
                        .build());
        makerCred.setPasswordHash(hashedMakerPassword);
        makerCred.setUpdatedAt(now);
        makerCred.setUpdatedByType(UpdatedByType.STAFF);
        makerCred.setUpdatedById(staff.getStaffId());
        corporateCredentialRepository.save(makerCred);

        // 4. accounts Table တွင် Corporate Account အား သိမ်းဆည်းခြင်း
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
                .openedAt(now)
                .createdByStaff(staff)
                .build();

        Accounts savedAccount = accountRepository.save(account);

        // Record Initial Deposit Transaction in ledger/bank_transactions if deposit > 0
        recordInitialDepositTransaction(savedAccount, initialDeposit, staff, company);

        // 5. corporate_account_access Table တွင် CEO နှင့် Maker အတွက် Access ပေးခြင်း
        // CEO: can_view = 1, can_approve = 1, can_initiate = 0
        CorporateAccountAccess ceoAccess = CorporateAccountAccess.builder()
                .corporateUser(ceoUser)
                .account(savedAccount)
                .canView(true)
                .canInitiate(false)
                .canApprove(true)
                .approvalLimit(new BigDecimal("100000000.0000"))
                .status(CorporateAccessStatus.ACTIVE)
                .createdAt(now)
                .updatedAt(now)
                .updatedByType(UpdatedByType.STAFF)
                .updatedById(staff.getStaffId())
                .build();
        corporateAccountAccessRepository.save(ceoAccess);

        // MAKER: can_view = 1, can_initiate = 1, can_approve = 0
        CorporateAccountAccess makerAccess = CorporateAccountAccess.builder()
                .corporateUser(makerUser)
                .account(savedAccount)
                .canView(true)
                .canInitiate(true)
                .canApprove(false)
                .approvalLimit(new BigDecimal("100000000.0000"))
                .status(CorporateAccessStatus.ACTIVE)
                .createdAt(now)
                .updatedAt(now)
                .updatedByType(UpdatedByType.STAFF)
                .updatedById(staff.getStaffId())
                .build();
        corporateAccountAccessRepository.save(makerAccess);

        // Backward compatibility: account_signatories တွင်လည်း မှတ်တမ်းတင်ပေးခြင်း
        if (ceoCustomer != null) {
            AccountSignatories ceoSignatory = AccountSignatories.builder()
                    .account(savedAccount)
                    .customer(ceoCustomer)
                    .signatoryRole(SignatoryRole.PRIMARY_HOLDER)
                    .canInitiate(false)
                    .canApprove(true)
                    .status(SignatoryStatus.ACTIVE)
                    .build();
            accountSignatoriesRepository.save(ceoSignatory);
        }
        if (makerCustomer != null) {
            AccountSignatories accountantSignatory = AccountSignatories.builder()
                    .account(savedAccount)
                    .customer(makerCustomer)
                    .signatoryRole(SignatoryRole.JOINT_HOLDER)
                    .canInitiate(true)
                    .canApprove(false)
                    .status(SignatoryStatus.ACTIVE)
                    .build();
            accountSignatoriesRepository.save(accountantSignatory);
        }

        // 6. CEO ၏ Email သို့ အကောင့်နံပါတ်နှင့် Temporary Password ပို့ပေးခြင်း
        String targetEmail = (finalCeoEmail != null && !finalCeoEmail.isBlank())
                ? finalCeoEmail : company.getEmail();

        if (targetEmail != null && !targetEmail.isBlank()) {
            cusEmailService.sendAccountOpeningConfirmation(
                    targetEmail,
                    company.getFullName() + " (Attn: " + finalCeoFullName + " [CEO])",
                    savedAccount.getAccountNumber(),
                    savedAccount.getAccountType().name(),
                    rawCeoPassword
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

        List<Accounts> accounts = accountRepository.findByCustomer(customer);

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
                ? auth.getName() : null;

        if (currentStaffUsername != null) {
            var staffOpt = staffUsersRepository.findByUsername(currentStaffUsername);
            if (staffOpt.isPresent()) {
                return staffOpt.get();
            }
        }

        return staffUsersRepository.findByUsername("admin.nay")
                .or(() -> staffUsersRepository.findByUsername("teller.zin"))
                .or(() -> staffUsersRepository.findByUsername("admin"))
                .or(() -> staffUsersRepository.findAll().stream().findFirst())
                .orElseThrow(() -> new RuntimeException("No active staff record found in the system"));
    }

    private String generateUniqueAccountNumber(AccountType type) {
        String prefix = (type == AccountType.SAVINGS) ? "100" : "200";
        long randomNum = (long) (Math.random() * 9000000L) + 1000000L;
        return prefix + randomNum;
    }

    private String generateCorporateUserCode(String rolePrefix) {
        String datePart = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String code;
        do {
            int randomDigits = ThreadLocalRandom.current().nextInt(1000, 9999);
            code = "CORP-" + rolePrefix + "-" + datePart + "-" + randomDigits;
        } while (corporateUserRepository.existsByCorporateUserCode(code));
        return code;
    }


    private void recordInitialDepositTransaction(Accounts account, BigDecimal amount, StaffUsers staff, Customers customer) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return;
        }
        LocalDateTime now = LocalDateTime.now();
        String dateStr = now.format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String randSuffix = String.format("%04d", ThreadLocalRandom.current().nextInt(1000, 9999));
        String txnRef = "TXN-DEP-" + dateStr + "-" + randSuffix;

        BankTransactions transaction = BankTransactions.builder()
                .transactionRef(txnRef)
                .transactionType(TransactionType.OTC_DEPOSIT)
                .status(TransactionStatus.COMPLETED)
                .sourceAccount(null)
                .destinationAccount(account)
                .amount(amount)
                .serviceFee(BigDecimal.ZERO)
                .currency(account.getCurrency() != null ? account.getCurrency() : "MMK")
                .initiatedByType(staff != null ? InitiatedByType.STAFF : InitiatedByType.SYSTEM)
                .initiatedByStaff(staff)
                .initiatedByCustomer(customer)
                .channel(TransactionChannel.STAFF_PORTAL)
                .externalReference("INITIAL-OPENING-DEPOSIT")
                .description("Initial Opening Deposit for Account " + account.getAccountNumber())
                .auditNote("Initial deposit recorded automatically upon account creation by staff: " + (staff != null ? staff.getUsername() : "SYSTEM"))
                .initiatedAt(now)
                .completedAt(now)
                .authorizedAt(now)
                .updatedAt(now)
                .updatedByType(UpdatedByType.STAFF)
                .build();

        bankTransactionRepository.save(transaction);
    }

    private AccountResponseDTO mapToResponseDTO(Accounts account) {
        Customers customer = account.getCustomer();
        PersonalInfo personalInfo = customer != null ? customer.getPersonalInfo() : null;
        String phone = personalInfo != null && personalInfo.getPhone() != null
                ? personalInfo.getPhone()
                : (customer != null ? customer.getPhone() : null);
        return AccountResponseDTO.builder()
                .accountNumber(account.getAccountNumber())
                .accountType(account.getAccountType() != null ? account.getAccountType().name() : null)
                .accountCategory(account.getAccountCategory() != null ? account.getAccountCategory().name() : null)
                .isJointAccount(account.isJointAccount())
                .customerCode(customer != null ? customer.getCustomerCode() : null)
                .customerName(customer != null ? customer.getFullName() : null)
                .nrc(personalInfo != null ? personalInfo.getNrc() : null)
                .phone(phone)
                .profileImageUrl(personalInfo != null ? personalInfo.getProfileImageUrl() : null)
                .currentBalance(account.getCurrentBalance())
                .availableBalance(account.getAvailableBalance())
                .currency(account.getCurrency())
                .status(account.getStatus() != null ? account.getStatus().name() : null)
                .openedAt(account.getOpenedAt())
                .build();
    }
}