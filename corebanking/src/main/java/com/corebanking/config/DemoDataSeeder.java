package com.corebanking.config;

import com.corebanking.entity.AccountHolds;
import com.corebanking.entity.AccountSignatories;
import com.corebanking.entity.AccountStatusHistory;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.Announcements;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Beneficiaries;
import com.corebanking.entity.CompanyContactPersons;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.FeeSchedules;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.LedgerAccounts;
import com.corebanking.entity.LedgerEntries;
import com.corebanking.entity.LoginAttempt;
import com.corebanking.entity.ManualTransactions;
import com.corebanking.entity.Notifications;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.Permissions;
import com.corebanking.entity.PersonalInfo;
import com.corebanking.entity.RolePermissions;
import com.corebanking.entity.Roles;
import com.corebanking.entity.StaffUserRoles;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.SystemParameters;
import com.corebanking.entity.TransactionApprovals;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountClass;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.AnnouncementAudience;
import com.corebanking.entity.enums.ApprovalStatus;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.DeliveryChannel;
import com.corebanking.entity.enums.EntryType;
import com.corebanking.entity.enums.FeeType;
import com.corebanking.entity.enums.GenderType;
import com.corebanking.entity.enums.HoldStatus;
import com.corebanking.entity.enums.HoldType;
import com.corebanking.entity.enums.InitiatedByType;
import com.corebanking.entity.enums.LedgerAccountStatus;
import com.corebanking.entity.enums.LedgerScope;
import com.corebanking.entity.enums.ManualOperationType;
import com.corebanking.entity.enums.MfaMethod;
import com.corebanking.entity.enums.NotificationType;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.SignatoryRole;
import com.corebanking.entity.enums.SignatoryStatus;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.entity.enums.TransactionChannel;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.repository.AccountHoldsRepository;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.AccountSignatoriesRepository;
import com.corebanking.repository.AccountStatusHistoryRepository;
import com.corebanking.repository.AnnouncementsRepository;
import com.corebanking.repository.BankTransactionRepository;
import com.corebanking.repository.BeneficiariesRepository;
import com.corebanking.repository.CompanyContactPersonsRepository;
import com.corebanking.repository.CompanyInfoRepository;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusJwtRevokedTokensRepository;
import com.corebanking.repository.CusLoginAttemptsRepository;
import com.corebanking.repository.CusOtpChallengesRepository;
import com.corebanking.repository.CustomerCredentialsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.FeeScheduleRepository;
import com.corebanking.repository.LedgerAccountRepository;
import com.corebanking.repository.LedgerEntryRepository;
import com.corebanking.repository.ManualTransactionsRepository;
import com.corebanking.repository.NotificationRepository;
import com.corebanking.repository.PermissionsRepository;
import com.corebanking.repository.PersonalInfoRepository;
import com.corebanking.repository.RolePermissionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffUserRolesRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.repository.SystemParametersRepository;
import com.corebanking.repository.TransactionApprovalsRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnExpression;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.UUID;

/**
 * Unified Core Banking Master Data Seeder:
 * Combines SampleDataSeeder and DemoDataSeeder into a single coordinated pipeline.
 *
 * Seeds:
 *  - RBAC (Roles & Permissions)
 *  - Staff users (admin.nay, teller.zin) & Role assignments
 *  - 3,000 Customers (Retail & Corporate)
 *  - 3,030 Bank Accounts (Active, Dormant, Frozen, Closed)
 *  - 10,000 Bank Transactions with realistic distribution
 *  - Full demo data (Ledger, KYC, Credentials, Beneficiaries, Approvals, Holds, Rules, Announcements)
 *
 * Configured via:
 *   app.seed.enabled=true (or app.seed.sample-data.enabled / app.seed.demo-data.enabled)
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnExpression("${app.seed.enabled:false} or ${app.seed.sample-data.enabled:false} or ${app.seed.demo-data.enabled:false}")
public class DemoDataSeeder implements CommandLineRunner {

    private static final String SEED_STAFF_NO = "STF-001";
    private static final String SEED_PASSWORD = "Password@123";
    private static final String CORPORATE_CUSTOMER_CODE = "CUS-003";

    private static final int TARGET_CUSTOMERS = 3000;
    private static final int TARGET_TRANSACTIONS = 10000;
    private static final int[] ANCHOR_REFS = {1, 3, 4, 29, 50};

    /** Balances (MMK) for the 30 anchor ACTIVE accounts. */
    private static final BigDecimal[] ACTIVE_BALANCES = {
            BigDecimal.valueOf(45), BigDecimal.valueOf(550), BigDecimal.valueOf(1200),
            BigDecimal.valueOf(2500), BigDecimal.valueOf(4800), BigDecimal.valueOf(8500),
            BigDecimal.valueOf(15000), BigDecimal.valueOf(32000), BigDecimal.valueOf(75000),
            BigDecimal.valueOf(150000), BigDecimal.valueOf(280000), BigDecimal.valueOf(500000),
            BigDecimal.valueOf(780000), BigDecimal.valueOf(1200000), BigDecimal.valueOf(3500000),
            BigDecimal.valueOf(70), BigDecimal.valueOf(880), BigDecimal.valueOf(3300),
            BigDecimal.valueOf(6700), BigDecimal.valueOf(18000), BigDecimal.valueOf(22000),
            BigDecimal.valueOf(48000), BigDecimal.valueOf(95000), BigDecimal.valueOf(210000),
            BigDecimal.valueOf(430000), BigDecimal.valueOf(650000), BigDecimal.valueOf(1500000),
            BigDecimal.valueOf(2200000), BigDecimal.valueOf(10), BigDecimal.valueOf(320)
    };

    private static final BigDecimal[] DORMANT_BALANCES = {
            BigDecimal.valueOf(25), BigDecimal.valueOf(400), BigDecimal.valueOf(1100),
            BigDecimal.valueOf(5500), BigDecimal.valueOf(12000), BigDecimal.valueOf(55000),
            BigDecimal.valueOf(120000), BigDecimal.valueOf(350000), BigDecimal.valueOf(800000),
            BigDecimal.valueOf(1100000)
    };

    private static final BigDecimal[] FROZEN_BALANCES = {
            BigDecimal.valueOf(80), BigDecimal.valueOf(700), BigDecimal.valueOf(1800),
            BigDecimal.valueOf(4200), BigDecimal.valueOf(9000), BigDecimal.valueOf(22000),
            BigDecimal.valueOf(68000), BigDecimal.valueOf(140000), BigDecimal.valueOf(320000),
            BigDecimal.valueOf(600000), BigDecimal.valueOf(1000000), BigDecimal.valueOf(2500000)
    };

    private final StaffUsersRepository staffUsersRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final PersonalInfoRepository personalInfoRepository;
    private final CustomerCredentialsRepository customerCredentialsRepository;
    private final CompanyInfoRepository companyInfoRepository;
    private final CompanyContactPersonsRepository companyContactPersonsRepository;
    private final RolesRepository rolesRepository;
    private final PermissionsRepository permissionsRepository;
    private final RolePermissionsRepository rolePermissionsRepository;
    private final StaffUserRolesRepository staffUserRolesRepository;
    private final AnnouncementsRepository announcementsRepository;
    private final NotificationRepository notificationRepository;
    private final FeeScheduleRepository feeScheduleRepository;
    private final LedgerAccountRepository ledgerAccountRepository;
    private final LedgerEntryRepository ledgerEntryRepository;
    private final BeneficiariesRepository beneficiariesRepository;
    private final AccountSignatoriesRepository accountSignatoriesRepository;
    private final AccountStatusHistoryRepository accountStatusHistoryRepository;
    private final AccountHoldsRepository accountHoldsRepository;
    private final TransactionApprovalsRepository transactionApprovalsRepository;
    private final ManualTransactionsRepository manualTransactionsRepository;
    private final CusAuthSessionsRepository authSessionsRepository;
    private final CusLoginAttemptsRepository loginAttemptsRepository;
    private final CusOtpChallengesRepository otpChallengesRepository;
    private final CusJwtRevokedTokensRepository jwtRevokedTokensRepository;
    private final SystemParametersRepository systemParametersRepository;
    private final CusAuditLogsRepository auditLogsRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (rolesRepository.count() > 0
                && customerRepository.count() >= TARGET_CUSTOMERS
                && bankTransactionRepository.count() >= TARGET_TRANSACTIONS) {
            log.info("[DemoDataSeeder] Master seed data already present (roles: {}, customers: {}, transactions: {}) - skipping.",
                    rolesRepository.count(), customerRepository.count(), bankTransactionRepository.count());
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        log.info("[DemoDataSeeder] Seeding unified data (3,000 customers, 10,000 transactions, full system demo data) ...");

        // 1. RBAC (Roles & Permissions)
        seedRolesAndPermissions(now);

        // 2. Base Staff Users (admin.nay, teller.zin) & Role Assignments
        seedStaffUsers(now);
        seedStaffRoles(now);

        // 3. 3,000 Customers & 3,030 Bank Accounts
        List<Accounts> activeAccounts = seedCustomersAndAccounts(now);

        // 4. Corporate Customer & Profile
        seedCorporateCustomer(now);

        // 5. Customer Profiles (KYC / Personal Info)
        seedCustomerProfiles(now);

        // 6. Customer Credentials
        seedCustomerCredentials(now);

        // 7. Ledger Accounts
        seedLedgerAccounts(now);

        // 8. 10,000 Bank Transactions
        seedTransactions(activeAccounts, now);

        // 9. Ledger Entries (referencing transactions)
        seedLedgerEntries(now);

        // 10. Audit Logs
        seedAuditLogs(now);

        // 11. Additional Banking Subsystems
        seedBeneficiaries(now);
        seedSignatories(now);
        seedStatusHistory(now);
        seedHolds(now);
        seedTransactionApprovals(now);
        seedManualTransactions(now);
        seedAuthSessions(now);
        seedLoginAttempts(now);
        seedOtpChallenges(now);
        seedJwtRevokedTokens(now);
        seedAnnouncements(now);
        seedNotifications(now);
        seedFeeSchedules(now);
        seedSystemParameters(now);

        log.info("[DemoDataSeeder] Completed! Seeded: {} staff, {} customers, {} accounts, {} transactions, {} audit logs.",
                staffUsersRepository.count(), customerRepository.count(), accountRepository.count(),
                bankTransactionRepository.count(), auditLogsRepository.count());
    }

    // ------------------------------------------------------------------
    // Core Base Entities: Staff, Customers & Accounts
    // ------------------------------------------------------------------

    private void seedStaffUsers(LocalDateTime now) {
        if (staffUsersRepository.existsByStaffNo(SEED_STAFF_NO)) {
            return;
        }
        StaffUsers staff1 = StaffUsers.builder()
                .staffNo("STF-001")
                .username("admin.nay")
                .fullName("Nay Min Thant")
                .email("nay@corebank.local")
                .phone("09-111-111-01")
                .passwordHash(passwordEncoder.encode(SEED_PASSWORD))
                .mustChangePassword(false)
                .status(StaffUserStatus.ACTIVE)
                .failedLoginCount(0)
                .tokenVersion(1L)
                .createdAt(now.minusDays(90))
                .updatedAt(now.minusDays(90))
                .build();

        StaffUsers staff2 = StaffUsers.builder()
                .staffNo("STF-002")
                .username("teller.zin")
                .fullName("Zin Myo Oo")
                .email("zin@corebank.local")
                .phone("09-111-111-02")
                .passwordHash(passwordEncoder.encode(SEED_PASSWORD))
                .mustChangePassword(false)
                .status(StaffUserStatus.ACTIVE)
                .failedLoginCount(0)
                .tokenVersion(1L)
                .createdAt(now.minusDays(60))
                .updatedAt(now.minusDays(60))
                .build();

        staffUsersRepository.saveAllAndFlush(List.of(staff1, staff2));
        log.info("[DemoDataSeeder] Seeded base staff users STF-001 and STF-002.");
    }

    private List<Accounts> seedCustomersAndAccounts(LocalDateTime now) {
        StaffUsers staff1 = staff("admin.nay");
        Random random = new Random(20260101L);

        String[] firstNames = {
                "Aung", "Min", "Kyaw", "Thant", "Zin", "Soe", "Myo", "Htun", "Zaw", "Naing",
                "Thein", "Lin", "San", "Moe", "Phyo", "Wai", "Zayar", "Nay", "Khin", "Su",
                "Hlaing", "Aye", "Thida", "Nilar", "Ei", "May", "Thinzar", "Yu", "Cho", "Win",
                "Hnin", "Yadanar", "Phoo", "Khaing", "Nwe", "Yamin", "Shwe", "Wint", "Chit"
        };
        String[] middleNames = {
                "Myat", "Zin", "Moe", "Kyaw", "Min", "Ko", "Htun", "Naing", "Soe", "Win",
                "San", "Thein", "Aung", "Lin", "Thu", "Mon", "Swe", "Oo", "Htet", "Phyo"
        };
        String[] lastNames = {
                "Htun", "Oo", "Win", "Lwin", "Aung", "Kyaw", "Zaw", "Myint", "Thant", "Soe",
                "Naing", "Thein", "Lin", "San", "Moe", "Khaing", "Swe", "Nyein", "Aye", "Shein"
        };

        // 1. Seed 3,000 Customers
        List<Customers> customers = new ArrayList<>(TARGET_CUSTOMERS);
        if (customerRepository.count() < TARGET_CUSTOMERS) {
            Customers cust1 = Customers.builder()
                    .customerCode("CUS-001")
                    .customerType(CustomerType.PERSONAL)
                    .fullName("Kyaw Zin Htun")
                    .email("kyaw@mail.local")
                    .phone("09-200-000-01")
                    .status(CustomerStatus.ACTIVE)
                    .createdBy(staff1)
                    .createdAt(now.minusDays(80))
                    .updatedAt(now.minusDays(80))
                    .isNew(true)
                    .build();

            Customers cust2 = Customers.builder()
                    .customerCode("CUS-002")
                    .customerType(CustomerType.PERSONAL)
                    .fullName("Su Myat Noe")
                    .email("su@mail.local")
                    .phone("09-200-000-02")
                    .status(CustomerStatus.ACTIVE)
                    .createdBy(staff1)
                    .createdAt(now.minusDays(70))
                    .updatedAt(now.minusDays(70))
                    .isNew(true)
                    .build();

            customers.add(cust1);
            customers.add(cust2);

            for (int i = 4; i <= TARGET_CUSTOMERS + 1; i++) {
                String code = String.format("CUS-%04d", i);
                String fn = firstNames[random.nextInt(firstNames.length)];
                String mn = middleNames[random.nextInt(middleNames.length)];
                String ln = lastNames[random.nextInt(lastNames.length)];
                String name = fn + " " + mn + " " + ln;
                String email = String.format("customer%04d@mail.local", i);
                String phone = String.format("09%09d", 200000000L + i);
                LocalDateTime created = now.minusDays(random.nextInt(85) + 5);

                customers.add(Customers.builder()
                        .customerCode(code)
                        .customerType(CustomerType.PERSONAL)
                        .fullName(name)
                        .email(email)
                        .phone(phone)
                        .status(CustomerStatus.ACTIVE)
                        .createdBy(staff1)
                        .createdAt(created)
                        .updatedAt(created)
                        .isNew(true)
                        .build());
            }

            for (int i = 0; i < customers.size(); i += 500) {
                int end = Math.min(i + 500, customers.size());
                customerRepository.saveAllAndFlush(customers.subList(i, end));
            }
            log.info("[DemoDataSeeder] Seeded {} customers in batches.", customers.size());
        } else {
            customers = customerRepository.findAll();
        }

        Customers cust1 = customerRepository.findByCustomerCode("CUS-001").orElse(customers.get(0));
        Customers cust2 = customerRepository.findByCustomerCode("CUS-002").orElse(customers.get(1));

        // 2. Seed Accounts
        List<Accounts> activeAccounts = new ArrayList<>();
        if (accountRepository.count() < TARGET_CUSTOMERS) {
            List<Accounts> allAccounts = new ArrayList<>(TARGET_CUSTOMERS + 40);

            // 30 Anchor ACTIVE accounts
            for (int i = 0; i < 30; i++) {
                allAccounts.add(newAccount(String.format("100100%04d", i + 1),
                        indexIn(i, 10, 15, 23, 26) ? AccountType.CURRENT : AccountType.SAVINGS,
                        ACTIVE_BALANCES[i], ACTIVE_BALANCES[i], AccountStatus.ACTIVE,
                        i % 2 == 0 ? cust1 : cust2, staff1,
                        now.minusDays(30 - i), null));
            }

            // 10 Anchor DORMANT accounts
            for (int i = 0; i < 10; i++) {
                allAccounts.add(newAccount(String.format("100200%04d", i + 1),
                        (i == 4 || i == 5) ? AccountType.CURRENT : AccountType.SAVINGS,
                        DORMANT_BALANCES[i], DORMANT_BALANCES[i], AccountStatus.DORMANT,
                        i % 2 == 0 ? cust1 : cust2, staff1,
                        now.minusDays(60 - i * 5L), null));
            }

            // 12 Anchor FROZEN accounts
            for (int i = 0; i < 12; i++) {
                allAccounts.add(newAccount(String.format("100300%04d", i + 1),
                        (i == 4 || i == 5) ? AccountType.CURRENT : AccountType.SAVINGS,
                        FROZEN_BALANCES[i], BigDecimal.ZERO, AccountStatus.FROZEN,
                        i % 2 == 0 ? cust1 : cust2, staff1,
                        now.minusDays(75 - i * 5L), null));
            }

            // 8 Anchor CLOSED accounts
            for (int i = 0; i < 8; i++) {
                allAccounts.add(newAccount(String.format("100400%04d", i + 1),
                        i < 4 ? AccountType.SAVINGS : AccountType.CURRENT,
                        BigDecimal.ZERO, BigDecimal.ZERO, AccountStatus.CLOSED,
                        i % 2 == 0 ? cust1 : cust2, staff1,
                        now.minusDays(90 - i * 5L), now.minusDays(10 - i)));
            }

            // Generated accounts for customers from index 2 up to TARGET_CUSTOMERS - 1
            for (int i = 2; i < customers.size(); i++) {
                Customers c = customers.get(i);
                BigDecimal bal = BigDecimal.valueOf(10000 + (long) random.nextInt(50000) * 1000);
                allAccounts.add(newAccount(String.format("100100%04d", i + 29),
                        (i % 5 == 0) ? AccountType.CURRENT : AccountType.SAVINGS,
                        bal, bal, AccountStatus.ACTIVE,
                        c, staff1,
                        c.getCreatedAt(), null));
            }

            for (int i = 0; i < allAccounts.size(); i += 500) {
                int end = Math.min(i + 500, allAccounts.size());
                accountRepository.saveAllAndFlush(allAccounts.subList(i, end));
            }
            log.info("[DemoDataSeeder] Seeded {} accounts in batches.", allAccounts.size());
        }

        activeAccounts = accountRepository.findByStatus(AccountStatus.ACTIVE);
        return activeAccounts;
    }

    private Accounts newAccount(String accountNumber, AccountType type,
                                BigDecimal currentBalance, BigDecimal availableBalance,
                                AccountStatus status, Customers customer, StaffUsers staff,
                                LocalDateTime openedAt, LocalDateTime closedAt) {
        return Accounts.builder()
                .accountNumber(accountNumber)
                .customer(customer)
                .accountCategory(AccountCategory.RETAIL)
                .accountType(type)
                .requiredApprovals((short) 1)
                .currency("MMK")
                .currentBalance(currentBalance.setScale(4, RoundingMode.HALF_UP))
                .availableBalance(availableBalance.setScale(4, RoundingMode.HALF_UP))
                .minimumBalance(BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP))
                .status(status)
                .openedAt(openedAt)
                .closedAt(closedAt)
                .createdByStaff(staff)
                .createdAt(openedAt)
                .updatedAt(LocalDateTime.now())
                .build();
    }

    private boolean indexIn(int i, int... bounds) {
        for (int b = 0; b < bounds.length; b += 2) {
            if (i >= bounds[b] && i < bounds[b + 1]) {
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------------------------
    // Bank Transactions (10,000 Transactions)
    // ------------------------------------------------------------------

    private void seedTransactions(List<Accounts> active, LocalDateTime now) {
        if (bankTransactionRepository.count() >= TARGET_TRANSACTIONS) {
            return;
        }
        StaffUsers staff1 = staff("admin.nay");
        List<BankTransactions> transactions = new ArrayList<>(TARGET_TRANSACTIONS);

        // Fixed Anchor Rows (Required by Demo Data: REF-T001, REF-T003, REF-T004, REF-T029, REF-T050)
        transactions.add(transaction("REF-T001", TransactionType.INTERNAL_TRANSFER,
                TransactionStatus.COMPLETED, active.get(0), active.get(1),
                BigDecimal.valueOf(5000), true, now.minusDays(30), staff1));
        transactions.add(transaction("REF-T003", TransactionType.OTC_DEPOSIT,
                TransactionStatus.COMPLETED, null, active.get(0),
                BigDecimal.valueOf(8000), false, now.minusDays(30), staff1));
        transactions.add(transaction("REF-T004", TransactionType.OTC_WITHDRAWAL,
                TransactionStatus.COMPLETED, active.get(2), null,
                BigDecimal.valueOf(3000), true, now.minusDays(30), staff1));
        transactions.add(transaction("REF-T029", TransactionType.INTERNAL_TRANSFER,
                TransactionStatus.PENDING_AUTHORIZATION, active.get(4), active.get(2),
                BigDecimal.valueOf(25000), true, now.minusDays(13), staff1));
        transactions.add(transaction("REF-T050", TransactionType.EXTERNAL_PAYMENT,
                TransactionStatus.PENDING_AUTHORIZATION, active.get(2), null,
                BigDecimal.valueOf(28000), true, now.minusHours(4), staff1));

        TransactionType[] typeMix = weightedTypeMix();
        Random random = new Random(20260101L);
        int totalActive = active.size();

        for (int ref = 2; ref <= TARGET_TRANSACTIONS; ref++) {
            if (isAnchorRef(ref)) {
                continue;
            }

            TransactionType type = typeMix[random.nextInt(typeMix.length)];
            TransactionStatus status = randomStatus(type, random);

            long minutesAgo = (long) (random.nextDouble() * 90 * 24 * 60);
            LocalDateTime at = now.minusMinutes(minutesAgo);

            int sourceIndex = random.nextInt(totalActive);
            int destinationIndex = (sourceIndex + 1 + random.nextInt(totalActive - 1)) % totalActive;

            Accounts source;
            Accounts destination;
            BigDecimal amount;
            boolean chargeFee;

            if (type == TransactionType.OTC_DEPOSIT) {
                source = null;
                destination = active.get(sourceIndex);
                amount = randomAmount(random, 1_000, 2_000_000);
                chargeFee = false;
            } else if (type == TransactionType.OTC_WITHDRAWAL) {
                source = active.get(sourceIndex);
                destination = null;
                amount = randomAmount(random, 1_000, 1_000_000);
                chargeFee = false;
            } else if (type == TransactionType.EXTERNAL_PAYMENT) {
                source = active.get(sourceIndex);
                destination = null;
                amount = randomAmount(random, 500, 500_000);
                chargeFee = true;
            } else if (type == TransactionType.REFUND) {
                source = null;
                destination = active.get(sourceIndex);
                amount = randomAmount(random, 500, 200_000);
                chargeFee = false;
            } else if (type == TransactionType.LEDGER_ADJUSTMENT) {
                boolean debit = random.nextBoolean();
                source = debit ? active.get(sourceIndex) : null;
                destination = debit ? null : active.get(sourceIndex);
                amount = randomAmount(random, 100, 100_000);
                chargeFee = false;
            } else { // INTERNAL_TRANSFER
                source = active.get(sourceIndex);
                destination = active.get(destinationIndex);
                amount = randomAmount(random, 1_000, 3_000_000);
                chargeFee = true;
            }

            String refStr = ref < 1000 ? String.format("REF-T%03d", ref) : String.format("REF-T%05d", ref);
            transactions.add(transaction(refStr, type, status, source, destination, amount, chargeFee, at, staff1));
        }

        // Save in batches of 1,000
        for (int i = 0; i < transactions.size(); i += 1000) {
            int end = Math.min(i + 1000, transactions.size());
            bankTransactionRepository.saveAllAndFlush(transactions.subList(i, end));
        }
        log.info("[DemoDataSeeder] Seeded {} bank transactions in batches.", transactions.size());
    }

    private boolean isAnchorRef(int ref) {
        for (int anchor : ANCHOR_REFS) {
            if (anchor == ref) {
                return true;
            }
        }
        return false;
    }

    private TransactionType[] weightedTypeMix() {
        List<TransactionType> mix = new ArrayList<>(100);
        for (int i = 0; i < 30; i++) mix.add(TransactionType.INTERNAL_TRANSFER);
        for (int i = 0; i < 20; i++) mix.add(TransactionType.OTC_DEPOSIT);
        for (int i = 0; i < 20; i++) mix.add(TransactionType.OTC_WITHDRAWAL);
        for (int i = 0; i < 15; i++) mix.add(TransactionType.EXTERNAL_PAYMENT);
        for (int i = 0; i < 8; i++) mix.add(TransactionType.REFUND);
        for (int i = 0; i < 7; i++) mix.add(TransactionType.LEDGER_ADJUSTMENT);
        return mix.toArray(new TransactionType[0]);
    }

    private TransactionStatus randomStatus(TransactionType type, Random random) {
        int roll = random.nextInt(100);
        if (type == TransactionType.INTERNAL_TRANSFER) {
            if (roll < 82) return TransactionStatus.COMPLETED;
            if (roll < 88) return TransactionStatus.FAILED;
            if (roll < 92) return TransactionStatus.CANCELLED;
            if (roll < 97) return TransactionStatus.PENDING_AUTHORIZATION;
            return TransactionStatus.REJECTED;
        }
        if (type == TransactionType.OTC_DEPOSIT || type == TransactionType.OTC_WITHDRAWAL) {
            if (roll < 92) return TransactionStatus.COMPLETED;
            if (roll < 97) return TransactionStatus.CANCELLED;
            return TransactionStatus.FAILED;
        }
        if (type == TransactionType.EXTERNAL_PAYMENT) {
            if (roll < 80) return TransactionStatus.COMPLETED;
            if (roll < 87) return TransactionStatus.PENDING_AUTHORIZATION;
            if (roll < 94) return TransactionStatus.FAILED;
            return TransactionStatus.CANCELLED;
        }
        if (type == TransactionType.REFUND) {
            return roll < 95 ? TransactionStatus.COMPLETED : TransactionStatus.CANCELLED;
        }
        return roll < 95 ? TransactionStatus.COMPLETED : TransactionStatus.PENDING_AUTHORIZATION;
    }

    private BigDecimal randomAmount(Random random, long minInclusive, long maxInclusive) {
        long span = maxInclusive - minInclusive + 1;
        long value = minInclusive + (long) (random.nextDouble() * span);
        return BigDecimal.valueOf((value / 100) * 100);
    }

    private BankTransactions transaction(String transactionRef, TransactionType type, TransactionStatus status,
                                         Accounts source, Accounts destination, BigDecimal amount,
                                         boolean chargeFee, LocalDateTime at, StaffUsers staff) {
        BigDecimal fee = chargeFee
                ? amount.multiply(new BigDecimal("0.01")).setScale(4, RoundingMode.HALF_UP)
                : BigDecimal.ZERO.setScale(4, RoundingMode.HALF_UP);

        boolean completed = status == TransactionStatus.COMPLETED;
        boolean settled = completed || status == TransactionStatus.FAILED
                || status == TransactionStatus.CANCELLED;

        return BankTransactions.builder()
                .transactionRef(transactionRef)
                .transactionType(type)
                .status(status)
                .sourceAccount(source)
                .destinationAccount(destination)
                .amount(amount.setScale(4, RoundingMode.HALF_UP))
                .serviceFee(fee)
                .currency("MMK")
                .initiatedByType(InitiatedByType.STAFF)
                .initiatedByStaff(staff)
                .channel(TransactionChannel.STAFF_PORTAL)
                .description(type + " seed " + transactionRef)
                .initiatedAt(at)
                .authorizedAt(settled ? at : null)
                .completedAt(completed ? at : null)
                .updatedAt(at)
                .build();
    }

    // ------------------------------------------------------------------
    // Audit Logs (100 Rows)
    // ------------------------------------------------------------------

    private void seedAuditLogs(LocalDateTime now) {
        if (auditLogsRepository.count() > 0) {
            return;
        }
        StaffUsers staff1 = staff("admin.nay");
        StaffUsers staff2 = staff("teller.zin");
        String[] actions = {
                "STAFF_LOGIN", "CREATE_ACCOUNT", "APPROVE_TRANSACTION", "REJECT_TRANSACTION",
                "FREEZE_ACCOUNT", "UNFREEZE_ACCOUNT", "CLOSE_ACCOUNT"
        };
        String[] entityTypes = {"AUTH_SESSION", "ACCOUNT", "TRANSACTION"};

        List<AuditLogs> logs = new ArrayList<>();
        for (int i = 0; i < 100; i++) {
            String action = actions[i % actions.length];
            String entityType = entityTypes[i % entityTypes.length];
            String entityId = action.startsWith("STAFF_LOGIN") ? ""
                    : String.format("%08d", 10000000 + i);
            StaffUsers actor = (i % 2 == 0) ? staff1 : staff2;
            LocalDateTime at = now.minusHours((100L - i) * 7);

            logs.add(AuditLogs.builder()
                    .actorType(ActorType.STAFF)
                    .actorStaff(actor)
                    .actionType(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .oldValues("{}")
                    .newValues("{\"action\":\"" + action + "\",\"result\":\"SUCCESS\"}")
                    .ipAddress("192.168.1." + (10 + i % 5))
                    .userAgent("Mozilla/5.0 Staff Portal")
                    .createdAt(at)
                    .build());
        }
        auditLogsRepository.saveAllAndFlush(logs);
        log.info("[DemoDataSeeder] Seeded {} audit logs.", logs.size());
    }

    // Base reference lookups
    // ------------------------------------------------------------------

    private StaffUsers staff(String username) {
        return staffUsersRepository.findByUsername(username).orElse(null);
    }

    private Customers customer(String code) {
        return customerRepository.findByCustomerCode(code).orElse(null);
    }

    private Accounts account(String number) {
        return accountRepository.findByAccountNumber(number).orElse(null);
    }

    private BankTransactions tx(String ref) {
        return bankTransactionRepository.findByTransactionRef(ref).orElse(null);
    }

    private boolean missing(Object... refs) {
        for (Object o : refs) {
            if (o == null) {
                return true;
            }
        }
        return false;
    }

    /** MMK amount with 4 decimal places. */
    private BigDecimal mmk(long value) {
        return BigDecimal.valueOf(value).setScale(4, RoundingMode.HALF_UP);
    }

    // ------------------------------------------------------------------
    // RBAC: roles, permissions, role/permission and staff/role links
    // ------------------------------------------------------------------

    private void seedRolesAndPermissions(LocalDateTime now) {
        if (rolesRepository.count() > 0 || permissionsRepository.count() > 0) {
            log.warn("[DemoDataSeeder] roles/permissions not empty - skipping RBAC.");
            return;
        }

        List<Roles> roles = rolesRepository.saveAllAndFlush(List.of(
                role("ADMIN", "Administrator", "Full system access", true, now),
                role("TELLER", "Teller", "Counter operations and OTC transactions", false, now),
                role("BRANCH_MANAGER", "Branch Manager", "Approvals and account management", false, now),
                role("AUDITOR", "Auditor", "Read-only audit access", false, now)));

        List<Permissions> permissions = permissionsRepository.saveAllAndFlush(List.of(
                perm("CUSTOMER_CREATE", "Create Customer", "Register new customers", now),
                perm("ACCOUNT_CREATE", "Create Account", "Open retail and corporate accounts", now),
                perm("ACCOUNT_UPDATE", "Update Account", "Modify account details/status", now),
                perm("TRANSACTION_INITIATE", "Initiate Transaction", "Start transfers and payments", now),
                perm("TRANSACTION_APPROVE", "Approve Transaction", "Approve pending transactions", now),
                perm("REPORT_VIEW", "View Reports", "Run and view reports", now),
                perm("STAFF_MANAGE", "Manage Staff", "Create and manage staff users", now),
                perm("ANNOUNCEMENT_MANAGE", "Manage Announcements", "Create/edit announcements", now)));

        Roles admin = roles.get(0);
        Roles teller = roles.get(1);
        Roles manager = roles.get(2);
        Roles auditor = roles.get(3);
        int[][] grant = {
                {0, 1, 2, 3, 4, 5, 6, 7}, // ADMIN: everything
                {0, 1, 2, 3, 5},          // TELLER
                {0, 1, 2, 3, 4, 5},       // BRANCH_MANAGER
                {5}                        // AUDITOR: reports only
        };
        Roles[] roleRows = {admin, teller, manager, auditor};

        List<RolePermissions> links = new ArrayList<>();
        for (int r = 0; r < roleRows.length; r++) {
            for (int idx : grant[r]) {
                Permissions p = permissions.get(idx);
                links.add(RolePermissions.builder()
                        .roleId(roleRows[r].getRoleId())
                        .permissionId(p.getPermissionId())
                        .updatedByType(UpdatedByType.SYSTEM)
                        .updatedAt(now)
                        .build());
            }
        }
        rolePermissionsRepository.saveAllAndFlush(links);
        log.info("[DemoDataSeeder] RBAC seeded: {} roles, {} permissions, {} role-permission links.",
                roles.size(), permissions.size(), links.size());
    }

    private void seedStaffRoles(LocalDateTime now) {
        if (staffUserRolesRepository.count() > 0) {
            return;
        }
        Roles adminRole = rolesRepository.findByRoleCode("ADMIN").orElse(null);
        Roles tellerRole = rolesRepository.findByRoleCode("TELLER").orElse(null);
        StaffUsers staff1 = staff("admin.nay");
        StaffUsers staff2 = staff("teller.zin");
        if (missing(adminRole, tellerRole, staff1, staff2)) {
            log.warn("[DemoDataSeeder] staff roles skipped: roles or staff missing.");
            return;
        }

        StaffUserRoles adminLink = StaffUserRoles.builder()
                .staffId(staff1.getStaffId())
                .roleId(adminRole.getRoleId())
                .assignedByStaff(staff1)
                .assignedAt(now.minusDays(90))
                .updatedByType(UpdatedByType.STAFF)
                .updatedAt(now.minusDays(90))
                .build();

        StaffUserRoles tellerLink = StaffUserRoles.builder()
                .staffId(staff2.getStaffId())
                .roleId(tellerRole.getRoleId())
                .assignedByStaff(staff1)
                .assignedAt(now.minusDays(80))
                .updatedByType(UpdatedByType.STAFF)
                .updatedAt(now.minusDays(80))
                .build();

        staffUserRolesRepository.saveAllAndFlush(List.of(adminLink, tellerLink));
        log.info("[DemoDataSeeder] staff roles seeded.");
    }

    private Roles role(String code, String name, String description, boolean systemRole, LocalDateTime now) {
        return Roles.builder()
                .roleCode(code)
                .roleName(name)
                .description(description)
                .isSystemRole(systemRole)
                .updatedByType(UpdatedByType.SYSTEM)
                .updatedAt(now)
                .build();
    }

    private Permissions perm(String code, String name, String description, LocalDateTime now) {
        return Permissions.builder()
                .permissionCode(code)
                .permissionName(name)
                .description(description)
                .updatedByType(UpdatedByType.SYSTEM)
                .updatedAt(now)
                .build();
    }

    // ------------------------------------------------------------------
    // Corporate customer + company profile + contact persons
    // ------------------------------------------------------------------

    private void seedCorporateCustomer(LocalDateTime now) {
        if (customerRepository.existsByCustomerCode(CORPORATE_CUSTOMER_CODE)) {
            return;
        }
        StaffUsers staff1 = staff("admin.nay");
        if (missing(staff1)) {
            return;
        }

        Customers company = Customers.builder()
                .customerCode(CORPORATE_CUSTOMER_CODE)
                .customerType(CustomerType.COMPANY)
                .fullName("Golden Gate Trading Co., Ltd")
                .email("contact@ggt.local")
                .phone("09-300-000-01")
                .address("No. 42, Bo Sun Pat Street, Pabedan Township, Yangon")
                .status(CustomerStatus.ACTIVE)
                .createdBy(staff1)
                .createdAt(now.minusDays(65))
                .updatedAt(now.minusDays(65))
                .build();
        Customers savedCompany = customerRepository.saveAndFlush(company);

        CompanyInfo info = CompanyInfo.builder()
                .customer(savedCompany)
                .companyName("Golden Gate Trading Co., Ltd")
                .registrationNumber("REG-2024-0001")
                .taxId("TAX-0001")
                .businessType("IMPORT / EXPORT")
                .incorporationDate(LocalDate.of(2020, 5, 15))
                .companyPhone("09-300-000-01")
                .companyEmail("contact@ggt.local")
                .address("No. 42, Bo Sun Pat Street, Pabedan Township, Yangon")
                .city("Yangon")
                .stateRegion("Yangon Region")
                .country("Myanmar")
                .createdAt(now.minusDays(65))
                .updatedAt(now.minusDays(65))
                .build();
        CompanyInfo savedInfo = companyInfoRepository.saveAndFlush(info);

        CompanyContactPersons ceo = CompanyContactPersons.builder()
                .customerId(savedCompany.getCustomerId())
                .contactId(1)
                .companyInfo(savedInfo)
                .fullName("U Aung Hla")
                .position("Chief Executive Officer")
                .phone("09-300-000-11")
                .email("ceo@ggt.local")
                .isPrimary(true)
                .createdAt(now.minusDays(65))
                .updatedAt(now.minusDays(65))
                .build();

        CompanyContactPersons accountant = CompanyContactPersons.builder()
                .customerId(savedCompany.getCustomerId())
                .contactId(2)
                .companyInfo(savedInfo)
                .fullName("Daw Hla Hla Win")
                .position("Chief Accountant")
                .phone("09-300-000-12")
                .email("account@ggt.local")
                .isPrimary(false)
                .createdAt(now.minusDays(60))
                .updatedAt(now.minusDays(60))
                .build();

        companyContactPersonsRepository.saveAllAndFlush(List.of(ceo, accountant));
        log.info("[DemoDataSeeder] corporate customer + company profile seeded.");
    }

    // ------------------------------------------------------------------
    // Personal (KYC) profiles for the two retail customers
    // ------------------------------------------------------------------

    private void seedCustomerProfiles(LocalDateTime now) {
        if (personalInfoRepository.count() > 0) {
            return;
        }
        Customers cust1 = customer("CUS-001");
        Customers cust2 = customer("CUS-002");
        if (missing(cust1, cust2)) {
            return;
        }

        PersonalInfo p1 = PersonalInfo.builder()
                .customer(cust1)
                .firstName("Kyaw Zin")
                .lastName("Htun")
                .dateOfBirth(LocalDate.of(1995, 4, 12))
                .gender(GenderType.MALE)
                .nrc("12/KATHANA(N)123456")
                .email("kyaw@mail.local")
                .phone("09-200-000-01")
                .occupation("Software Engineer")
                .address("No. 55, Insein Road, Mayangone Township, Yangon")
                .city("Yangon")
                .stateRegion("Yangon Region")
                .country("Myanmar")
                .createdAt(now.minusDays(80))
                .updatedAt(now.minusDays(80))
                .build();

        PersonalInfo p2 = PersonalInfo.builder()
                .customer(cust2)
                .firstName("Su Myat")
                .lastName("Noe")
                .dateOfBirth(LocalDate.of(1998, 9, 30))
                .gender(GenderType.FEMALE)
                .nrc("5/PATHA(N)789012")
                .email("su@mail.local")
                .phone("09-200-000-02")
                .occupation("Business Owner")
                .address("No. 12, Pyay Road, Kamayut Township, Yangon")
                .city("Yangon")
                .stateRegion("Yangon Region")
                .country("Myanmar")
                .createdAt(now.minusDays(70))
                .updatedAt(now.minusDays(70))
                .build();

        personalInfoRepository.saveAllAndFlush(List.of(p1, p2));
        log.info("[DemoDataSeeder] personal info profiles seeded.");
    }

    // ------------------------------------------------------------------
    // Customer login credentials
    // ------------------------------------------------------------------

    private void seedCustomerCredentials(LocalDateTime now) {
        if (customerCredentialsRepository.count() > 0) {
            return;
        }
        Customers cust1 = customer("CUS-001");
        Customers cust2 = customer("CUS-002");
        Customers cust3 = customer(CORPORATE_CUSTOMER_CODE);
        if (missing(cust1, cust2, cust3)) {
            return;
        }

        List<CustomerCredentials> creds = new ArrayList<>();
        creds.add(credential(cust1, now));
        creds.add(credential(cust2, now));
        creds.add(credential(cust3, now));
        customerCredentialsRepository.saveAllAndFlush(creds);
        log.info("[DemoDataSeeder] customer credentials seeded (3 customers).");
    }

    private CustomerCredentials credential(Customers customer, LocalDateTime now) {
        return CustomerCredentials.builder()
                .customerId(customer.getCustomerId())
                .customer(customer)
                .passwordHash(passwordEncoder.encode(SEED_PASSWORD))
                .mfaEnabled(true)
                .mfaMethod(MfaMethod.EMAIL)
                .mustChangePassword(false)
                .failedLoginCount(0)
                .failedPinAttemptCount(0)
                .tokenVersion(1L)
                .createdAt(now.minusDays(60))
                .updatedByType(UpdatedByType.SYSTEM)
                .updatedAt(now.minusDays(60))
                .build();
    }

    // ------------------------------------------------------------------
    // Announcements
    // ------------------------------------------------------------------

    private void seedAnnouncements(LocalDateTime now) {
        if (announcementsRepository.count() > 0) {
            return;
        }
        StaffUsers staff1 = staff("admin.nay");
        if (missing(staff1)) {
            return;
        }

        List<Announcements> list = List.of(
                Announcements.builder()
                        .title("Scheduled System Maintenance")
                        .message("Core banking system will be unavailable on Sunday 00:00-04:00 for scheduled maintenance.")
                        .audience(AnnouncementAudience.ALL)
                        .isActive(true)
                        .startsAt(now.minusDays(1))
                        .endsAt(now.plusDays(5))
                        .createdByStaff(staff1)
                        .createdAt(now.minusDays(1))
                        .updatedAt(now.minusDays(1))
                        .build(),
                Announcements.builder()
                        .title("New Mobile App Features")
                        .message("Bill payments and QR payments are now available in the customer portal.")
                        .audience(AnnouncementAudience.CUSTOMERS)
                        .isActive(true)
                        .startsAt(now.minusDays(5))
                        .endsAt(now.plusDays(30))
                        .createdByStaff(staff1)
                        .createdAt(now.minusDays(5))
                        .updatedAt(now.minusDays(5))
                        .build(),
                Announcements.builder()
                        .title("Staff Training: Anti-Money Laundering")
                        .message("Compulsory AML refresher training for all teller staff next Friday.")
                        .audience(AnnouncementAudience.STAFF)
                        .isActive(true)
                        .startsAt(now.minusDays(2))
                        .endsAt(now.plusDays(8))
                        .createdByStaff(staff1)
                        .createdAt(now.minusDays(2))
                        .updatedAt(now.minusDays(2))
                        .build(),
                Announcements.builder()
                        .title("Transfer Fee Revision (Archived)")
                        .message("Previous notice about transfer fee changes. Superseded.")
                        .audience(AnnouncementAudience.ALL)
                        .isActive(false)
                        .startsAt(now.minusDays(60))
                        .endsAt(now.minusDays(30))
                        .createdByStaff(staff1)
                        .createdAt(now.minusDays(60))
                        .updatedAt(now.minusDays(30))
                        .build());

        announcementsRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] announcements seeded ({}).", list.size());
    }

    // ------------------------------------------------------------------
    // Fee schedules
    // ------------------------------------------------------------------

    private void seedFeeSchedules(LocalDateTime now) {
        if (feeScheduleRepository.count() > 0) {
            return;
        }
        StaffUsers staff1 = staff("admin.nay");
        if (missing(staff1)) {
            return;
        }

        List<FeeSchedules> list = List.of(
                fee("FEE-ITR", TransactionType.INTERNAL_TRANSFER, FeeType.PERCENTAGE,
                        new BigDecimal("1.0000"), mmk(100), mmk(5000), staff1, now),
                fee("FEE-OTC-DEP", TransactionType.OTC_DEPOSIT, FeeType.FLAT,
                        BigDecimal.ZERO, null, null, staff1, now),
                fee("FEE-OTC-WD", TransactionType.OTC_WITHDRAWAL, FeeType.PERCENTAGE,
                        new BigDecimal("1.0000"), mmk(50), mmk(3000), staff1, now),
                fee("FEE-EXT", TransactionType.EXTERNAL_PAYMENT, FeeType.PERCENTAGE,
                        new BigDecimal("1.0000"), mmk(100), mmk(10000), staff1, now),
                fee("FEE-LEDGER-ADJ", TransactionType.LEDGER_ADJUSTMENT, FeeType.FLAT,
                        BigDecimal.ZERO, null, null, staff1, now));

        feeScheduleRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] fee schedules seeded ({}).", list.size());
    }

    private FeeSchedules fee(String code, TransactionType type, FeeType feeType, BigDecimal value,
                             BigDecimal min, BigDecimal max, StaffUsers createdBy, LocalDateTime now) {
        return FeeSchedules.builder()
                .feeCode(code)
                .transactionType(type)
                .feeType(feeType)
                .feeValue(value.setScale(4, RoundingMode.HALF_UP))
                .minimumFee(min)
                .maximumFee(max)
                .currency("MMK")
                .activeFrom(now.minusDays(90))
                .isActive(true)
                .createdByStaff(createdBy)
                .updatedByType(UpdatedByType.STAFF)
                .updatedAt(now.minusDays(90))
                .build();
    }

    // ------------------------------------------------------------------
    // Ledger accounts and entries
    // ------------------------------------------------------------------

    private void seedLedgerAccounts(LocalDateTime now) {
        if (ledgerAccountRepository.count() > 0) {
            return;
        }
        Accounts acct1 = account("1001000001");
        Accounts acct2 = account("1001000002");
        if (missing(acct1, acct2)) {
            log.warn("[DemoDataSeeder] ledger accounts skipped: customer accounts missing.");
            return;
        }

        List<LedgerAccounts> list = List.of(
                LedgerAccounts.builder()
                        .ledgerCode("LDG-CASH-01")
                        .ledgerName("Petty Cash MMK")
                        .ledgerScope(LedgerScope.INTERNAL)
                        .accountClass(AccountClass.ASSET)
                        .currency("MMK")
                        .systemKey("CASH-MMK")
                        .status(LedgerAccountStatus.ACTIVE)
                        .updatedAt(now.minusDays(90))
                        .build(),
                LedgerAccounts.builder()
                        .ledgerCode("LDG-FEE-01")
                        .ledgerName("Fee Income MMK")
                        .ledgerScope(LedgerScope.INTERNAL)
                        .accountClass(AccountClass.REVENUE)
                        .currency("MMK")
                        .systemKey("FEE-INCOME-MMK")
                        .status(LedgerAccountStatus.ACTIVE)
                        .updatedAt(now.minusDays(90))
                        .build(),
                LedgerAccounts.builder()
                        .ledgerCode("LDG-CLEAR-01")
                        .ledgerName("Interbank Clearing MMK")
                        .ledgerScope(LedgerScope.CLEARING)
                        .accountClass(AccountClass.ASSET)
                        .currency("MMK")
                        .systemKey("CLEARING-MMK")
                        .status(LedgerAccountStatus.ACTIVE)
                        .updatedAt(now.minusDays(90))
                        .build(),
                LedgerAccounts.builder()
                        .ledgerCode("LDG-GL-01")
                        .ledgerName("General Ledger MMK")
                        .ledgerScope(LedgerScope.INTERNAL)
                        .accountClass(AccountClass.LIABILITY)
                        .currency("MMK")
                        .systemKey("GL-MMK")
                        .status(LedgerAccountStatus.ACTIVE)
                        .updatedAt(now.minusDays(90))
                        .build(),
                LedgerAccounts.builder()
                        .ledgerCode("LDG-CUS-0001")
                        .ledgerName("Customer Ledger " + acct1.getAccountNumber())
                        .ledgerScope(LedgerScope.CUSTOMER)
                        .accountClass(AccountClass.LIABILITY)
                        .currency("MMK")
                        .customerAccount(acct1)
                        .systemKey("CUS-" + acct1.getAccountNumber())
                        .status(LedgerAccountStatus.ACTIVE)
                        .updatedAt(now.minusDays(90))
                        .build(),
                LedgerAccounts.builder()
                        .ledgerCode("LDG-CUS-0002")
                        .ledgerName("Customer Ledger " + acct2.getAccountNumber())
                        .ledgerScope(LedgerScope.CUSTOMER)
                        .accountClass(AccountClass.LIABILITY)
                        .currency("MMK")
                        .customerAccount(acct2)
                        .systemKey("CUS-" + acct2.getAccountNumber())
                        .status(LedgerAccountStatus.ACTIVE)
                        .updatedAt(now.minusDays(90))
                        .build());

        ledgerAccountRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] ledger accounts seeded ({}).", list.size());
    }

    private void seedLedgerEntries(LocalDateTime now) {
        if (ledgerEntryRepository.count() > 0) {
            return;
        }
        BankTransactions t1 = tx("REF-T001");
        BankTransactions t3 = tx("REF-T003");
        LedgerAccounts cash = ledgerAccountRepository.findBySystemKey("CASH-MMK").orElse(null);
        LedgerAccounts fee = ledgerAccountRepository.findBySystemKey("FEE-INCOME-MMK").orElse(null);
        if (missing(t1, t3, cash, fee)) {
            log.warn("[DemoDataSeeder] ledger entries skipped: dependencies missing.");
            return;
        }
        Accounts acct1 = account("1001000001");
        Accounts acct2 = account("1001000002");
        LedgerAccounts ledAcct1 = acct1 == null ? null
                : ledgerAccountRepository.findBySystemKey("CUS-" + acct1.getAccountNumber()).orElse(null);
        LedgerAccounts ledAcct2 = acct2 == null ? null
                : ledgerAccountRepository.findBySystemKey("CUS-" + acct2.getAccountNumber()).orElse(null);
        if (missing(ledAcct1, ledAcct2)) {
            log.warn("[DemoDataSeeder] ledger entries skipped: customer ledgers missing.");
            return;
        }

        List<LedgerEntries> entries = List.of(
                entry(t1, 1, ledAcct2, EntryType.DEBIT, mmk(5000), mmk(0), mmk(5000), "Transfer in to 1001000002", now),
                entry(t1, 2, ledAcct1, EntryType.CREDIT, mmk(5000), mmk(5000), mmk(0), "Transfer out from 1001000001", now),
                entry(t3, 1, cash, EntryType.DEBIT, mmk(8000), mmk(0), mmk(8000), "Cash deposit 1001000001", now),
                entry(t3, 2, ledAcct1, EntryType.CREDIT, mmk(8000), mmk(0), mmk(8000), "Cash deposit 1001000001", now));

        ledgerEntryRepository.saveAllAndFlush(entries);
        log.info("[DemoDataSeeder] ledger entries seeded ({}).", entries.size());
    }

    private LedgerEntries entry(BankTransactions txn, int line, LedgerAccounts account_, EntryType type,
                                BigDecimal amount, BigDecimal before, BigDecimal after,
                                String narration, LocalDateTime now) {
        return LedgerEntries.builder()
                .transaction(txn)
                .lineNo(line)
                .ledgerAccount(account_)
                .entryType(type)
                .amount(amount)
                .currency("MMK")
                .balanceBefore(before)
                .balanceAfter(after)
                .narration(narration)
                .build();
    }

    // ------------------------------------------------------------------
    // Beneficiaries
    // ------------------------------------------------------------------

    private void seedBeneficiaries(LocalDateTime now) {
        if (beneficiariesRepository.count() > 0) {
            return;
        }
        Accounts a1 = account("1001000001");
        Accounts a2 = account("1001000002");
        Accounts a3 = account("1001000003");
        Accounts a5 = account("1001000005");
        if (missing(a1, a2, a3, a5)) {
            return;
        }

        List<Beneficiaries> list = List.of(
                beneficiary(a1, a2, "Su Myat", now),
                beneficiary(a2, a3, "Savings-3", now),
                beneficiary(a1, a3, "Joint Savings", now),
                beneficiary(a5, a1, "Sweep Account", now));

        beneficiariesRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] beneficiaries seeded ({}).", list.size());
    }

    private Beneficiaries beneficiary(Accounts owner, Accounts target, String nickname, LocalDateTime now) {
        return Beneficiaries.builder()
                .ownerAccount(owner)
                .beneficiaryAccount(target)
                .nickname(nickname)
                .isActive(true)
                .createdAt(now.minusDays(40))
                .updatedAt(now.minusDays(40))
                .build();
    }

    // ------------------------------------------------------------------
    // Account signatories
    // ------------------------------------------------------------------

    private void seedSignatories(LocalDateTime now) {
        if (accountSignatoriesRepository.count() > 0) {
            return;
        }
        Accounts a1 = account("1001000001");
        Accounts a2 = account("1001000002");
        Customers cust1 = customer("CUS-001");
        Customers cust2 = customer("CUS-002");
        if (missing(a1, a2, cust1, cust2)) {
            return;
        }

        List<AccountSignatories> list = List.of(
                AccountSignatories.builder()
                        .account(a1).customer(cust1).signatoryRole(SignatoryRole.PRIMARY_HOLDER)
                        .canInitiate(true).canApprove(true).approvalLimit(mmk(1000000))
                        .status(SignatoryStatus.ACTIVE).createdAt(now.minusDays(30)).updatedAt(now.minusDays(30))
                        .build(),
                AccountSignatories.builder()
                        .account(a1).customer(cust2).signatoryRole(SignatoryRole.JOINT_HOLDER)
                        .canInitiate(true).canApprove(false).approvalLimit(mmk(100000))
                        .status(SignatoryStatus.ACTIVE).createdAt(now.minusDays(28)).updatedAt(now.minusDays(28))
                        .build(),
                AccountSignatories.builder()
                        .account(a2).customer(cust2).signatoryRole(SignatoryRole.PRIMARY_HOLDER)
                        .canInitiate(true).canApprove(true).approvalLimit(mmk(500000))
                        .status(SignatoryStatus.ACTIVE).createdAt(now.minusDays(29)).updatedAt(now.minusDays(29))
                        .build());

        accountSignatoriesRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] account signatories seeded ({}).", list.size());
    }

    // ------------------------------------------------------------------
    // Account status history
    // ------------------------------------------------------------------

    private void seedStatusHistory(LocalDateTime now) {
        if (accountStatusHistoryRepository.count() > 0) {
            return;
        }
        Accounts dormant = account("1002000001");
        Accounts frozen = account("1003000001");
        Accounts closed = account("1004000001");
        StaffUsers staff1 = staff("admin.nay");
        if (missing(dormant, frozen, closed, staff1)) {
            return;
        }

        List<AccountStatusHistory> list = List.of(
                history(dormant, "ACTIVE", "DORMANT", "No transactions for 30+ days",
                        staff1, now.minusDays(40), now),
                history(frozen, "ACTIVE", "FROZEN", "Court freeze order received",
                        staff1, now.minusDays(28), now),
                history(frozen, "FROZEN", "FROZEN", "Freeze extended by compliance",
                        staff1, now.minusDays(21), now),
                history(closed, "ACTIVE", "CLOSED", "Account closed at customer request",
                        staff1, now.minusDays(10), now));

        accountStatusHistoryRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] account status history seeded ({}).", list.size());
    }

    private AccountStatusHistory history(Accounts account_, String oldStatus, String newStatus, String reason,
                                         StaffUsers changedBy, LocalDateTime changedAt, LocalDateTime now) {
        return AccountStatusHistory.builder()
                .account(account_)
                .oldStatus(oldStatus)
                .newStatus(newStatus)
                .reason(reason)
                .changedByStaff(changedBy)
                .changedAt(changedAt)
                .updatedByType(UpdatedByType.STAFF)
                .updatedAt(changedAt)
                .build();
    }

    // ------------------------------------------------------------------
    // Account holds
    // ------------------------------------------------------------------

    private void seedHolds(LocalDateTime now) {
        if (accountHoldsRepository.count() > 0) {
            return;
        }
        Accounts a1 = account("1001000001");
        Accounts a3 = account("1001000003");
        Accounts a5 = account("1001000005");
        BankTransactions pendingTransfer = tx("REF-T029");
        if (missing(a1, a3, a5)) {
            return;
        }

        List<AccountHolds> list = List.of(
                AccountHolds.builder()
                        .holdRef("HOLD-0001")
                        .account(a5)
                        .transaction(pendingTransfer)
                        .holdType(HoldType.TRANSFER_HOLD)
                        .amount(mmk(25000))
                        .status(HoldStatus.ACTIVE)
                        .reason("Awaiting joint approval for REF-T029")
                        .createdAt(now.minusDays(13))
                        .expiresAt(now.plusDays(3))
                        .updatedAt(now.minusDays(13))
                        .build(),
                AccountHolds.builder()
                        .holdRef("HOLD-0002")
                        .account(a1)
                        .holdType(HoldType.MERCHANT_AUTH)
                        .amount(mmk(18000))
                        .status(HoldStatus.RELEASED)
                        .reason("Merchant authorization settled")
                        .createdAt(now.minusDays(5))
                        .expiresAt(now.minusDays(2))
                        .releasedAt(now.minusDays(2))
                        .updatedAt(now.minusDays(2))
                        .build(),
                AccountHolds.builder()
                        .holdRef("HOLD-0003")
                        .account(a3)
                        .holdType(HoldType.LEGAL_FREEZE)
                        .amount(mmk(6000))
                        .status(HoldStatus.SETTLED)
                        .reason("Court order resolved")
                        .createdAt(now.minusDays(9))
                        .expiresAt(now.minusDays(1))
                        .releasedAt(now.minusDays(1))
                        .updatedAt(now.minusDays(1))
                        .build());

        accountHoldsRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] account holds seeded ({}).", list.size());
    }

    // ------------------------------------------------------------------
    // Transaction approvals
    // ------------------------------------------------------------------

    private void seedTransactionApprovals(LocalDateTime now) {
        if (transactionApprovalsRepository.count() > 0) {
            return;
        }
        Customers cust1 = customer("CUS-001");
        Customers cust2 = customer("CUS-002");
        BankTransactions pendingExternal = tx("REF-T050");
        BankTransactions pendingTransfer = tx("REF-T029");
        if (missing(cust1, cust2) || missing(pendingExternal, pendingTransfer)) {
            log.warn("[DemoDataSeeder] transaction approvals skipped: dependencies missing.");
            return;
        }

        List<TransactionApprovals> list = List.of(
                TransactionApprovals.builder()
                        .transaction(pendingExternal)
                        .approverCustomer(cust1)
                        .approvalStatus(ApprovalStatus.PENDING)
                        .pinVerified(true)
                        .createdAt(now.minusHours(4))
                        .build(),
                TransactionApprovals.builder()
                        .transaction(pendingTransfer)
                        .approverCustomer(cust2)
                        .approvalStatus(ApprovalStatus.REJECTED)
                        .pinVerified(true)
                        .decisionReason("Destination account under KYC review")
                        .decidedAt(now.minusDays(12))
                        .createdAt(now.minusDays(13))
                        .build());

        transactionApprovalsRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] transaction approvals seeded ({}).", list.size());
    }

    // ------------------------------------------------------------------
    // Manual (OTC) transactions
    // ------------------------------------------------------------------

    private void seedManualTransactions(LocalDateTime now) {
        if (manualTransactionsRepository.count() > 0) {
            return;
        }
        BankTransactions deposit = tx("REF-T003");
        BankTransactions withdrawal = tx("REF-T004");
        StaffUsers teller = staff("teller.zin");
        if (missing(deposit, withdrawal, teller)) {
            log.warn("[DemoDataSeeder] manual transactions skipped: dependencies missing.");
            return;
        }
        Accounts a1 = account("1001000001");
        Accounts a3 = account("1001000003");
        if (missing(a1, a3)) {
            return;
        }

        List<ManualTransactions> list = List.of(
                ManualTransactions.builder()
                        .transaction(deposit)
                        .account(a1)
                        .staff(teller)
                        .operationType(ManualOperationType.CASH_DEPOSIT)
                        .amount(mmk(8000))
                        .referenceId("MANUAL-0001")
                        .auditNote("Counter cash deposit of 8,000 MMK to 1001000001")
                        .createdAt(now.minusDays(30))
                        .updatedAt(now.minusDays(30))
                        .build(),
                ManualTransactions.builder()
                        .transaction(withdrawal)
                        .account(a3)
                        .staff(teller)
                        .operationType(ManualOperationType.CASH_WITHDRAWAL)
                        .amount(mmk(3000))
                        .referenceId("MANUAL-0002")
                        .auditNote("Counter cash withdrawal of 3,000 MMK from 1001000003")
                        .createdAt(now.minusDays(30))
                        .updatedAt(now.minusDays(30))
                        .build());

        manualTransactionsRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] manual transactions seeded ({}).", list.size());
    }

    // ------------------------------------------------------------------
    // Auth sessions, login attempts, OTP challenges, revoked JWTs
    // ------------------------------------------------------------------

    private void seedAuthSessions(LocalDateTime now) {
        if (authSessionsRepository.count() > 0) {
            return;
        }
        StaffUsers staff1 = staff("admin.nay");
        StaffUsers staff2 = staff("teller.zin");
        Customers cust1 = customer("CUS-001");
        if (missing(staff1, staff2, cust1)) {
            return;
        }

        List<AuthSession> list = List.of(
                AuthSession.builder()
                        .sessionUuid(UUID.randomUUID().toString())
                        .subjectType(SessionSubjectType.STAFF)
                        .staff(staff1)
                        .refreshTokenHash("demo-refresh-staff-1")
                        .tokenVersionAtIssue(1L)
                        .issuedAt(now.minusDays(2))
                        .lastSeenAt(now.minusHours(1))
                        .refreshExpiresAt(now.plusDays(5))
                        .idleTimeoutMinutes(30)
                        .ipAddress("192.168.1.10")
                        .userAgent("Mozilla/5.0 Staff Portal")
                        .updatedByType(UpdatedByType.STAFF)
                        .updatedAt(now.minusHours(1))
                        .build(),
                AuthSession.builder()
                        .sessionUuid(UUID.randomUUID().toString())
                        .subjectType(SessionSubjectType.CUSTOMER)
                        .customer(cust1)
                        .refreshTokenHash("demo-refresh-cust-1")
                        .tokenVersionAtIssue(1L)
                        .issuedAt(now.minusDays(1))
                        .lastSeenAt(now.minusMinutes(30))
                        .refreshExpiresAt(now.plusDays(6))
                        .idleTimeoutMinutes(15)
                        .ipAddress("192.168.1.55")
                        .userAgent("Mozilla/5.0 Customer Portal")
                        .updatedByType(UpdatedByType.CUSTOMER)
                        .updatedAt(now.minusMinutes(30))
                        .build(),
                AuthSession.builder()
                        .sessionUuid(UUID.randomUUID().toString())
                        .subjectType(SessionSubjectType.STAFF)
                        .staff(staff2)
                        .refreshTokenHash("demo-refresh-staff-2")
                        .tokenVersionAtIssue(1L)
                        .issuedAt(now.minusDays(3))
                        .lastSeenAt(now.minusDays(3))
                        .refreshExpiresAt(now.plusDays(4))
                        .idleTimeoutMinutes(30)
                        .revokedAt(now.minusDays(2))
                        .revokeReason("Password changed")
                        .ipAddress("192.168.1.11")
                        .userAgent("Mozilla/5.0 Staff Portal")
                        .updatedByType(UpdatedByType.STAFF)
                        .updatedAt(now.minusDays(2))
                        .build());

        authSessionsRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] auth sessions seeded ({}).", list.size());
    }

    private void seedLoginAttempts(LocalDateTime now) {
        if (loginAttemptsRepository.count() > 0) {
            return;
        }
        StaffUsers staff1 = staff("admin.nay");
        Customers cust1 = customer("CUS-001");
        Customers cust2 = customer("CUS-002");
        if (missing(staff1, cust1, cust2)) {
            return;
        }

        List<LoginAttempt> list = List.of(
                attempt(SessionSubjectType.STAFF, "admin.nay", true, null, staff1, null, now.minusDays(4), now),
                attempt(SessionSubjectType.STAFF, "admin.nay", false, "Bad credentials", staff1, null, now.minusDays(3), now),
                attempt(SessionSubjectType.CUSTOMER, "CUS-001", true, null, null, cust1, now.minusDays(2), now),
                attempt(SessionSubjectType.CUSTOMER, "CUS-001", false, "Invalid PIN", null, cust1, now.minusDays(1), now),
                attempt(SessionSubjectType.CUSTOMER, "CUS-002", true, null, null, cust2, now.minusHours(6), now));

        loginAttemptsRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] login attempts seeded ({}).", list.size());
    }

    private LoginAttempt attempt(SessionSubjectType actorType, String identifier, boolean success,
                                  String reason, StaffUsers staff, Customers customer,
                                  LocalDateTime at, LocalDateTime now) {
        return LoginAttempt.builder()
                .actorType(actorType)
                .loginIdentifier(identifier)
                .customer(customer)
                .staff(staff)
                .success(success)
                .failureReason(reason)
                .ipAddress("192.168.1.10")
                .userAgent("Mozilla/5.0 Portal")
                .attemptedAt(at)
                .updatedAt(at)
                .build();
    }

    private void seedOtpChallenges(LocalDateTime now) {
        if (otpChallengesRepository.count() > 0) {
            return;
        }
        Customers cust1 = customer("CUS-001");
        Customers cust2 = customer("CUS-002");
        BankTransactions pendingTransfer = tx("REF-T029");
        if (missing(cust1, cust2, pendingTransfer)) {
            log.warn("[DemoDataSeeder] OTP challenges skipped: dependencies missing.");
            return;
        }

        List<OtpChallenge> list = List.of(
                OtpChallenge.builder()
                        .customer(cust1)
                        .purpose(OtpPurpose.LOGIN)
                        .otpHash(passwordEncoder.encode("123456"))
                        .deliveryChannel(DeliveryChannel.EMAIL)
                        .destinationMasked("ky**@mail.local")
                        .maxAttempts(5)
                        .expiresAt(now.plusMinutes(10))
                        .status(OtpStatus.ACTIVE)
                        .challengeGroupId("grp-login-001")
                        .lastSentAt(now.minusMinutes(1))
                        .maxResendAttempts(5)
                        .updatedAt(now.minusMinutes(1))
                        .build(),
                OtpChallenge.builder()
                        .customer(cust1)
                        .purpose(OtpPurpose.PASSWORD_RESET)
                        .otpHash(passwordEncoder.encode("654321"))
                        .deliveryChannel(DeliveryChannel.EMAIL)
                        .destinationMasked("ky**@mail.local")
                        .maxAttempts(5)
                        .expiresAt(now.minusHours(1))
                        .status(OtpStatus.EXPIRED)
                        .challengeGroupId("grp-pass-001")
                        .lastSentAt(now.minusHours(3))
                        .maxResendAttempts(5)
                        .updatedAt(now.minusHours(1))
                        .build(),
                OtpChallenge.builder()
                        .customer(cust2)
                        .purpose(OtpPurpose.LOGIN)
                        .otpHash(passwordEncoder.encode("111222"))
                        .deliveryChannel(DeliveryChannel.EMAIL)
                        .destinationMasked("su**@mail.local")
                        .maxAttempts(5)
                        .expiresAt(now.minusDays(1))
                        .consumedAt(now.minusDays(1).plusMinutes(1))
                        .status(OtpStatus.CONSUMED)
                        .challengeGroupId("grp-login-002")
                        .lastSentAt(now.minusDays(1).plusMinutes(1))
                        .maxResendAttempts(5)
                        .updatedAt(now.minusDays(1).plusMinutes(1))
                        .build(),
                OtpChallenge.builder()
                        .customer(cust1)
                        .transaction(pendingTransfer)
                        .purpose(OtpPurpose.TRANSFER)
                        .otpHash(passwordEncoder.encode("333444"))
                        .deliveryChannel(DeliveryChannel.EMAIL)
                        .destinationMasked("ky**@mail.local")
                        .maxAttempts(5)
                        .expiresAt(now.plusMinutes(5))
                        .status(OtpStatus.ACTIVE)
                        .challengeGroupId("grp-tx-001")
                        .lastSentAt(now.minusSeconds(45))
                        .maxResendAttempts(5)
                        .updatedAt(now.minusSeconds(45))
                        .build());

        otpChallengesRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] OTP challenges seeded ({}).", list.size());
    }

    private void seedJwtRevokedTokens(LocalDateTime now) {
        if (jwtRevokedTokensRepository.count() > 0) {
            return;
        }
        StaffUsers staff1 = staff("admin.nay");
        Customers cust1 = customer("CUS-001");
        if (missing(staff1, cust1)) {
            return;
        }

        List<JwtRevokedTokens> list = List.of(
                JwtRevokedTokens.builder()
                        .jti("demo-jti-0001")
                        .subjectType(SessionSubjectType.STAFF)
                        .staff(staff1)
                        .tokenExpiresAt(now.minusDays(1))
                        .revokedAt(now.minusDays(2))
                        .reason("PASSWORD_CHANGED")
                        .updatedByType(UpdatedByType.SYSTEM)
                        .updatedAt(now.minusDays(2))
                        .build(),
                JwtRevokedTokens.builder()
                        .jti("demo-jti-0002")
                        .subjectType(SessionSubjectType.CUSTOMER)
                        .customer(cust1)
                        .tokenExpiresAt(now.minusHours(6))
                        .revokedAt(now.minusHours(7))
                        .reason("LOGOUT")
                        .updatedByType(UpdatedByType.CUSTOMER)
                        .updatedAt(now.minusHours(7))
                        .build());

        jwtRevokedTokensRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] revoked JWTs seeded ({}).", list.size());
    }

    // ------------------------------------------------------------------
    // Notifications
    // ------------------------------------------------------------------

    private void seedNotifications(LocalDateTime now) {
        if (notificationRepository.count() > 0) {
            return;
        }
        Customers cust1 = customer("CUS-001");
        Customers cust2 = customer("CUS-002");
        BankTransactions t1 = tx("REF-T001");
        BankTransactions t50 = tx("REF-T050");
        if (missing(cust1, cust2)) {
            return;
        }

        List<Notifications> list = List.of(
                notification(cust1, t1, NotificationType.TRANSFER, "Transfer Successful",
                        "Your transfer of 5,000 MMK to 1001000002 was completed.", true, now.minusDays(30), now),
                notification(cust2, null, NotificationType.SECURITY, "New device sign-in",
                        "A new device signed in to your account. If this wasn't you, please contact support.",
                        false, now.minusDays(2), now),
                notification(cust1, null, NotificationType.SYSTEM, "Welcome to e-Banking",
                        "Thank you for registering for internet banking.", true, now.minusDays(60), now),
                notification(cust2, t1, NotificationType.TRANSFER, "Funds received",
                        "You received 5,000 MMK into 1001000002.", false, now.minusDays(30), now),
                notification(cust1, t50, NotificationType.PAYMENT, "Payment pending authorization",
                        "Your external payment of 28,000 MMK is awaiting approval.", false, now.minusHours(4), now),
                notification(cust2, null, NotificationType.PAYMENT, "Utility bill due",
                        "Your utility bill payment is due in 2 days.", false, now.minusDays(1), now));

        notificationRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] notifications seeded ({}).", list.size());
    }

    private Notifications notification(Customers customer, BankTransactions txn, NotificationType type,
                                       String title, String message, boolean read, LocalDateTime at,
                                       LocalDateTime now) {
        return Notifications.builder()
                .customer(customer)
                .transaction(txn)
                .notificationType(type)
                .title(title)
                .message(message)
                .isRead(read)
                .readAt(read ? at : null)
                .createdAt(at)
                .updatedAt(at)
                .build();
    }

    // ------------------------------------------------------------------
    // System parameters
    // ------------------------------------------------------------------

    private void seedSystemParameters(LocalDateTime now) {
        if (systemParametersRepository.count() > 0) {
            return;
        }
        StaffUsers staff1 = staff("admin.nay");
        if (missing(staff1)) {
            return;
        }

        List<SystemParameters> list = List.of(
                sysParam("MAX_LOGIN_ATTEMPTS", "5", "Maximum failed password attempts before lockout", staff1, now),
                sysParam("OTP_MAX_ATTEMPTS", "5", "Maximum OTP verification attempts", staff1, now),
                sysParam("DAILY_TRANSFER_LIMIT_DEFAULT", "10000000", "Default daily transfer limit (MMK)", staff1, now),
                sysParam("BASE_CURRENCY", "MMK", "Reporting base currency", staff1, now),
                sysParam("MINIMUM_BALANCE_SAVINGS", "0", "Minimum balance for savings accounts (MMK)", staff1, now));

        systemParametersRepository.saveAllAndFlush(list);
        log.info("[DemoDataSeeder] system parameters seeded ({}).", list.size());
    }

    private SystemParameters sysParam(String key, String value, String description,
                                      StaffUsers updatedBy, LocalDateTime now) {
        return SystemParameters.builder()
                .parameterKey(key)
                .parameterValue(value)
                .description(description)
                .updatedByStaff(updatedBy)
                .updatedByType(UpdatedByType.STAFF)
                .updatedAt(now.minusDays(90))
                .build();
    }
}