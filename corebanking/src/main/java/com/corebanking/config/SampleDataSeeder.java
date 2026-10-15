package com.corebanking.config;

import com.corebanking.entity.Accounts;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.Customers;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.InitiatedByType;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.entity.enums.TransactionChannel;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.BankTransactionRepository;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.StaffUsersRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;

/**
 * Method 3 seeding strategy: a programmatic {@link CommandLineRunner} that inserts
 * reporting sample data through the JPA repositories on application startup.
 *
 * <p>Inspired by {@code db/sample_data_reporting.sql} and guarded so it only runs
 * once (skips when the seed marker {@link #SEED_STAFF_NO} already exists).</p>
 *
 * <p>Toggle with {@code app.seed.sample-data.enabled=true|false}.</p>
 */
@Slf4j
@Component
@Order(1)
@RequiredArgsConstructor
@ConditionalOnProperty(name = "app.seed.sample-data.enabled", havingValue = "true")
public class SampleDataSeeder implements CommandLineRunner {

    private static final String SEED_STAFF_NO = "STF-001";
    private static final String SEED_STAFF_PASSWORD = "Password@123";

    /** Balances (MMK) for the 30 ACTIVE accounts, mirroring the SQL script. */
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
    private final CusAuditLogsRepository auditLogsRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (staffUsersRepository.existsByStaffNo(SEED_STAFF_NO)) {
            log.info("[SampleDataSeeder] Seed marker {} already present - skipping.", SEED_STAFF_NO);
            return;
        }

        log.info("[SampleDataSeeder] Seeding reporting sample data ...");
        LocalDateTime now = LocalDateTime.now();

        StaffUsers staff1 = seedStaff("STF-001", "admin.nay", "Nay Min Thant",
                "nay@corebank.local", "09-111-111-01", now.minusDays(90));
        StaffUsers staff2 = seedStaff("STF-002", "teller.zin", "Zin Myo Oo",
                "zin@corebank.local", "09-111-111-02", now.minusDays(60));

        Customers cust1 = seedCustomer("CUS-001", "Kyaw Zin Htun", "kyaw@mail.local",
                "09-200-000-01", staff1, now.minusDays(80));
        Customers cust2 = seedCustomer("CUS-002", "Su Myat Noe", "su@mail.local",
                "09-200-000-02", staff1, now.minusDays(70));

        List<Accounts> accounts = seedAccounts(cust1, cust2, staff1, now);
        List<Accounts> active = accounts.subList(0, 30);

        seedTransactions(active, staff1, now);
        seedAuditLogs(staff1, staff2, now);

        log.info("[SampleDataSeeder] Done: {} staff, 2 customers, {} accounts, {} transactions, 100 audit logs.",
                staffUsersRepository.count(), accountRepository.count(),
                bankTransactionRepository.count());
    }

    // ------------------------------------------------------------------
    // SECTION 1: staff_users
    // ------------------------------------------------------------------

    private StaffUsers seedStaff(String staffNo, String username, String fullName,
                                 String email, String phone, LocalDateTime createdAt) {
        StaffUsers staff = StaffUsers.builder()
                .staffNo(staffNo)
                .username(username)
                .fullName(fullName)
                .email(email)
                .phone(phone)
                .passwordHash(passwordEncoder.encode(SEED_STAFF_PASSWORD))
                .mustChangePassword(false)
                .status(StaffUserStatus.ACTIVE)
                .failedLoginCount(0)
                .tokenVersion(1L)
                .createdAt(createdAt)
                .updatedAt(createdAt)
                .build();
        return staffUsersRepository.saveAndFlush(staff);
    }

    // ------------------------------------------------------------------
    // SECTION 2: customers
    // ------------------------------------------------------------------

    private Customers seedCustomer(String code, String fullName, String email,
                                   String phone, StaffUsers createdBy, LocalDateTime createdAt) {
        Customers customer = Customers.builder()
                .customerCode(code)
                .customerType(CustomerType.PERSONAL)
                .fullName(fullName)
                .email(email)
                .phone(phone)
                .status(CustomerStatus.ACTIVE)
                .createdBy(createdBy)
                .createdAt(createdAt)
                .updatedAt(createdAt)
                .build();
        return customerRepository.saveAndFlush(customer);
    }

    // ------------------------------------------------------------------
    // SECTION 3: accounts (30 ACTIVE, 10 DORMANT, 12 FROZEN, 8 CLOSED)
    // ------------------------------------------------------------------

    private List<Accounts> seedAccounts(Customers cust1, Customers cust2,
                                        StaffUsers staff, LocalDateTime now) {
        List<Accounts> accounts = new ArrayList<>();

        for (int i = 0; i < 30; i++) {
            accounts.add(newAccount(String.format("100100%04d", i + 1),
                    indexIn(i, 10, 15, 23, 26) ? AccountType.CURRENT : AccountType.SAVINGS,
                    ACTIVE_BALANCES[i], ACTIVE_BALANCES[i], AccountStatus.ACTIVE,
                    i % 2 == 0 ? cust1 : cust2, staff,
                    now.minusDays(30 - i), null));
        }

        for (int i = 0; i < 10; i++) {
            accounts.add(newAccount(String.format("100200%04d", i + 1),
                    (i == 4 || i == 5) ? AccountType.CURRENT : AccountType.SAVINGS,
                    DORMANT_BALANCES[i], DORMANT_BALANCES[i], AccountStatus.DORMANT,
                    i % 2 == 0 ? cust1 : cust2, staff,
                    now.minusDays(60 - i * 5L), null));
        }

        for (int i = 0; i < 12; i++) {
            accounts.add(newAccount(String.format("100300%04d", i + 1),
                    (i == 4 || i == 5) ? AccountType.CURRENT : AccountType.SAVINGS,
                    FROZEN_BALANCES[i], BigDecimal.ZERO, AccountStatus.FROZEN,
                    i % 2 == 0 ? cust1 : cust2, staff,
                    now.minusDays(75 - i * 5L), null));
        }

        for (int i = 0; i < 8; i++) {
            accounts.add(newAccount(String.format("100400%04d", i + 1),
                    i < 4 ? AccountType.SAVINGS : AccountType.CURRENT,
                    BigDecimal.ZERO, BigDecimal.ZERO, AccountStatus.CLOSED,
                    i % 2 == 0 ? cust1 : cust2, staff,
                    now.minusDays(90 - i * 5L), now.minusDays(10 - i)));
        }

        return accountRepository.saveAllAndFlush(accounts);
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

    /** True when {@code i} falls inside any of the given [start, end) ranges. */
    private boolean indexIn(int i, int... bounds) {
        for (int b = 0; b < bounds.length; b += 2) {
            if (i >= bounds[b] && i < bounds[b + 1]) {
                return true;
            }
        }
        return false;
    }

    // ------------------------------------------------------------------
    // SECTION 4: bank_transactions (target: 500 rows over the last 90 days)
    // Distributed across all 30 ACTIVE accounts with a realistic mix of
    // types, statuses and amounts. Deterministic via a fixed random seed.
    // ------------------------------------------------------------------

    /** Total transactions generated (5 fixed anchors + 1495 generated rows). */
    private static final int TARGET_TRANSACTIONS = 1500;

    /** Transaction refs reserved for the fixed anchor rows used elsewhere. */
    private static final int[] ANCHOR_REFS = {1, 3, 4, 29, 50};

    private void seedTransactions(List<Accounts> active, StaffUsers staff, LocalDateTime now) {
        List<BankTransactions> transactions = new ArrayList<>(TARGET_TRANSACTIONS);

        // Fixed anchor rows: referenced by DemoDataSeeder (ledger entries, holds,
        // approvals, manual transactions) and mirrored by the SQL sample.
        transactions.add(transaction("REF-T001", TransactionType.INTERNAL_TRANSFER,
                TransactionStatus.COMPLETED, active.get(0), active.get(1),
                BigDecimal.valueOf(5000), true, now.minusDays(30), staff));
        transactions.add(transaction("REF-T003", TransactionType.OTC_DEPOSIT,
                TransactionStatus.COMPLETED, null, active.get(0),
                BigDecimal.valueOf(8000), false, now.minusDays(30), staff));
        transactions.add(transaction("REF-T004", TransactionType.OTC_WITHDRAWAL,
                TransactionStatus.COMPLETED, active.get(2), null,
                BigDecimal.valueOf(3000), true, now.minusDays(30), staff));
        transactions.add(transaction("REF-T029", TransactionType.INTERNAL_TRANSFER,
                TransactionStatus.PENDING_AUTHORIZATION, active.get(4), active.get(2),
                BigDecimal.valueOf(25000), true, now.minusDays(13), staff));
        transactions.add(transaction("REF-T050", TransactionType.EXTERNAL_PAYMENT,
                TransactionStatus.PENDING_AUTHORIZATION, active.get(2), null,
                BigDecimal.valueOf(28000), true, now.minusHours(4), staff));

        TransactionType[] typeMix = weightedTypeMix();
        Random random = new Random(20260101L);

        for (int ref = 1; transactions.size() < TARGET_TRANSACTIONS; ref++) {
            if (isAnchorRef(ref)) {
                continue;
            }

            TransactionType type = typeMix[random.nextInt(typeMix.length)];
            TransactionStatus status = randomStatus(type, random);
            LocalDateTime at = now.minusDays(random.nextInt(90) + 1)
                    .minusHours(random.nextInt(24))
                    .minusMinutes(random.nextInt(60));

            int sourceIndex = random.nextInt(active.size());
            int destinationIndex = random.nextInt(active.size() - 1);
            if (destinationIndex >= sourceIndex) {
                destinationIndex++;
            }

            Accounts source;
            Accounts destination;
            boolean chargeFee;
            BigDecimal amount;

            if (type == TransactionType.OTC_DEPOSIT) {
                source = null;
                destination = active.get(sourceIndex);
                amount = randomAmount(random, 500, 300_000);
                chargeFee = false;
            } else if (type == TransactionType.OTC_WITHDRAWAL) {
                source = active.get(sourceIndex);
                destination = null;
                amount = randomAmount(random, 500, 300_000);
                chargeFee = true;
            } else if (type == TransactionType.EXTERNAL_PAYMENT) {
                source = active.get(sourceIndex);
                destination = null;
                amount = randomAmount(random, 2_000, 1_000_000);
                chargeFee = true;
            } else if (type == TransactionType.REFUND) {
                source = null;
                destination = active.get(sourceIndex);
                amount = randomAmount(random, 500, 50_000);
                chargeFee = false;
            } else if (type == TransactionType.LEDGER_ADJUSTMENT) {
                boolean debit = random.nextBoolean();
                source = debit ? active.get(sourceIndex) : null;
                destination = debit ? null : active.get(sourceIndex);
                amount = randomAmount(random, 100, 20_000);
                chargeFee = false;
            } else { // INTERNAL_TRANSFER
                source = active.get(sourceIndex);
                destination = active.get(destinationIndex);
                amount = randomAmount(random, 1_000, 500_000);
                chargeFee = true;
            }

            transactions.add(transaction(String.format("REF-T%03d", ref), type, status,
                    source, destination, amount, chargeFee, at, staff));
        }

        bankTransactionRepository.saveAllAndFlush(transactions);
    }

    private boolean isAnchorRef(int ref) {
        for (int anchor : ANCHOR_REFS) {
            if (anchor == ref) {
                return true;
            }
        }
        return false;
    }

    /** ~100 entries weighting the realistic mix of transaction types. */
    private TransactionType[] weightedTypeMix() {
        List<TransactionType> mix = new ArrayList<>(100);
        for (int i = 0; i < 30; i++) mix.add(TransactionType.INTERNAL_TRANSFER);
        for (int i = 0; i < 17; i++) mix.add(TransactionType.OTC_DEPOSIT);
        for (int i = 0; i < 17; i++) mix.add(TransactionType.OTC_WITHDRAWAL);
        for (int i = 0; i < 16; i++) mix.add(TransactionType.EXTERNAL_PAYMENT);
        for (int i = 0; i < 10; i++) mix.add(TransactionType.REFUND);
        for (int i = 0; i < 10; i++) mix.add(TransactionType.LEDGER_ADJUSTMENT);
        return mix.toArray(new TransactionType[0]);
    }

    /** Type-aware status distribution: the bulk settle, a few fail or stay pending. */
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
        // LEDGER_ADJUSTMENT
        return roll < 95 ? TransactionStatus.COMPLETED : TransactionStatus.PENDING_AUTHORIZATION;
    }

    /** Random MMK amount in [min, max] rounded to the nearest 100. */
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
    // SECTION 5: audit_logs (100 rows)
    // ------------------------------------------------------------------

    private void seedAuditLogs(StaffUsers staff1, StaffUsers staff2, LocalDateTime now) {
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
    }
}
