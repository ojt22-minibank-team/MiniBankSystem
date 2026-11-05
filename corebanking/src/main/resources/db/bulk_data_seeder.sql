-- ============================================================
-- BULK DATA SEEDER (STANDALONE SCRIPT - NO STORED PROCEDURES)
-- Generates:
--   - 1,000 Retail Customers (CUS-0001 .. CUS-1000)
--   - 1,000 Personal KYC Info profiles
--   - 1,000 Customer Credentials (Password: Password@123, PIN: 123456)
--   - 1,000 Bank Accounts (1001000001 .. 1001001000)
--   - 100,000 Bank Transactions (TXN-0000001 .. TXN-0100000)
--
-- Safe to re-run: All statements use standard INSERT IGNORE / ON DUPLICATE KEY UPDATE.
-- Can be run by any database user without ROUTINE / PROCEDURE privileges!
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Staff References
SET @s1 = UUID_TO_BIN('aaaaaaaa-0000-0000-0000-000000000001');
SET @s2 = UUID_TO_BIN('aaaaaaaa-0000-0000-0000-000000000002');

-- ------------------------------------------------------------
-- 1. Insert 1,000 Customers (CUS-0001 .. CUS-1000)
-- ------------------------------------------------------------
INSERT IGNORE INTO customers
    (customer_id, customer_code, customer_type, full_name, email, phone, address,
     status, created_by, created_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(seq.n), 12, '0'))),
    CONCAT('CUS-', LPAD(seq.n, 4, '0')),
    'PERSONAL',
    CONCAT(
        ELT((seq.n % 10) + 1, 'Aung ', 'Min ', 'Kyaw ', 'Thant ', 'Zin ', 'Soe ', 'Myo ', 'Htun ', 'Zaw ', 'Naing '),
        ELT(((seq.n + 3) % 10) + 1, 'Myat', 'Zin', 'Moe', 'Kyaw', 'Min', 'Htun', 'Naing', 'Soe', 'Win', 'Lin')
    ),
    CONCAT('customer', LPAD(seq.n, 4, '0'), '@mail.local'),
    CONCAT('09-7', LPAD(seq.n, 7, '0')),
    'Yangon, Myanmar',
    'ACTIVE',
    @s1,
    NOW() - INTERVAL 90 DAY,
    NOW() - INTERVAL 90 DAY
FROM (
    SELECT (d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
) seq;

-- ------------------------------------------------------------
-- 2. Insert 1,000 Personal KYC Info profiles
-- ------------------------------------------------------------
INSERT IGNORE INTO personal_info
    (customer_id, first_name, last_name, date_of_birth, gender, nrc,
     email, phone, occupation, address, city, state_region, country, created_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(seq.n), 12, '0'))),
    ELT((seq.n % 10) + 1, 'Aung', 'Min', 'Kyaw', 'Thant', 'Zin', 'Soe', 'Myo', 'Htun', 'Zaw', 'Naing'),
    ELT(((seq.n + 3) % 10) + 1, 'Myat', 'Zin', 'Moe', 'Kyaw', 'Min', 'Htun', 'Naing', 'Soe', 'Win', 'Lin'),
    DATE_SUB('1995-01-01', INTERVAL (seq.n * 5) DAY),
    IF(seq.n % 2 = 0, 'MALE', 'FEMALE'),
    CONCAT('12/DAGAMA(N)', LPAD(seq.n, 6, '0')),
    CONCAT('customer', LPAD(seq.n, 4, '0'), '@mail.local'),
    CONCAT('09-7', LPAD(seq.n, 7, '0')),
    ELT((seq.n % 5) + 1, 'Software Engineer', 'Civil Servant', 'Merchant', 'Accountant', 'Teacher'),
    'Yangon, Myanmar',
    'Yangon',
    'Yangon Region',
    'Myanmar',
    NOW() - INTERVAL 90 DAY,
    NOW() - INTERVAL 90 DAY
FROM (
    SELECT (d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
) seq;

-- ------------------------------------------------------------
-- 3. Insert 1,000 Customer Credentials (Password@123, PIN 123456)
-- ------------------------------------------------------------
INSERT INTO customer_credentials
    (customer_id, password_hash, transaction_pin_hash, mfa_enabled, mfa_method,
     must_change_password, failed_login_count, failed_pin_attempt_count,
     token_version, created_at, updated_by_type, updated_by_id, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(seq.n), 12, '0'))),
    '$2a$10$IHp.oAzDfFGfp72ILsRdd.pAhbiAs/Pw7Y4plGDhIQnmCw63N/Xc6', -- Password@123
    '$2a$10$F22irjSk1TrNuEFpP1sBG.vCZakozqyUpZSYUytkHebGyDF4w3xqK', -- PIN 123456
    1,
    'EMAIL',
    0,
    0,
    0,
    1,
    NOW() - INTERVAL 90 DAY,
    'SYSTEM',
    NULL,
    NOW() - INTERVAL 90 DAY
FROM (
    SELECT (d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
) seq
ON DUPLICATE KEY UPDATE
    password_hash = VALUES(password_hash),
    transaction_pin_hash = VALUES(transaction_pin_hash),
    failed_login_count = 0;

-- ------------------------------------------------------------
-- 4. Insert 1,000 Accounts (1001000001 .. 1001001000)
-- ------------------------------------------------------------
INSERT IGNORE INTO accounts
    (account_id, customer_id, account_number, account_category, account_type,
     is_joint_account, required_approvals, currency,
     current_balance, available_balance, minimum_balance, daily_transfer_limit,
     status, opened_at, closed_at, created_by_staff_id, created_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(seq.n), 12, '0'))),
    UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(seq.n), 12, '0'))),
    CONCAT('1001', LPAD(seq.n, 6, '0')),
    'RETAIL',
    IF(seq.n % 4 = 0, 'CURRENT', 'SAVINGS'),
    0,
    1,
    'MMK',
    1000000.0000 + (seq.n * 10000.0000),
    1000000.0000 + (seq.n * 10000.0000),
    0.0000,
    50000000.0000,
    'ACTIVE',
    NOW() - INTERVAL 90 DAY,
    NULL,
    @s1,
    NOW() - INTERVAL 90 DAY,
    NOW()
FROM (
    SELECT (d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
) seq;

-- ------------------------------------------------------------
-- 5. Insert 100,000 Transactions (in 10 safe batches of 10,000)
-- ------------------------------------------------------------

-- Batch 1 of 10: Transactions 1 to 10000
INSERT IGNORE INTO bank_transactions
    (transaction_id, transaction_ref, transaction_type, status,
     source_account_id, destination_account_id,
     amount, service_fee, currency,
     initiated_by_type, initiated_by_staff_id, initiated_by_customer_id,
     channel, description,
     initiated_at, authorized_at, completed_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('d0000000-0000-0000-0000-', LPAD(HEX(0 + seq.n), 12, '0'))),
    CONCAT('TXN-', LPAD(0 + seq.n, 7, '0')),
    CASE ((0 + seq.n) % 4)
        WHEN 0 THEN 'OTC_DEPOSIT'
        WHEN 1 THEN 'OTC_WITHDRAWAL'
        WHEN 2 THEN 'INTERNAL_TRANSFER'
        ELSE 'EXTERNAL_PAYMENT'
    END,
    'COMPLETED',
    -- source_account_id
    CASE ((0 + seq.n) % 4)
        WHEN 0 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((0 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    -- destination_account_id
    CASE ((0 + seq.n) % 4)
        WHEN 0 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((0 + seq.n - 1) % 1000) + 1), 12, '0')))
        WHEN 2 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX((0 + seq.n) % 1000 + 1), 12, '0')))
        ELSE NULL
    END,
    ROUND(1000.0000 + (((0 + seq.n) % 500) * 100.0000), 4),
    CASE ((0 + seq.n) % 4)
        WHEN 0 THEN 0.0000
        ELSE 100.0000
    END,
    'MMK',
    CASE ((0 + seq.n) % 4)
        WHEN 0 THEN 'STAFF'
        WHEN 1 THEN 'STAFF'
        ELSE 'CUSTOMER'
    END,
    CASE ((0 + seq.n) % 4)
        WHEN 0 THEN @s1
        WHEN 1 THEN @s2
        ELSE NULL
    END,
    CASE ((0 + seq.n) % 4)
        WHEN 0 THEN NULL
        WHEN 1 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(((0 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    CASE ((0 + seq.n) % 4)
        WHEN 0 THEN 'STAFF_PORTAL'
        WHEN 1 THEN 'STAFF_PORTAL'
        ELSE 'CUSTOMER_PORTAL'
    END,
    CONCAT(
        CASE ((0 + seq.n) % 4)
            WHEN 0 THEN 'Counter Cash Deposit'
            WHEN 1 THEN 'Counter Cash Withdrawal'
            WHEN 2 THEN 'P2P Fund Transfer'
            ELSE 'Online Merchant Payment'
        END,
        ' (TXN-', LPAD(0 + seq.n, 7, '0'), ')'
    ),
    NOW() - INTERVAL (100000 - (0 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (0 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (0 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (0 + seq.n)) * 75 SECOND
FROM (
    SELECT (d4.d * 1000 + d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
) seq;

-- Batch 2 of 10: Transactions 10001 to 20000
INSERT IGNORE INTO bank_transactions
    (transaction_id, transaction_ref, transaction_type, status,
     source_account_id, destination_account_id,
     amount, service_fee, currency,
     initiated_by_type, initiated_by_staff_id, initiated_by_customer_id,
     channel, description,
     initiated_at, authorized_at, completed_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('d0000000-0000-0000-0000-', LPAD(HEX(10000 + seq.n), 12, '0'))),
    CONCAT('TXN-', LPAD(10000 + seq.n, 7, '0')),
    CASE ((10000 + seq.n) % 4)
        WHEN 0 THEN 'OTC_DEPOSIT'
        WHEN 1 THEN 'OTC_WITHDRAWAL'
        WHEN 2 THEN 'INTERNAL_TRANSFER'
        ELSE 'EXTERNAL_PAYMENT'
    END,
    'COMPLETED',
    -- source_account_id
    CASE ((10000 + seq.n) % 4)
        WHEN 0 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((10000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    -- destination_account_id
    CASE ((10000 + seq.n) % 4)
        WHEN 0 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((10000 + seq.n - 1) % 1000) + 1), 12, '0')))
        WHEN 2 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX((10000 + seq.n) % 1000 + 1), 12, '0')))
        ELSE NULL
    END,
    ROUND(1000.0000 + (((10000 + seq.n) % 500) * 100.0000), 4),
    CASE ((10000 + seq.n) % 4)
        WHEN 0 THEN 0.0000
        ELSE 100.0000
    END,
    'MMK',
    CASE ((10000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF'
        WHEN 1 THEN 'STAFF'
        ELSE 'CUSTOMER'
    END,
    CASE ((10000 + seq.n) % 4)
        WHEN 0 THEN @s1
        WHEN 1 THEN @s2
        ELSE NULL
    END,
    CASE ((10000 + seq.n) % 4)
        WHEN 0 THEN NULL
        WHEN 1 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(((10000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    CASE ((10000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF_PORTAL'
        WHEN 1 THEN 'STAFF_PORTAL'
        ELSE 'CUSTOMER_PORTAL'
    END,
    CONCAT(
        CASE ((10000 + seq.n) % 4)
            WHEN 0 THEN 'Counter Cash Deposit'
            WHEN 1 THEN 'Counter Cash Withdrawal'
            WHEN 2 THEN 'P2P Fund Transfer'
            ELSE 'Online Merchant Payment'
        END,
        ' (TXN-', LPAD(10000 + seq.n, 7, '0'), ')'
    ),
    NOW() - INTERVAL (100000 - (10000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (10000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (10000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (10000 + seq.n)) * 75 SECOND
FROM (
    SELECT (d4.d * 1000 + d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
) seq;

-- Batch 3 of 10: Transactions 20001 to 30000
INSERT IGNORE INTO bank_transactions
    (transaction_id, transaction_ref, transaction_type, status,
     source_account_id, destination_account_id,
     amount, service_fee, currency,
     initiated_by_type, initiated_by_staff_id, initiated_by_customer_id,
     channel, description,
     initiated_at, authorized_at, completed_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('d0000000-0000-0000-0000-', LPAD(HEX(20000 + seq.n), 12, '0'))),
    CONCAT('TXN-', LPAD(20000 + seq.n, 7, '0')),
    CASE ((20000 + seq.n) % 4)
        WHEN 0 THEN 'OTC_DEPOSIT'
        WHEN 1 THEN 'OTC_WITHDRAWAL'
        WHEN 2 THEN 'INTERNAL_TRANSFER'
        ELSE 'EXTERNAL_PAYMENT'
    END,
    'COMPLETED',
    -- source_account_id
    CASE ((20000 + seq.n) % 4)
        WHEN 0 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((20000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    -- destination_account_id
    CASE ((20000 + seq.n) % 4)
        WHEN 0 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((20000 + seq.n - 1) % 1000) + 1), 12, '0')))
        WHEN 2 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX((20000 + seq.n) % 1000 + 1), 12, '0')))
        ELSE NULL
    END,
    ROUND(1000.0000 + (((20000 + seq.n) % 500) * 100.0000), 4),
    CASE ((20000 + seq.n) % 4)
        WHEN 0 THEN 0.0000
        ELSE 100.0000
    END,
    'MMK',
    CASE ((20000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF'
        WHEN 1 THEN 'STAFF'
        ELSE 'CUSTOMER'
    END,
    CASE ((20000 + seq.n) % 4)
        WHEN 0 THEN @s1
        WHEN 1 THEN @s2
        ELSE NULL
    END,
    CASE ((20000 + seq.n) % 4)
        WHEN 0 THEN NULL
        WHEN 1 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(((20000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    CASE ((20000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF_PORTAL'
        WHEN 1 THEN 'STAFF_PORTAL'
        ELSE 'CUSTOMER_PORTAL'
    END,
    CONCAT(
        CASE ((20000 + seq.n) % 4)
            WHEN 0 THEN 'Counter Cash Deposit'
            WHEN 1 THEN 'Counter Cash Withdrawal'
            WHEN 2 THEN 'P2P Fund Transfer'
            ELSE 'Online Merchant Payment'
        END,
        ' (TXN-', LPAD(20000 + seq.n, 7, '0'), ')'
    ),
    NOW() - INTERVAL (100000 - (20000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (20000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (20000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (20000 + seq.n)) * 75 SECOND
FROM (
    SELECT (d4.d * 1000 + d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
) seq;

-- Batch 4 of 10: Transactions 30001 to 40000
INSERT IGNORE INTO bank_transactions
    (transaction_id, transaction_ref, transaction_type, status,
     source_account_id, destination_account_id,
     amount, service_fee, currency,
     initiated_by_type, initiated_by_staff_id, initiated_by_customer_id,
     channel, description,
     initiated_at, authorized_at, completed_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('d0000000-0000-0000-0000-', LPAD(HEX(30000 + seq.n), 12, '0'))),
    CONCAT('TXN-', LPAD(30000 + seq.n, 7, '0')),
    CASE ((30000 + seq.n) % 4)
        WHEN 0 THEN 'OTC_DEPOSIT'
        WHEN 1 THEN 'OTC_WITHDRAWAL'
        WHEN 2 THEN 'INTERNAL_TRANSFER'
        ELSE 'EXTERNAL_PAYMENT'
    END,
    'COMPLETED',
    -- source_account_id
    CASE ((30000 + seq.n) % 4)
        WHEN 0 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((30000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    -- destination_account_id
    CASE ((30000 + seq.n) % 4)
        WHEN 0 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((30000 + seq.n - 1) % 1000) + 1), 12, '0')))
        WHEN 2 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX((30000 + seq.n) % 1000 + 1), 12, '0')))
        ELSE NULL
    END,
    ROUND(1000.0000 + (((30000 + seq.n) % 500) * 100.0000), 4),
    CASE ((30000 + seq.n) % 4)
        WHEN 0 THEN 0.0000
        ELSE 100.0000
    END,
    'MMK',
    CASE ((30000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF'
        WHEN 1 THEN 'STAFF'
        ELSE 'CUSTOMER'
    END,
    CASE ((30000 + seq.n) % 4)
        WHEN 0 THEN @s1
        WHEN 1 THEN @s2
        ELSE NULL
    END,
    CASE ((30000 + seq.n) % 4)
        WHEN 0 THEN NULL
        WHEN 1 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(((30000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    CASE ((30000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF_PORTAL'
        WHEN 1 THEN 'STAFF_PORTAL'
        ELSE 'CUSTOMER_PORTAL'
    END,
    CONCAT(
        CASE ((30000 + seq.n) % 4)
            WHEN 0 THEN 'Counter Cash Deposit'
            WHEN 1 THEN 'Counter Cash Withdrawal'
            WHEN 2 THEN 'P2P Fund Transfer'
            ELSE 'Online Merchant Payment'
        END,
        ' (TXN-', LPAD(30000 + seq.n, 7, '0'), ')'
    ),
    NOW() - INTERVAL (100000 - (30000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (30000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (30000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (30000 + seq.n)) * 75 SECOND
FROM (
    SELECT (d4.d * 1000 + d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
) seq;

-- Batch 5 of 10: Transactions 40001 to 50000
INSERT IGNORE INTO bank_transactions
    (transaction_id, transaction_ref, transaction_type, status,
     source_account_id, destination_account_id,
     amount, service_fee, currency,
     initiated_by_type, initiated_by_staff_id, initiated_by_customer_id,
     channel, description,
     initiated_at, authorized_at, completed_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('d0000000-0000-0000-0000-', LPAD(HEX(40000 + seq.n), 12, '0'))),
    CONCAT('TXN-', LPAD(40000 + seq.n, 7, '0')),
    CASE ((40000 + seq.n) % 4)
        WHEN 0 THEN 'OTC_DEPOSIT'
        WHEN 1 THEN 'OTC_WITHDRAWAL'
        WHEN 2 THEN 'INTERNAL_TRANSFER'
        ELSE 'EXTERNAL_PAYMENT'
    END,
    'COMPLETED',
    -- source_account_id
    CASE ((40000 + seq.n) % 4)
        WHEN 0 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((40000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    -- destination_account_id
    CASE ((40000 + seq.n) % 4)
        WHEN 0 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((40000 + seq.n - 1) % 1000) + 1), 12, '0')))
        WHEN 2 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX((40000 + seq.n) % 1000 + 1), 12, '0')))
        ELSE NULL
    END,
    ROUND(1000.0000 + (((40000 + seq.n) % 500) * 100.0000), 4),
    CASE ((40000 + seq.n) % 4)
        WHEN 0 THEN 0.0000
        ELSE 100.0000
    END,
    'MMK',
    CASE ((40000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF'
        WHEN 1 THEN 'STAFF'
        ELSE 'CUSTOMER'
    END,
    CASE ((40000 + seq.n) % 4)
        WHEN 0 THEN @s1
        WHEN 1 THEN @s2
        ELSE NULL
    END,
    CASE ((40000 + seq.n) % 4)
        WHEN 0 THEN NULL
        WHEN 1 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(((40000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    CASE ((40000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF_PORTAL'
        WHEN 1 THEN 'STAFF_PORTAL'
        ELSE 'CUSTOMER_PORTAL'
    END,
    CONCAT(
        CASE ((40000 + seq.n) % 4)
            WHEN 0 THEN 'Counter Cash Deposit'
            WHEN 1 THEN 'Counter Cash Withdrawal'
            WHEN 2 THEN 'P2P Fund Transfer'
            ELSE 'Online Merchant Payment'
        END,
        ' (TXN-', LPAD(40000 + seq.n, 7, '0'), ')'
    ),
    NOW() - INTERVAL (100000 - (40000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (40000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (40000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (40000 + seq.n)) * 75 SECOND
FROM (
    SELECT (d4.d * 1000 + d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
) seq;

-- Batch 6 of 10: Transactions 50001 to 60000
INSERT IGNORE INTO bank_transactions
    (transaction_id, transaction_ref, transaction_type, status,
     source_account_id, destination_account_id,
     amount, service_fee, currency,
     initiated_by_type, initiated_by_staff_id, initiated_by_customer_id,
     channel, description,
     initiated_at, authorized_at, completed_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('d0000000-0000-0000-0000-', LPAD(HEX(50000 + seq.n), 12, '0'))),
    CONCAT('TXN-', LPAD(50000 + seq.n, 7, '0')),
    CASE ((50000 + seq.n) % 4)
        WHEN 0 THEN 'OTC_DEPOSIT'
        WHEN 1 THEN 'OTC_WITHDRAWAL'
        WHEN 2 THEN 'INTERNAL_TRANSFER'
        ELSE 'EXTERNAL_PAYMENT'
    END,
    'COMPLETED',
    -- source_account_id
    CASE ((50000 + seq.n) % 4)
        WHEN 0 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((50000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    -- destination_account_id
    CASE ((50000 + seq.n) % 4)
        WHEN 0 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((50000 + seq.n - 1) % 1000) + 1), 12, '0')))
        WHEN 2 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX((50000 + seq.n) % 1000 + 1), 12, '0')))
        ELSE NULL
    END,
    ROUND(1000.0000 + (((50000 + seq.n) % 500) * 100.0000), 4),
    CASE ((50000 + seq.n) % 4)
        WHEN 0 THEN 0.0000
        ELSE 100.0000
    END,
    'MMK',
    CASE ((50000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF'
        WHEN 1 THEN 'STAFF'
        ELSE 'CUSTOMER'
    END,
    CASE ((50000 + seq.n) % 4)
        WHEN 0 THEN @s1
        WHEN 1 THEN @s2
        ELSE NULL
    END,
    CASE ((50000 + seq.n) % 4)
        WHEN 0 THEN NULL
        WHEN 1 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(((50000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    CASE ((50000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF_PORTAL'
        WHEN 1 THEN 'STAFF_PORTAL'
        ELSE 'CUSTOMER_PORTAL'
    END,
    CONCAT(
        CASE ((50000 + seq.n) % 4)
            WHEN 0 THEN 'Counter Cash Deposit'
            WHEN 1 THEN 'Counter Cash Withdrawal'
            WHEN 2 THEN 'P2P Fund Transfer'
            ELSE 'Online Merchant Payment'
        END,
        ' (TXN-', LPAD(50000 + seq.n, 7, '0'), ')'
    ),
    NOW() - INTERVAL (100000 - (50000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (50000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (50000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (50000 + seq.n)) * 75 SECOND
FROM (
    SELECT (d4.d * 1000 + d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
) seq;

-- Batch 7 of 10: Transactions 60001 to 70000
INSERT IGNORE INTO bank_transactions
    (transaction_id, transaction_ref, transaction_type, status,
     source_account_id, destination_account_id,
     amount, service_fee, currency,
     initiated_by_type, initiated_by_staff_id, initiated_by_customer_id,
     channel, description,
     initiated_at, authorized_at, completed_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('d0000000-0000-0000-0000-', LPAD(HEX(60000 + seq.n), 12, '0'))),
    CONCAT('TXN-', LPAD(60000 + seq.n, 7, '0')),
    CASE ((60000 + seq.n) % 4)
        WHEN 0 THEN 'OTC_DEPOSIT'
        WHEN 1 THEN 'OTC_WITHDRAWAL'
        WHEN 2 THEN 'INTERNAL_TRANSFER'
        ELSE 'EXTERNAL_PAYMENT'
    END,
    'COMPLETED',
    -- source_account_id
    CASE ((60000 + seq.n) % 4)
        WHEN 0 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((60000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    -- destination_account_id
    CASE ((60000 + seq.n) % 4)
        WHEN 0 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((60000 + seq.n - 1) % 1000) + 1), 12, '0')))
        WHEN 2 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX((60000 + seq.n) % 1000 + 1), 12, '0')))
        ELSE NULL
    END,
    ROUND(1000.0000 + (((60000 + seq.n) % 500) * 100.0000), 4),
    CASE ((60000 + seq.n) % 4)
        WHEN 0 THEN 0.0000
        ELSE 100.0000
    END,
    'MMK',
    CASE ((60000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF'
        WHEN 1 THEN 'STAFF'
        ELSE 'CUSTOMER'
    END,
    CASE ((60000 + seq.n) % 4)
        WHEN 0 THEN @s1
        WHEN 1 THEN @s2
        ELSE NULL
    END,
    CASE ((60000 + seq.n) % 4)
        WHEN 0 THEN NULL
        WHEN 1 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(((60000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    CASE ((60000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF_PORTAL'
        WHEN 1 THEN 'STAFF_PORTAL'
        ELSE 'CUSTOMER_PORTAL'
    END,
    CONCAT(
        CASE ((60000 + seq.n) % 4)
            WHEN 0 THEN 'Counter Cash Deposit'
            WHEN 1 THEN 'Counter Cash Withdrawal'
            WHEN 2 THEN 'P2P Fund Transfer'
            ELSE 'Online Merchant Payment'
        END,
        ' (TXN-', LPAD(60000 + seq.n, 7, '0'), ')'
    ),
    NOW() - INTERVAL (100000 - (60000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (60000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (60000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (60000 + seq.n)) * 75 SECOND
FROM (
    SELECT (d4.d * 1000 + d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
) seq;

-- Batch 8 of 10: Transactions 70001 to 80000
INSERT IGNORE INTO bank_transactions
    (transaction_id, transaction_ref, transaction_type, status,
     source_account_id, destination_account_id,
     amount, service_fee, currency,
     initiated_by_type, initiated_by_staff_id, initiated_by_customer_id,
     channel, description,
     initiated_at, authorized_at, completed_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('d0000000-0000-0000-0000-', LPAD(HEX(70000 + seq.n), 12, '0'))),
    CONCAT('TXN-', LPAD(70000 + seq.n, 7, '0')),
    CASE ((70000 + seq.n) % 4)
        WHEN 0 THEN 'OTC_DEPOSIT'
        WHEN 1 THEN 'OTC_WITHDRAWAL'
        WHEN 2 THEN 'INTERNAL_TRANSFER'
        ELSE 'EXTERNAL_PAYMENT'
    END,
    'COMPLETED',
    -- source_account_id
    CASE ((70000 + seq.n) % 4)
        WHEN 0 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((70000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    -- destination_account_id
    CASE ((70000 + seq.n) % 4)
        WHEN 0 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((70000 + seq.n - 1) % 1000) + 1), 12, '0')))
        WHEN 2 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX((70000 + seq.n) % 1000 + 1), 12, '0')))
        ELSE NULL
    END,
    ROUND(1000.0000 + (((70000 + seq.n) % 500) * 100.0000), 4),
    CASE ((70000 + seq.n) % 4)
        WHEN 0 THEN 0.0000
        ELSE 100.0000
    END,
    'MMK',
    CASE ((70000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF'
        WHEN 1 THEN 'STAFF'
        ELSE 'CUSTOMER'
    END,
    CASE ((70000 + seq.n) % 4)
        WHEN 0 THEN @s1
        WHEN 1 THEN @s2
        ELSE NULL
    END,
    CASE ((70000 + seq.n) % 4)
        WHEN 0 THEN NULL
        WHEN 1 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(((70000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    CASE ((70000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF_PORTAL'
        WHEN 1 THEN 'STAFF_PORTAL'
        ELSE 'CUSTOMER_PORTAL'
    END,
    CONCAT(
        CASE ((70000 + seq.n) % 4)
            WHEN 0 THEN 'Counter Cash Deposit'
            WHEN 1 THEN 'Counter Cash Withdrawal'
            WHEN 2 THEN 'P2P Fund Transfer'
            ELSE 'Online Merchant Payment'
        END,
        ' (TXN-', LPAD(70000 + seq.n, 7, '0'), ')'
    ),
    NOW() - INTERVAL (100000 - (70000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (70000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (70000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (70000 + seq.n)) * 75 SECOND
FROM (
    SELECT (d4.d * 1000 + d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
) seq;

-- Batch 9 of 10: Transactions 80001 to 90000
INSERT IGNORE INTO bank_transactions
    (transaction_id, transaction_ref, transaction_type, status,
     source_account_id, destination_account_id,
     amount, service_fee, currency,
     initiated_by_type, initiated_by_staff_id, initiated_by_customer_id,
     channel, description,
     initiated_at, authorized_at, completed_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('d0000000-0000-0000-0000-', LPAD(HEX(80000 + seq.n), 12, '0'))),
    CONCAT('TXN-', LPAD(80000 + seq.n, 7, '0')),
    CASE ((80000 + seq.n) % 4)
        WHEN 0 THEN 'OTC_DEPOSIT'
        WHEN 1 THEN 'OTC_WITHDRAWAL'
        WHEN 2 THEN 'INTERNAL_TRANSFER'
        ELSE 'EXTERNAL_PAYMENT'
    END,
    'COMPLETED',
    -- source_account_id
    CASE ((80000 + seq.n) % 4)
        WHEN 0 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((80000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    -- destination_account_id
    CASE ((80000 + seq.n) % 4)
        WHEN 0 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((80000 + seq.n - 1) % 1000) + 1), 12, '0')))
        WHEN 2 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX((80000 + seq.n) % 1000 + 1), 12, '0')))
        ELSE NULL
    END,
    ROUND(1000.0000 + (((80000 + seq.n) % 500) * 100.0000), 4),
    CASE ((80000 + seq.n) % 4)
        WHEN 0 THEN 0.0000
        ELSE 100.0000
    END,
    'MMK',
    CASE ((80000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF'
        WHEN 1 THEN 'STAFF'
        ELSE 'CUSTOMER'
    END,
    CASE ((80000 + seq.n) % 4)
        WHEN 0 THEN @s1
        WHEN 1 THEN @s2
        ELSE NULL
    END,
    CASE ((80000 + seq.n) % 4)
        WHEN 0 THEN NULL
        WHEN 1 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(((80000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    CASE ((80000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF_PORTAL'
        WHEN 1 THEN 'STAFF_PORTAL'
        ELSE 'CUSTOMER_PORTAL'
    END,
    CONCAT(
        CASE ((80000 + seq.n) % 4)
            WHEN 0 THEN 'Counter Cash Deposit'
            WHEN 1 THEN 'Counter Cash Withdrawal'
            WHEN 2 THEN 'P2P Fund Transfer'
            ELSE 'Online Merchant Payment'
        END,
        ' (TXN-', LPAD(80000 + seq.n, 7, '0'), ')'
    ),
    NOW() - INTERVAL (100000 - (80000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (80000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (80000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (80000 + seq.n)) * 75 SECOND
FROM (
    SELECT (d4.d * 1000 + d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
) seq;

-- Batch 10 of 10: Transactions 90001 to 100000
INSERT IGNORE INTO bank_transactions
    (transaction_id, transaction_ref, transaction_type, status,
     source_account_id, destination_account_id,
     amount, service_fee, currency,
     initiated_by_type, initiated_by_staff_id, initiated_by_customer_id,
     channel, description,
     initiated_at, authorized_at, completed_at, updated_at)
SELECT
    UUID_TO_BIN(CONCAT('d0000000-0000-0000-0000-', LPAD(HEX(90000 + seq.n), 12, '0'))),
    CONCAT('TXN-', LPAD(90000 + seq.n, 7, '0')),
    CASE ((90000 + seq.n) % 4)
        WHEN 0 THEN 'OTC_DEPOSIT'
        WHEN 1 THEN 'OTC_WITHDRAWAL'
        WHEN 2 THEN 'INTERNAL_TRANSFER'
        ELSE 'EXTERNAL_PAYMENT'
    END,
    'COMPLETED',
    -- source_account_id
    CASE ((90000 + seq.n) % 4)
        WHEN 0 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((90000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    -- destination_account_id
    CASE ((90000 + seq.n) % 4)
        WHEN 0 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX(((90000 + seq.n - 1) % 1000) + 1), 12, '0')))
        WHEN 2 THEN UUID_TO_BIN(CONCAT('c0000000-0000-0000-0000-', LPAD(HEX((90000 + seq.n) % 1000 + 1), 12, '0')))
        ELSE NULL
    END,
    ROUND(1000.0000 + (((90000 + seq.n) % 500) * 100.0000), 4),
    CASE ((90000 + seq.n) % 4)
        WHEN 0 THEN 0.0000
        ELSE 100.0000
    END,
    'MMK',
    CASE ((90000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF'
        WHEN 1 THEN 'STAFF'
        ELSE 'CUSTOMER'
    END,
    CASE ((90000 + seq.n) % 4)
        WHEN 0 THEN @s1
        WHEN 1 THEN @s2
        ELSE NULL
    END,
    CASE ((90000 + seq.n) % 4)
        WHEN 0 THEN NULL
        WHEN 1 THEN NULL
        ELSE UUID_TO_BIN(CONCAT('b0000000-0000-0000-0000-', LPAD(HEX(((90000 + seq.n - 1) % 1000) + 1), 12, '0')))
    END,
    CASE ((90000 + seq.n) % 4)
        WHEN 0 THEN 'STAFF_PORTAL'
        WHEN 1 THEN 'STAFF_PORTAL'
        ELSE 'CUSTOMER_PORTAL'
    END,
    CONCAT(
        CASE ((90000 + seq.n) % 4)
            WHEN 0 THEN 'Counter Cash Deposit'
            WHEN 1 THEN 'Counter Cash Withdrawal'
            WHEN 2 THEN 'P2P Fund Transfer'
            ELSE 'Online Merchant Payment'
        END,
        ' (TXN-', LPAD(90000 + seq.n, 7, '0'), ')'
    ),
    NOW() - INTERVAL (100000 - (90000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (90000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (90000 + seq.n)) * 75 SECOND,
    NOW() - INTERVAL (100000 - (90000 + seq.n)) * 75 SECOND
FROM (
    SELECT (d4.d * 1000 + d3.d * 100 + d2.d * 10 + d1.d + 1) AS n
    FROM (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
          UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d1
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d2
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d3
    CROSS JOIN (SELECT 0 AS d UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4
                UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9) d4
) seq;


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- END OF BULK DATA SEEDER
-- ============================================================
