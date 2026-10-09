package com.corebanking.service;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.AccountStatusUpdateDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.dto.DepositRequestDTO;
import com.corebanking.dto.JointHolderAddDTO;
import com.corebanking.entity.AccountSignatories;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CompanyContactPersons;
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
import com.corebanking.repository.CompanyContactPersonsRepository;
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
import java.util.List;

@Service
@RequiredArgsConstructor
public class AccountService {

    private final AccountRepository accountRepository;
    private final CustomerRepository customerRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final CusEmailService cusEmailService;
    private final AccountSignatoriesRepository accountSignatoriesRepository;
    private final CompanyContactPersonsRepository companyContactPersonsRepository; // 👈 Contact Persons Repository
    private final CustomerCredentialsRepository customerCredentialsRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * ၁။ Retail Account (Savings / Current) Creation
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

        // Account Details သာ ပါဝင်သော Email ကို ပို့ဆောင်ခြင်း (Password မပါပါ)
        if (customer.getEmail() != null && !customer.getEmail().isBlank()) {
            cusEmailService.sendAccountOpeningDetailsEmail(
                    customer.getEmail(),
                    customer.getFullName(),
                    savedAccount.getAccountNumber(),
                    savedAccount.getAccountType().name()
            );
        }

        return mapToResponseDTO(savedAccount);
    }

    /**
     * ၂။ Corporate Account Creation
     * (company_contact_persons ထဲသို့ CEO နှင့် Accountant အချက်အလက်များ ထည့်သွင်းပြီး သုံးဦးစလုံးထံ Email ပို့ခြင်း)
     */
    @Transactional
    public String createCorporateAccountWithExistingRoles(CorporateAccountCreateDTO dto) {
        // (က) Records များ စစ်ဆေးခြင်း
        Customers company = customerRepository.findByCustomerCode(dto.getCompanyCustomerCode())
                .orElseThrow(() -> new RuntimeException("Company record not found: " + dto.getCompanyCustomerCode()));

        if (company.getCustomerType() != CustomerType.COMPANY) {
            throw new IllegalArgumentException("Target entity must be of type COMPANY");
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

        // (ခ) Accounts ဇယားတွင် Corporate Account Record တည်ဆောက်ခြင်း
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

        // (ဂ) account_signatories ဇယားတွင် ချိတ်ဆက်ခြင်း (account_number နှင့် customer_code ပါဝင်သည်)
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

        AccountSignatories accountantSignatory = AccountSignatories.builder()
                .account(savedAccount)
                .accountNumber(savedAccount.getAccountNumber())
                .customer(accountantCustomer)
                .customerCode(accountantCustomer.getCustomerCode())
                .signatoryRole(SignatoryRole.JOINT_HOLDER)
                .canInitiate(true)
                .canApprove(false)
                .status(SignatoryStatus.ACTIVE)
                .build();

        accountSignatoriesRepository.save(ceoSignatory);
        accountSignatoriesRepository.save(accountantSignatory);

        // (ဃ) 🔒 [အဓိကပြင်ဆင်ချက်] company_contact_persons ဇယားထဲသို့ CEO နှင့် Accountant အား ထည့်သွင်းခြင်း
        CompanyContactPersons ceoContact = CompanyContactPersons.builder()
                .customerId(company.getCustomerId())
                .contactId(1)
                .companyInfo(company.getCompanyInfo())
                .fullName(ceoCustomer.getFullName())
                .position("Chief Executive Officer (CEO)")
                .phone(ceoCustomer.getPhone() != null ? ceoCustomer.getPhone() : company.getPhone())
                .email(ceoCustomer.getEmail() != null ? ceoCustomer.getEmail() : company.getEmail())
                .isPrimary(true) // CEO ကို Primary Contact အဖြစ် သတ်မှတ်ခြင်း
                .build();

        CompanyContactPersons accountantContact = CompanyContactPersons.builder()
                .customerId(company.getCustomerId())
                .contactId(2)
                .companyInfo(company.getCompanyInfo())
                .fullName(accountantCustomer.getFullName())
                .position("Corporate Accountant")
                .phone(accountantCustomer.getPhone() != null ? accountantCustomer.getPhone() : company.getPhone())
                .email(accountantCustomer.getEmail() != null ? accountantCustomer.getEmail() : company.getEmail())
                .isPrimary(false)
                .build();

        companyContactPersonsRepository.save(ceoContact);
        companyContactPersonsRepository.save(accountantContact);

        // (င) CEO Credentials ထုတ်ယူသိမ်းဆည်းခြင်း
        String ceoRawPassword = PasswordGeneratorUtil.generateTemporaryPassword(8);
        CustomerCredentials ceoCred = customerCredentialsRepository.findByCustomerId(ceoCustomer.getId())
                .orElseGet(() -> {
                    CustomerCredentials newCred = new CustomerCredentials();
                    newCred.setCustomerId(ceoCustomer.getId());
                    return newCred;
                });
        ceoCred.setPasswordHash(passwordEncoder.encode(ceoRawPassword));
        ceoCred.setUpdatedAt(LocalDateTime.now());
        customerCredentialsRepository.save(ceoCred);

        // (စ) Accountant Credentials ထုတ်ယူသိမ်းဆည်းခြင်း
        String accRawPassword = PasswordGeneratorUtil.generateTemporaryPassword(8);
        CustomerCredentials accCred = customerCredentialsRepository.findByCustomerId(accountantCustomer.getId())
                .orElseGet(() -> {
                    CustomerCredentials newCred = new CustomerCredentials();
                    newCred.setCustomerId(accountantCustomer.getId());
                    return newCred;
                });
        accCred.setPasswordHash(passwordEncoder.encode(accRawPassword));
        accCred.setUpdatedAt(LocalDateTime.now());
        customerCredentialsRepository.save(accCred);

        // (ဆ) 🔒 Email (၃) စောင်စလုံး သီးခြားစီ တိကျစွာ ပို့ဆောင်ပေးခြင်း

        // ၁။ Company Official Email သို့ ပို့ခြင်း
        if (company.getEmail() != null && !company.getEmail().isBlank()) {
            try {
                cusEmailService.sendCorporateAccountOpeningToCompany(
                        company.getEmail().trim(),
                        company.getFullName(),
                        company.getCustomerCode(),
                        savedAccount.getAccountNumber(),
                        savedAccount.getAccountType().name()
                );
            } catch (Exception e) {
                System.err.println("Company email error: " + e.getMessage());
            }
        }

        // ၂။ CEO ထံသို့ Approver Credentials Email ပို့ခြင်း
        if (ceoCustomer.getEmail() != null && !ceoCustomer.getEmail().isBlank()) {
            try {
                cusEmailService.sendCorporateSignatoryWelcome(
                        ceoCustomer.getEmail().trim(),
                        ceoCustomer.getFullName(),
                        "Approver (CEO)",
                        company.getFullName(),
                        ceoCustomer.getCustomerCode(),
                        savedAccount.getAccountNumber(),
                        savedAccount.getAccountType().name(),
                        ceoRawPassword
                );
            } catch (Exception e) {
                System.err.println("CEO email error: " + e.getMessage());
            }
        }

        // ၃။ Accountant ထံသို့ Maker Credentials Email ပို့ခြင်း
        if (accountantCustomer.getEmail() != null && !accountantCustomer.getEmail().isBlank()) {
            try {
                cusEmailService.sendCorporateSignatoryWelcome(
                        accountantCustomer.getEmail().trim(),
                        accountantCustomer.getFullName(),
                        "Maker (Accountant)",
                        company.getFullName(),
                        accountantCustomer.getCustomerCode(),
                        savedAccount.getAccountNumber(),
                        savedAccount.getAccountType().name(),
                        accRawPassword
            );
            } catch (Exception e) {
                System.err.println("Accountant email error: " + e.getMessage());
            }
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
}