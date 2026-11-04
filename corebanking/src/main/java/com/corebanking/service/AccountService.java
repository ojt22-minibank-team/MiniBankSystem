package com.corebanking.service;

import com.corebanking.dto.AccessibleAccountDTO;
import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.AccountStatusUpdateDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.dto.DepositRequestDTO;
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
import com.corebanking.entity.enums.StaffUserStatus;
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
import com.corebanking.security.JwtService;
import com.corebanking.util.PasswordGeneratorUtil;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
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
    @Autowired(required = false)
    private AsyncNotificationService asyncNotificationService;
    private final CompanyInfoRepository companyInfoRepository;
    private final CorporateUserRepository corporateUserRepository;
    private final CorporateCredentialRepository corporateCredentialRepository;
    private final CorporateAccountAccessRepository corporateAccountAccessRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final AuditTrailService auditTrailService;

    @Autowired(required = false)
    private JwtService jwtService;

    
    @Transactional
    public AccountResponseDTO createAccount(AccountCreateDTO dto) {
        // Customer ရှိမရှိ စစ်ဆေးခြင်း
        Customers customer = customerRepository.findByCustomerCode(dto.getCustomerCode())
                .orElseThrow(() -> new RuntimeException("Customer not found with code: " + dto.getCustomerCode()));

        // Customer already holds an active account of this type check
        List<Accounts> existingAccounts = accountRepository.findByCustomerCustomerCode(customer.getCustomerCode());
        if (existingAccounts != null) {
            boolean hasDuplicate = existingAccounts.stream()
                    .anyMatch(a -> a.getAccountType() == dto.getAccountType() && a.getStatus() == AccountStatus.ACTIVE);
            if (hasDuplicate) {
                throw new IllegalStateException("Customer already holds an active " + dto.getAccountType() + " account");
            }
        }

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
                .dailyTransferLimit(null)
                .status(AccountStatus.ACTIVE)
                .openedAt(LocalDateTime.now())
                .createdByStaff(staff)
                .build();

        Accounts savedAccount = accountRepository.save(account);

        
        recordInitialDepositTransaction(savedAccount, initialDeposit, staff, customer);

        
        Optional<CustomerCredentials> existingCredOpt = customerCredentialsRepository.findByCustomerId(customer.getId());
        String rawPassword;
        if (existingCredOpt.isPresent()) {
            rawPassword = "(Existing Password Retained)";
        } else {
            rawPassword = generateSafeTemporaryPassword(8);
            String hashedPassword = passwordEncoder.encode(rawPassword);

            CustomerCredentials credentials = CustomerCredentials.builder()
                    .customerId(customer.getId())
                    .customer(customer)
                    .passwordHash(hashedPassword)
                    .transactionPinHash(null)
                    .mfaEnabled(true)
                    .mfaMethod(MfaMethod.EMAIL)
                    .mustChangePassword(true)
                    .failedLoginCount(0)
                    .failedPinAttemptCount(0)
                    .tokenVersion(1L)
                    .createdAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .updatedByType(UpdatedByType.STAFF)
                    .updatedById(staff.getStaffId())
                    .isNew(true)
                    .build();

            customerCredentialsRepository.save(credentials);
        }

        
        if (customer.getEmail() != null && !customer.getEmail().isBlank()) {
            cusEmailService.sendAccountOpeningConfirmation(
                    customer.getEmail(),
                    customer.getFullName(),
                    customer.getCustomerCode(),
                    savedAccount.getAccountNumber(),
                    savedAccount.getAccountType().name(),
                    rawPassword
            );
        }

        return mapToResponseDTO(savedAccount);
    }

   
    @Transactional
    public String createCorporateAccountWithExistingRoles(CorporateAccountCreateDTO dto) {
        Customers company = customerRepository.findByCustomerCode(dto.getCompanyCustomerCode())
                .orElseThrow(() -> new RuntimeException("Company record not found: " + dto.getCompanyCustomerCode()));

        if (company.getCustomerType() != CustomerType.COMPANY) {
            throw new IllegalArgumentException("Customer must be of type COMPANY");
        }

        
        List<Accounts> existingAccounts = accountRepository.findByCustomerCustomerCode(company.getCustomerCode());
        if (existingAccounts != null) {
            boolean hasCorporate = existingAccounts.stream()
                    .anyMatch(a -> a.getAccountCategory() == AccountCategory.CORPORATE && a.getStatus() == AccountStatus.ACTIVE);
            if (hasCorporate) {
                throw new IllegalStateException("Customer already holds an active CORPORATE account");
            }
        }

        CompanyInfo companyInfo = company.getCompanyInfo();
        if (companyInfo == null) {
            companyInfo = companyInfoRepository.findById(company.getCustomerId())
                    .orElseThrow(() -> new RuntimeException("Company info not found for customer: " + company.getCustomerCode()));
        }

        StaffUsers staff = getCurrentAuthenticatedStaff();
        LocalDateTime now = LocalDateTime.now();

        
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

        
        String rawCeoPassword = generateSafeTemporaryPassword(8);
        String rawMakerPassword = generateSafeTemporaryPassword(8);
        while (rawMakerPassword.equals(rawCeoPassword)) {
            rawMakerPassword = generateSafeTemporaryPassword(8);
        }

        String hashedCeoPassword = passwordEncoder.encode(rawCeoPassword);
        String hashedMakerPassword = passwordEncoder.encode(rawMakerPassword);

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
                .dailyTransferLimit(null)
                .status(AccountStatus.ACTIVE)
                .openedAt(now)
                .createdByStaff(staff)
                .build();

        Accounts savedAccount = accountRepository.save(account);

       
        recordInitialDepositTransaction(savedAccount, initialDeposit, staff, company);

       
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

        
        if (ceoCustomer != null) {
            AccountSignatories ceoSignatory = AccountSignatories.builder()
                    .account(savedAccount)
                    .accountNumber(savedAccount.getAccountNumber()) 
                    .customer(ceoCustomer)
                    .customerCode(ceoCustomer.getCustomerCode())
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
                    .accountNumber(savedAccount.getAccountNumber()) 
                    .customer(makerCustomer)
                    .customerCode(makerCustomer.getCustomerCode())
                    .signatoryRole(SignatoryRole.JOINT_HOLDER)
                    .canInitiate(true)
                    .canApprove(false)
                    .status(SignatoryStatus.ACTIVE)
                    .build();
            accountSignatoriesRepository.save(accountantSignatory);
        }

        
        String targetEmail = (finalCeoEmail != null && !finalCeoEmail.isBlank())
                ? finalCeoEmail : company.getEmail();

        if (targetEmail != null && !targetEmail.isBlank()) {
            cusEmailService.sendCorporateAccountCredentials(
                    targetEmail,
                    finalCeoFullName,
                    company.getFullName(),
                    company.getCustomerCode(),
                    ceoUser.getCorporateUserCode(),
                    "CEO / Authorizer",
                    savedAccount.getAccountNumber(),
                    savedAccount.getAccountType().name(),
                    rawCeoPassword
            );
        }

        String targetMakerEmail = (finalMakerEmail != null && !finalMakerEmail.isBlank())
                ? finalMakerEmail : company.getEmail();

        if (targetMakerEmail != null && !targetMakerEmail.isBlank()) {
            cusEmailService.sendCorporateAccountCredentials(
                    targetMakerEmail,
                    finalMakerFullName,
                    company.getFullName(),
                    company.getCustomerCode(),
                    makerUser.getCorporateUserCode(),
                    "Maker / Accountant",
                    savedAccount.getAccountNumber(),
                    savedAccount.getAccountType().name(),
                    rawMakerPassword
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

        StaffUsers staff = getCurrentAuthenticatedStaff();
        AccountStatus oldStatus = account.getStatus();
        account.setStatus(dto.getStatus());
        account.setUpdatedAt(LocalDateTime.now());
        if (staff != null) {
            account.setUpdatedByType(UpdatedByType.STAFF);
            account.setUpdatedById(staff.getStaffId());
        }

        Accounts updatedAccount = accountRepository.save(account);

        String staffIdentifier = (staff != null) ? staff.getUsername() : "STAFF";

        java.util.Map<String, Object> oldSnapshot = new java.util.LinkedHashMap<>();
        oldSnapshot.put("accountNumber", updatedAccount.getAccountNumber());
        oldSnapshot.put("status", oldStatus != null ? oldStatus.name() : "UNKNOWN");

        java.util.Map<String, Object> newSnapshot = new java.util.LinkedHashMap<>();
        newSnapshot.put("accountNumber", updatedAccount.getAccountNumber());
        newSnapshot.put("status", updatedAccount.getStatus().name());
        newSnapshot.put("updatedByStaff", staffIdentifier);
        if (dto.getReason() != null && !dto.getReason().isBlank()) {
            newSnapshot.put("reason", dto.getReason().trim());
        }

        String actionDesc = "Updated account status from " + oldStatus + " to " + updatedAccount.getStatus()
                + " for account " + updatedAccount.getAccountNumber() + " by staff " + staffIdentifier
                + (dto.getReason() != null && !dto.getReason().isBlank() ? " (Reason: " + dto.getReason().trim() + ")" : "");

        if (auditTrailService != null) auditTrailService.logDataChange(
                "ACCOUNT",
                dto.getStatus() == AccountStatus.CLOSED ? "CLOSE_ACCOUNT" : "UPDATE_ACCOUNT_STATUS",
                "ACCOUNT",
                updatedAccount.getAccountNumber(),
                oldSnapshot,
                newSnapshot,
                actionDesc
        );

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

        if (auditTrailService != null) auditTrailService.logDataChange(
                "ACCOUNT",
                "ADD_JOINT_HOLDER",
                "ACCOUNT",
                updatedAccount.getAccountNumber(),
                java.util.Map.of("isJointAccount", false),
                java.util.Map.of("isJointAccount", true, "jointCustomerCode", dto.getJointCustomerCode()),
                "Added joint holder " + dto.getJointCustomerCode() + " to account " + updatedAccount.getAccountNumber()
        );

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
                ? auth.getName() : null;

        if (currentStaffUsername != null) {
            var staffOpt = staffUsersRepository.findByUsername(currentStaffUsername);
            if (staffOpt.isPresent()) {
                return staffOpt.get();
            }
            try {
                UUID uuid = UUID.fromString(currentStaffUsername);
                var staffById = staffUsersRepository.findById(uuid);
                if (staffById.isPresent()) {
                    return staffById.get();
                }
            } catch (Exception ignored) {}
        }

        // Fallback: check HTTP request Authorization header if SecurityContext was not populated
        if (jwtService != null) {
            var requestOpt = com.corebanking.util.AuditContextUtil.getCurrentHttpRequest();
            if (requestOpt.isPresent()) {
                String authHeader = requestOpt.get().getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    String token = authHeader.substring(7).trim();
                    if (!token.isBlank() && jwtService.isTokenValid(token)) {
                        var claims = jwtService.extractAllClaims(token);
                        String staffIdStr = claims.get("staff_id", String.class);
                        if (staffIdStr != null && !staffIdStr.isBlank()) {
                            try {
                                UUID staffId = UUID.fromString(staffIdStr);
                                var staffById = staffUsersRepository.findById(staffId);
                                if (staffById.isPresent()) {
                                    return staffById.get();
                                }
                            } catch (Exception ignored) {}
                        }
                        String sub = claims.getSubject();
                        if (sub != null && !sub.isBlank()) {
                            var staffBySub = staffUsersRepository.findByUsername(sub);
                            if (staffBySub.isPresent()) {
                                return staffBySub.get();
                            }
                        }
                    }
                }
            }
        }

        return staffUsersRepository.findByUsername("admin.nay")
                .or(() -> staffUsersRepository.findByUsername("teller.zin"))
                .or(() -> staffUsersRepository.findByUsername("admin"))
                .or(() -> staffUsersRepository.findFirstByStatus(StaffUserStatus.ACTIVE))
                .orElse(null);
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

    private String generateSafeTemporaryPassword(int length) {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < length; i++) {
            int index = ThreadLocalRandom.current().nextInt(chars.length());
            sb.append(chars.charAt(index));
        }
        return sb.toString();
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

        BankTransactions savedTxn = bankTransactionRepository.save(transaction);
        if (customer != null && asyncNotificationService != null) {
            asyncNotificationService.sendDepositNotificationAsync(customer, account, savedTxn);
        }
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

   
    @Transactional
    public AccountResponseDTO depositFunds(DepositRequestDTO dto) {
        Accounts account;

        
        if (dto.getAccountNumber() != null && !dto.getAccountNumber().isBlank()) {
            account = accountRepository.findByAccountNumber(dto.getAccountNumber().trim())
                    .orElseThrow(() -> new RuntimeException("Account not found with number: " + dto.getAccountNumber()));
        } 
       
        else if (dto.getCustomerCode() != null && !dto.getCustomerCode().isBlank()) {
            List<Accounts> customerAccounts = accountRepository.findByCustomerCustomerCode(dto.getCustomerCode().trim());
            if (customerAccounts.isEmpty()) {
                throw new RuntimeException("No bank accounts found for customer code: " + dto.getCustomerCode());
            }
            
            account = customerAccounts.stream()
                    .filter(acc -> acc.getStatus() == AccountStatus.ACTIVE)
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("No active account found for customer code: " + dto.getCustomerCode()));
        } else {
            throw new IllegalArgumentException("Either accountNumber or customerCode must be provided for deposit.");
        }

        
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new IllegalStateException("Cannot deposit funds to an account that is " + account.getStatus());
        }

       
        BigDecimal currentBalance = (account.getCurrentBalance() != null) ? account.getCurrentBalance() : BigDecimal.ZERO;
        BigDecimal availableBalance = (account.getAvailableBalance() != null) ? account.getAvailableBalance() : BigDecimal.ZERO;

        BigDecimal updatedCurrentBalance = currentBalance.add(dto.getAmount());
        BigDecimal updatedAvailableBalance = availableBalance.add(dto.getAmount());

        account.setCurrentBalance(updatedCurrentBalance);
        account.setAvailableBalance(updatedAvailableBalance);
        account.setUpdatedAt(LocalDateTime.now());

        Accounts savedAccount = accountRepository.save(account);

        System.out.println("✅ Successfully deposited " + dto.getAmount() + " MMK into Account: " + savedAccount.getAccountNumber());

        return mapToResponseDTO(savedAccount);
    }

    
    @Transactional(readOnly = true)
    public List<AccessibleAccountDTO> getAccessibleAccountsForCustomer(String customerCode) {
        Customers customer = customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() -> new RuntimeException("Customer not found: " + customerCode));

        List<AccessibleAccountDTO> accountList = new ArrayList<>();

        
        List<Accounts> personalAccounts = accountRepository.findByCustomer(customer);
        for (Accounts acc : personalAccounts) {
            String accType = (acc.getAccountType() != null) ? acc.getAccountType().name() : "SAVINGS";
            String accCategory = (acc.getAccountCategory() != null) ? acc.getAccountCategory().name() : "RETAIL";

            accountList.add(AccessibleAccountDTO.builder()
                    .accountNumber(acc.getAccountNumber())
                    .accountType(accType)
                    .accountCategory(accCategory)
                    .companyName(null)
                    .role("OWNER")
                    .currentBalance(acc.getCurrentBalance() != null ? acc.getCurrentBalance() : BigDecimal.ZERO)
                    .availableBalance(acc.getAvailableBalance() != null ? acc.getAvailableBalance() : BigDecimal.ZERO)
                    .currency(acc.getCurrency())
                    .canInitiate(true)
                    .canApprove(true)
                    .build());
        }

        
        List<AccountSignatories> corporateSignatories = 
                accountSignatoriesRepository.findByCustomerAndStatus(customer, SignatoryStatus.ACTIVE);

        for (AccountSignatories sig : corporateSignatories) {
            Accounts compAcc = sig.getAccount();
            if (compAcc == null) {
                continue;
            }
            String companyName = (compAcc.getCustomer() != null) ? compAcc.getCustomer().getFullName() : null;
            String accType = (compAcc.getAccountType() != null) ? compAcc.getAccountType().name() : "CURRENT";
            String roleStr = (sig.getSignatoryRole() != null) ? sig.getSignatoryRole().name() : "SIGNATORY";

            accountList.add(AccessibleAccountDTO.builder()
                    .accountNumber(compAcc.getAccountNumber())
                    .accountType(accType)
                    .accountCategory("CORPORATE")
                    .companyName(companyName)
                    .role(roleStr)
                    .currentBalance(compAcc.getCurrentBalance() != null ? compAcc.getCurrentBalance() : BigDecimal.ZERO)
                    .availableBalance(compAcc.getAvailableBalance() != null ? compAcc.getAvailableBalance() : BigDecimal.ZERO)
                    .currency(compAcc.getCurrency())
                    .canInitiate(sig.isCanInitiate()) // Accountant ဆိုလျှင် true
                    .canApprove(sig.isCanApprove())   // CEO ဆိုလျှင် true
                    .build());
        }

        return accountList;
    }
}