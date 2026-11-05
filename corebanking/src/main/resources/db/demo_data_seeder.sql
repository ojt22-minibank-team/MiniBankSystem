-- ============================================================
-- Demo data generated to mirror DemoDataSeeder.java
-- (broad demo data across non-reporting modules)
-- Safe to re-run: all inserts use INSERT IGNORE + fixed keys.
-- REQUIRES sample_data_seeder.sql to be run FIRST (staff,
-- customers, accounts, bank_transactions must exist).
-- ============================================================

SET @s1  = UUID_TO_BIN('aaaaaaaa-0000-0000-0000-000000000001'); -- admin.nay (STF-001)
SET @s2  = UUID_TO_BIN('aaaaaaaa-0000-0000-0000-000000000002'); -- teller.zin (STF-002)
SET @c1  = UUID_TO_BIN('bbbbbbbb-0000-0000-0000-000000000001'); -- CUS-001
SET @c2  = UUID_TO_BIN('bbbbbbbb-0000-0000-0000-000000000002'); -- CUS-002
SET @c3  = UUID_TO_BIN('bbbbbbbb-0000-0000-0000-000000000003'); -- CUS-003 (corporate)
SET @a1  = UUID_TO_BIN('cc000001-0000-0000-0000-000000000001'); -- 1001000001
SET @a2  = UUID_TO_BIN('cc000002-0000-0000-0000-000000000001'); -- 1001000002
SET @a3  = UUID_TO_BIN('cc000003-0000-0000-0000-000000000001'); -- 1001000003
SET @a5  = UUID_TO_BIN('cc000005-0000-0000-0000-000000000001'); -- 1001000005
SET @d1  = UUID_TO_BIN('dd000001-0000-0000-0000-000000000001'); -- 1002000001 (DORMANT)
SET @f1  = UUID_TO_BIN('ee000001-0000-0000-0000-000000000001'); -- 1003000001 (FROZEN)
SET @cl1 = UUID_TO_BIN('ff000001-0000-0000-0000-000000000001'); -- 1004000001 (CLOSED)
SET @t1  = UUID_TO_BIN('00000001-0000-0000-0000-000000000001'); -- REF-T001
SET @t3  = UUID_TO_BIN('00000003-0000-0000-0000-000000000001'); -- REF-T003
SET @t4  = UUID_TO_BIN('00000004-0000-0000-0000-000000000001'); -- REF-T004
SET @t29 = UUID_TO_BIN('00000029-0000-0000-0000-000000000001'); -- REF-T029
SET @t50 = UUID_TO_BIN('00000050-0000-0000-0000-000000000001'); -- REF-T050

-- ------------------------------------------------------------------
-- RBAC: roles, permissions, role-permission links
-- ------------------------------------------------------------------
INSERT IGNORE INTO roles
    (role_id, role_code, role_name, description, is_system_role, created_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, 'ADMIN', 'Administrator', 'Full system access', 1, NOW(), 'SYSTEM', NULL, NOW()),
    (2, 'TELLER', 'Teller', 'Counter operations and OTC transactions', 0, NOW(), 'SYSTEM', NULL, NOW()),
    (3, 'BRANCH_MANAGER', 'Branch Manager', 'Approvals and account management', 0, NOW(), 'SYSTEM', NULL, NOW()),
    (4, 'AUDITOR', 'Auditor', 'Read-only audit access', 0, NOW(), 'SYSTEM', NULL, NOW());

INSERT IGNORE INTO permissions
    (permission_id, permission_code, permission_name, description, created_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, 'CUSTOMER_CREATE', 'Create Customer', 'Register new customers', NOW(), 'SYSTEM', NULL, NOW()),
    (2, 'ACCOUNT_CREATE', 'Create Account', 'Open retail and corporate accounts', NOW(), 'SYSTEM', NULL, NOW()),
    (3, 'ACCOUNT_UPDATE', 'Update Account', 'Modify account details/status', NOW(), 'SYSTEM', NULL, NOW()),
    (4, 'TRANSACTION_INITIATE', 'Initiate Transaction', 'Start transfers and payments', NOW(), 'SYSTEM', NULL, NOW()),
    (5, 'TRANSACTION_APPROVE', 'Approve Transaction', 'Approve pending transactions', NOW(), 'SYSTEM', NULL, NOW()),
    (6, 'REPORT_VIEW', 'View Reports', 'Run and view reports', NOW(), 'SYSTEM', NULL, NOW()),
    (7, 'STAFF_MANAGE', 'Manage Staff', 'Create and manage staff users', NOW(), 'SYSTEM', NULL, NOW()),
    (8, 'ANNOUNCEMENT_MANAGE', 'Manage Announcements', 'Create/edit announcements', NOW(), 'SYSTEM', NULL, NOW());

INSERT IGNORE INTO role_permissions
    (role_id, permission_id, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, 1, 'SYSTEM', NULL, NOW()), (1, 2, 'SYSTEM', NULL, NOW()),
    (1, 3, 'SYSTEM', NULL, NOW()), (1, 4, 'SYSTEM', NULL, NOW()),
    (1, 5, 'SYSTEM', NULL, NOW()), (1, 6, 'SYSTEM', NULL, NOW()),
    (1, 7, 'SYSTEM', NULL, NOW()), (1, 8, 'SYSTEM', NULL, NOW()),
    (2, 1, 'SYSTEM', NULL, NOW()), (2, 2, 'SYSTEM', NULL, NOW()),
    (2, 3, 'SYSTEM', NULL, NOW()), (2, 4, 'SYSTEM', NULL, NOW()),
    (2, 6, 'SYSTEM', NULL, NOW()),
    (3, 1, 'SYSTEM', NULL, NOW()), (3, 2, 'SYSTEM', NULL, NOW()),
    (3, 3, 'SYSTEM', NULL, NOW()), (3, 4, 'SYSTEM', NULL, NOW()),
    (3, 5, 'SYSTEM', NULL, NOW()), (3, 6, 'SYSTEM', NULL, NOW()),
    (4, 6, 'SYSTEM', NULL, NOW());

-- ------------------------------------------------------------------
-- Staff <-> role links
-- ------------------------------------------------------------------
INSERT IGNORE INTO staff_user_roles
    (staff_id, role_id, assigned_by_staff_id, assigned_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (@s1, 1, @s1, NOW() - INTERVAL 90 DAY, 'STAFF', NULL, NOW() - INTERVAL 90 DAY),
    (@s2, 2, @s1, NOW() - INTERVAL 80 DAY, 'STAFF', NULL, NOW() - INTERVAL 80 DAY);

-- ------------------------------------------------------------------
-- Corporate customer + company profile + contact persons
-- ------------------------------------------------------------------
INSERT IGNORE INTO customers
    (customer_id, customer_code, customer_type, full_name, email, phone, address,
     status, created_by, created_at, updated_at)
VALUES
    (@c3, 'CUS-003', 'COMPANY', 'Golden Gate Trading Co., Ltd', 'contact@ggt.local',
     '09-300-000-01', 'No. 42, Bo Sun Pat Street, Pabedan Township, Yangon',
     'ACTIVE', @s1, NOW() - INTERVAL 65 DAY, NOW() - INTERVAL 65 DAY);

INSERT IGNORE INTO company_info
    (customer_id, company_name, registration_number, tax_id, business_type,
     incorporation_date, company_phone, company_email, address,
     city, state_region, country, created_at, updated_at)
VALUES
    (@c3, 'Golden Gate Trading Co., Ltd', 'REG-2024-0001', 'TAX-0001', 'IMPORT / EXPORT',
     '2020-05-15', '09-300-000-01', 'contact@ggt.local',
     'No. 42, Bo Sun Pat Street, Pabedan Township, Yangon',
     'Yangon', 'Yangon Region', 'Myanmar', NOW() - INTERVAL 65 DAY, NOW() - INTERVAL 65 DAY);

INSERT IGNORE INTO company_contact_persons
    (customer_id, contact_id, full_name, position, phone, email, is_primary, created_at, updated_at)
VALUES
    (@c3, 1, 'U Aung Hla', 'Chief Executive Officer', '09-300-000-11', 'ceo@ggt.local', 1,
     NOW() - INTERVAL 65 DAY, NOW() - INTERVAL 65 DAY),
    (@c3, 2, 'Daw Hla Hla Win', 'Chief Accountant', '09-300-000-12', 'account@ggt.local', 0,
     NOW() - INTERVAL 60 DAY, NOW() - INTERVAL 60 DAY);

-- ------------------------------------------------------------------
-- Personal (KYC) profiles for the two retail customers
-- ------------------------------------------------------------------
INSERT IGNORE INTO personal_info
    (customer_id, first_name, last_name, date_of_birth, gender, nrc,
     email, phone, occupation, address, city, state_region, country, created_at, updated_at)
VALUES
    (@c1, 'Kyaw Zin', 'Htun', '1995-04-12', 'MALE', '12/KATHANA(N)123456',
     'kyaw@mail.local', '09-200-000-01', 'Software Engineer',
     'No. 55, Insein Road, Mayangone Township, Yangon', 'Yangon', 'Yangon Region', 'Myanmar',
     NOW() - INTERVAL 80 DAY, NOW() - INTERVAL 80 DAY),
    (@c2, 'Su Myat', 'Noe', '1998-09-30', 'FEMALE', '5/PATHA(N)789012',
     'su@mail.local', '09-200-000-02', 'Business Owner',
     'No. 12, Pyay Road, Kamayut Township, Yangon', 'Yangon', 'Yangon Region', 'Myanmar',
     NOW() - INTERVAL 70 DAY, NOW() - INTERVAL 70 DAY);

-- ------------------------------------------------------------------
-- Customer login credentials (placeholder BCrypt hashes)
-- ------------------------------------------------------------------
INSERT IGNORE INTO customer_credentials
    (customer_id, password_hash, transaction_pin_hash, mfa_enabled, mfa_method,
     must_change_password, failed_login_count, failed_pin_attempt_count,
     token_version, created_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (@c1, '$2a$12$demo_password_0001', NULL, 1, 'EMAIL', 0, 0, 0, 1,
     NOW() - INTERVAL 60 DAY, 'SYSTEM', NULL, NOW() - INTERVAL 60 DAY),
    (@c2, '$2a$12$demo_password_0002', NULL, 1, 'EMAIL', 0, 0, 0, 1,
     NOW() - INTERVAL 60 DAY, 'SYSTEM', NULL, NOW() - INTERVAL 60 DAY),
    (@c3, '$2a$12$demo_password_0003', NULL, 1, 'EMAIL', 0, 0, 0, 1,
     NOW() - INTERVAL 60 DAY, 'SYSTEM', NULL, NOW() - INTERVAL 60 DAY);

-- ------------------------------------------------------------------
-- Announcements
-- ------------------------------------------------------------------
INSERT IGNORE INTO announcements
    (announcement_id, title, message, audience, is_active,
     starts_at, ends_at, created_by_staff_id, created_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, 'Scheduled System Maintenance',
     'Core banking system will be unavailable on Sunday 00:00-04:00 for scheduled maintenance.',
     'ALL', 1, NOW() - INTERVAL 1 DAY, NOW() + INTERVAL 5 DAY, @s1,
     NOW() - INTERVAL 1 DAY, NULL, NULL, NOW() - INTERVAL 1 DAY),
    (2, 'New Mobile App Features',
     'Bill payments and QR payments are now available in the customer portal.',
     'CUSTOMERS', 1, NOW() - INTERVAL 5 DAY, NOW() + INTERVAL 30 DAY, @s1,
     NOW() - INTERVAL 5 DAY, NULL, NULL, NOW() - INTERVAL 5 DAY),
    (3, 'Staff Training: Anti-Money Laundering',
     'Compulsory AML refresher training for all teller staff next Friday.',
     'STAFF', 1, NOW() - INTERVAL 2 DAY, NOW() + INTERVAL 8 DAY, @s1,
     NOW() - INTERVAL 2 DAY, NULL, NULL, NOW() - INTERVAL 2 DAY),
    (4, 'Transfer Fee Revision (Archived)',
     'Previous notice about transfer fee changes. Superseded.',
     'ALL', 0, NOW() - INTERVAL 60 DAY, NOW() - INTERVAL 30 DAY, @s1,
     NOW() - INTERVAL 60 DAY, NULL, NULL, NOW() - INTERVAL 30 DAY);

-- ------------------------------------------------------------------
-- Fee schedules
-- ------------------------------------------------------------------
INSERT IGNORE INTO fee_schedules
    (fee_schedule_id, fee_code, transaction_type, fee_type, fee_value,
     minimum_fee, maximum_fee, currency, active_from, is_active,
     created_by_staff_id, created_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, 'FEE-ITR', 'INTERNAL_TRANSFER', 'PERCENTAGE', 1.0000, 100.0000, 5000.0000,
     'MMK', NOW() - INTERVAL 90 DAY, 1, @s1, NOW() - INTERVAL 90 DAY, 'STAFF', NULL,
     NOW() - INTERVAL 90 DAY),
    (2, 'FEE-OTC-DEP', 'OTC_DEPOSIT', 'FLAT', 0.0000, NULL, NULL,
     'MMK', NOW() - INTERVAL 90 DAY, 1, @s1, NOW() - INTERVAL 90 DAY, 'STAFF', NULL,
     NOW() - INTERVAL 90 DAY),
    (3, 'FEE-OTC-WD', 'OTC_WITHDRAWAL', 'PERCENTAGE', 1.0000, 50.0000, 3000.0000,
     'MMK', NOW() - INTERVAL 90 DAY, 1, @s1, NOW() - INTERVAL 90 DAY, 'STAFF', NULL,
     NOW() - INTERVAL 90 DAY),
    (4, 'FEE-EXT', 'EXTERNAL_PAYMENT', 'PERCENTAGE', 1.0000, 100.0000, 10000.0000,
     'MMK', NOW() - INTERVAL 90 DAY, 1, @s1, NOW() - INTERVAL 90 DAY, 'STAFF', NULL,
     NOW() - INTERVAL 90 DAY),
    (5, 'FEE-LEDGER-ADJ', 'LEDGER_ADJUSTMENT', 'FLAT', 0.0000, NULL, NULL,
     'MMK', NOW() - INTERVAL 90 DAY, 1, @s1, NOW() - INTERVAL 90 DAY, 'STAFF', NULL,
     NOW() - INTERVAL 90 DAY);

-- ------------------------------------------------------------------
-- Ledger accounts and entries
-- ------------------------------------------------------------------
INSERT IGNORE INTO ledger_accounts
    (ledger_account_id, ledger_code, ledger_name, ledger_scope, account_class,
     currency, customer_account_id, system_key, status,
     created_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, 'LDG-CASH-01', 'Petty Cash MMK', 'INTERNAL', 'ASSET', 'MMK', NULL,
     'CASH-MMK', 'ACTIVE', NOW(), NULL, NULL, NOW() - INTERVAL 90 DAY),
    (2, 'LDG-FEE-01', 'Fee Income MMK', 'INTERNAL', 'REVENUE', 'MMK', NULL,
     'FEE-INCOME-MMK', 'ACTIVE', NOW(), NULL, NULL, NOW() - INTERVAL 90 DAY),
    (3, 'LDG-CLEAR-01', 'Interbank Clearing MMK', 'CLEARING', 'ASSET', 'MMK', NULL,
     'CLEARING-MMK', 'ACTIVE', NOW(), NULL, NULL, NOW() - INTERVAL 90 DAY),
    (4, 'LDG-GL-01', 'General Ledger MMK', 'INTERNAL', 'LIABILITY', 'MMK', NULL,
     'GL-MMK', 'ACTIVE', NOW(), NULL, NULL, NOW() - INTERVAL 90 DAY),
    (5, 'LDG-CUS-0001', 'Customer Ledger 1001000001', 'CUSTOMER', 'LIABILITY', 'MMK', @a1,
     'CUS-1001000001', 'ACTIVE', NOW(), NULL, NULL, NOW() - INTERVAL 90 DAY),
    (6, 'LDG-CUS-0002', 'Customer Ledger 1001000002', 'CUSTOMER', 'LIABILITY', 'MMK', @a2,
     'CUS-1001000002', 'ACTIVE', NOW(), NULL, NULL, NOW() - INTERVAL 90 DAY);

INSERT IGNORE INTO ledger_entries
    (ledger_entry_id, transaction_id, ledger_account_id, line_no, entry_type,
     amount, currency, balance_before, balance_after, narration, created_at)
VALUES
    (1, @t1, 6, 1, 'DEBIT', 5000.0000, 'MMK', 0, 5000.0000,
     'Transfer in to 1001000002', NOW()),
    (2, @t1, 5, 2, 'CREDIT', 5000.0000, 'MMK', 5000.0000, 0,
     'Transfer out from 1001000001', NOW()),
    (3, @t3, 1, 1, 'DEBIT', 8000.0000, 'MMK', 0, 8000.0000,
     'Cash deposit 1001000001', NOW()),
    (4, @t3, 5, 2, 'CREDIT', 8000.0000, 'MMK', 0, 8000.0000,
     'Cash deposit 1001000001', NOW());

-- ------------------------------------------------------------------
-- Beneficiaries
-- ------------------------------------------------------------------
INSERT IGNORE INTO beneficiaries
    (beneficiary_id, owner_account_id, beneficiary_account_id, nickname, is_active,
     created_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (UUID_TO_BIN('11111111-0000-0000-0000-000000000001'), @a1, @a2, 'Su Myat', 1,
     NOW() - INTERVAL 40 DAY, NULL, NULL, NOW() - INTERVAL 40 DAY),
    (UUID_TO_BIN('11111111-0000-0000-0000-000000000002'), @a2, @a3, 'Savings-3', 1,
     NOW() - INTERVAL 40 DAY, NULL, NULL, NOW() - INTERVAL 40 DAY),
    (UUID_TO_BIN('11111111-0000-0000-0000-000000000003'), @a1, @a3, 'Joint Savings', 1,
     NOW() - INTERVAL 40 DAY, NULL, NULL, NOW() - INTERVAL 40 DAY),
    (UUID_TO_BIN('11111111-0000-0000-0000-000000000004'), @a5, @a1, 'Sweep Account', 1,
     NOW() - INTERVAL 40 DAY, NULL, NULL, NOW() - INTERVAL 40 DAY);

-- ------------------------------------------------------------------
-- Account signatories
-- ------------------------------------------------------------------
INSERT IGNORE INTO account_signatories
    (signatory_id, account_id, customer_id, signatory_role,
     can_initiate, can_approve, approval_limit, status, created_at, updated_at)
VALUES
    (UUID_TO_BIN('22222222-0000-0000-0000-000000000001'), @a1, @c1, 'PRIMARY_HOLDER',
     1, 1, 1000000.0000, 'ACTIVE', NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 30 DAY),
    (UUID_TO_BIN('22222222-0000-0000-0000-000000000002'), @a1, @c2, 'JOINT_HOLDER',
     1, 0, 100000.0000, 'ACTIVE', NOW() - INTERVAL 28 DAY, NOW() - INTERVAL 28 DAY),
    (UUID_TO_BIN('22222222-0000-0000-0000-000000000003'), @a2, @c2, 'PRIMARY_HOLDER',
     1, 1, 500000.0000, 'ACTIVE', NOW() - INTERVAL 29 DAY, NOW() - INTERVAL 29 DAY);

-- ------------------------------------------------------------------
-- Account status history
-- ------------------------------------------------------------------
INSERT IGNORE INTO account_status_history
    (history_id, account_id, old_status, new_status, reason, changed_by_staff_id,
     changed_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, @d1, 'ACTIVE', 'DORMANT', 'No transactions for 30+ days', @s1,
     NOW() - INTERVAL 40 DAY, 'STAFF', NULL, NOW() - INTERVAL 40 DAY),
    (2, @f1, 'ACTIVE', 'FROZEN', 'Court freeze order received', @s1,
     NOW() - INTERVAL 28 DAY, 'STAFF', NULL, NOW() - INTERVAL 28 DAY),
    (3, @f1, 'FROZEN', 'FROZEN', 'Freeze extended by compliance', @s1,
     NOW() - INTERVAL 21 DAY, 'STAFF', NULL, NOW() - INTERVAL 21 DAY),
    (4, @cl1, 'ACTIVE', 'CLOSED', 'Account closed at customer request', @s1,
     NOW() - INTERVAL 10 DAY, 'STAFF', NULL, NOW() - INTERVAL 10 DAY);

-- ------------------------------------------------------------------
-- Account holds
-- ------------------------------------------------------------------
INSERT IGNORE INTO account_holds
    (hold_id, hold_ref, account_id, transaction_id, hold_type, amount, status,
     reason, created_at, expires_at, released_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (UUID_TO_BIN('33333333-0000-0000-0000-000000000001'), 'HOLD-0001', @a5, @t29,
     'TRANSFER_HOLD', 25000.0000, 'ACTIVE',
     'Awaiting joint approval for REF-T029',
     NOW() - INTERVAL 13 DAY, NOW() + INTERVAL 3 DAY, NULL, NULL, NULL,
     NOW() - INTERVAL 13 DAY),
    (UUID_TO_BIN('33333333-0000-0000-0000-000000000002'), 'HOLD-0002', @a1, NULL,
     'MERCHANT_AUTH', 18000.0000, 'RELEASED',
     'Merchant authorization settled',
     NOW() - INTERVAL 5 DAY, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 2 DAY, NULL, NULL,
     NOW() - INTERVAL 2 DAY),
    (UUID_TO_BIN('33333333-0000-0000-0000-000000000003'), 'HOLD-0003', @a3, NULL,
     'LEGAL_FREEZE', 6000.0000, 'SETTLED',
     'Court order resolved',
     NOW() - INTERVAL 9 DAY, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY, NULL, NULL,
     NOW() - INTERVAL 1 DAY);

-- ------------------------------------------------------------------
-- Transaction approvals
-- ------------------------------------------------------------------
INSERT IGNORE INTO transaction_approvals
    (approval_id, transaction_id, approver_customer_id, approval_status,
     pin_verified, decision_reason, decided_at, created_at)
VALUES
    (UUID_TO_BIN('44444444-0000-0000-0000-000000000001'), @t50, @c1,
     'PENDING', 1, NULL, NULL, NOW() - INTERVAL 4 HOUR),
    (UUID_TO_BIN('44444444-0000-0000-0000-000000000002'), @t29, @c2,
     'REJECTED', 1, 'Destination account under KYC review',
     NOW() - INTERVAL 12 DAY, NOW() - INTERVAL 13 DAY);

-- ------------------------------------------------------------------
-- Manual (OTC) transactions
-- ------------------------------------------------------------------
INSERT IGNORE INTO manual_transactions
    (manual_transaction_id, transaction_id, account_id, staff_id, operation_type,
     amount, reference_id, audit_note, created_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, @t3, @a1, @s2, 'CASH_DEPOSIT', 8000.0000, 'MANUAL-0001',
     'Counter cash deposit of 8,000 MMK to 1001000001',
     NOW() - INTERVAL 30 DAY, NULL, NULL, NOW() - INTERVAL 30 DAY),
    (2, @t4, @a3, @s2, 'CASH_WITHDRAWAL', 3000.0000, 'MANUAL-0002',
     'Counter cash withdrawal of 3,000 MMK from 1001000003',
     NOW() - INTERVAL 30 DAY, NULL, NULL, NOW() - INTERVAL 30 DAY);

-- ------------------------------------------------------------------
-- Auth sessions
-- ------------------------------------------------------------------
INSERT IGNORE INTO auth_sessions
    (session_id, session_uuid, subject_type, customer_id, staff_id,
     refresh_token_hash, token_version_at_issue, issued_at, last_seen_at,
     refresh_expires_at, idle_timeout_minutes, revoked_at, revoke_reason,
     ip_address, user_agent, updated_by_type, updated_by_id, updated_at)
VALUES
    (UUID_TO_BIN('55555555-0000-0000-0000-000000000001'),
     '55555555-1000-0000-0000-000000000001', 'STAFF', NULL, @s1,
     'demo-refresh-staff-1', 1, NOW() - INTERVAL 2 DAY, NOW() - INTERVAL 1 HOUR,
     NOW() + INTERVAL 5 DAY, 30, NULL, NULL,
     '192.168.1.10', 'Mozilla/5.0 Staff Portal', 'STAFF', NULL, NOW() - INTERVAL 1 HOUR),
    (UUID_TO_BIN('55555555-0000-0000-0000-000000000002'),
     '55555555-1000-0000-0000-000000000002', 'CUSTOMER', @c1, NULL,
     'demo-refresh-cust-1', 1, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 30 MINUTE,
     NOW() + INTERVAL 6 DAY, 15, NULL, NULL,
     '192.168.1.55', 'Mozilla/5.0 Customer Portal', 'CUSTOMER', NULL,
     NOW() - INTERVAL 30 MINUTE),
    (UUID_TO_BIN('55555555-0000-0000-0000-000000000003'),
     '55555555-1000-0000-0000-000000000003', 'STAFF', NULL, @s2,
     'demo-refresh-staff-2', 1, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 3 DAY,
     NOW() + INTERVAL 4 DAY, 30, NOW() - INTERVAL 2 DAY, 'Password changed',
     '192.168.1.11', 'Mozilla/5.0 Staff Portal', 'STAFF', NULL, NOW() - INTERVAL 2 DAY);

-- ------------------------------------------------------------------
-- Login attempts
-- ------------------------------------------------------------------
INSERT IGNORE INTO login_attempts
    (login_attempt_id, actor_type, login_identifier, customer_id, staff_id,
     success, failure_reason, ip_address, user_agent,
     attempted_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, 'STAFF', 'admin.nay', NULL, @s1, 1, NULL,
     '192.168.1.10', 'Mozilla/5.0 Portal', NOW() - INTERVAL 4 DAY, NULL, NULL,
     NOW() - INTERVAL 4 DAY),
    (2, 'STAFF', 'admin.nay', NULL, @s1, 0, 'Bad credentials',
     '192.168.1.10', 'Mozilla/5.0 Portal', NOW() - INTERVAL 3 DAY, NULL, NULL,
     NOW() - INTERVAL 3 DAY),
    (3, 'CUSTOMER', 'CUS-001', @c1, NULL, 1, NULL,
     '192.168.1.10', 'Mozilla/5.0 Portal', NOW() - INTERVAL 2 DAY, NULL, NULL,
     NOW() - INTERVAL 2 DAY),
    (4, 'CUSTOMER', 'CUS-001', @c1, NULL, 0, 'Invalid PIN',
     '192.168.1.10', 'Mozilla/5.0 Portal', NOW() - INTERVAL 1 DAY, NULL, NULL,
     NOW() - INTERVAL 1 DAY),
    (5, 'CUSTOMER', 'CUS-002', @c2, NULL, 1, NULL,
     '192.168.1.10', 'Mozilla/5.0 Portal', NOW() - INTERVAL 6 HOUR, NULL, NULL,
     NOW() - INTERVAL 6 HOUR);

-- ------------------------------------------------------------------
-- OTP challenges (placeholder BCrypt hashes)
-- ------------------------------------------------------------------
INSERT IGNORE INTO otp_challenges
    (otp_id, customer_id, transaction_id, purpose, otp_hash, delivery_channel,
     destination_masked, attempt_count, max_attempts, expires_at, consumed_at,
     status, challenge_group_id, last_sent_at, max_resend_attempts, resend_no,
     created_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, @c1, NULL, 'LOGIN', '$2a$12$demo_otp_0001', 'EMAIL', 'ky**@mail.local',
     0, 5, NOW() + INTERVAL 10 MINUTE, NULL,
     'ACTIVE', 'grp-login-001', NOW() - INTERVAL 1 MINUTE, 5, 0,
     NOW(), NULL, NULL, NOW() - INTERVAL 1 MINUTE),
    (2, @c1, NULL, 'PASSWORD_RESET', '$2a$12$demo_otp_0002', 'EMAIL', 'ky**@mail.local',
     0, 5, NOW() - INTERVAL 1 HOUR, NULL,
     'EXPIRED', 'grp-pass-001', NOW() - INTERVAL 3 HOUR, 5, 0,
     NOW(), NULL, NULL, NOW() - INTERVAL 1 HOUR),
    (3, @c2, NULL, 'LOGIN', '$2a$12$demo_otp_0003', 'EMAIL', 'su**@mail.local',
     0, 5, NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 1 DAY + INTERVAL 1 MINUTE,
     'CONSUMED', 'grp-login-002', NOW() - INTERVAL 1 DAY + INTERVAL 1 MINUTE, 5, 0,
     NOW(), NULL, NULL, NOW() - INTERVAL 1 DAY + INTERVAL 1 MINUTE),
    (4, @c1, @t29, 'TRANSFER', '$2a$12$demo_otp_0004', 'EMAIL', 'ky**@mail.local',
     0, 5, NOW() + INTERVAL 5 MINUTE, NULL,
     'ACTIVE', 'grp-tx-001', NOW() - INTERVAL 45 SECOND, 5, 0,
     NOW(), NULL, NULL, NOW() - INTERVAL 45 SECOND);

-- ------------------------------------------------------------------
-- Revoked JWTs
-- ------------------------------------------------------------------
INSERT IGNORE INTO jwt_revoked_tokens
    (revocation_id, jti, subject_type, customer_id, staff_id,
     token_expires_at, revoked_at, reason, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, 'demo-jti-0001', 'STAFF', NULL, @s1,
     NOW() - INTERVAL 1 DAY, NOW() - INTERVAL 2 DAY, 'PASSWORD_CHANGED',
     'SYSTEM', NULL, NOW() - INTERVAL 2 DAY),
    (2, 'demo-jti-0002', 'CUSTOMER', @c1, NULL,
     NOW() - INTERVAL 6 HOUR, NOW() - INTERVAL 7 HOUR, 'LOGOUT',
     'CUSTOMER', NULL, NOW() - INTERVAL 7 HOUR);

-- ------------------------------------------------------------------
-- Notifications
-- ------------------------------------------------------------------
INSERT IGNORE INTO notifications
    (notification_id, customer_id, transaction_id, notification_type, title,
     message, is_read, read_at, created_at, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, @c1, @t1, 'TRANSFER', 'Transfer Successful',
     'Your transfer of 5,000 MMK to 1001000002 was completed.',
     1, NOW() - INTERVAL 30 DAY, NOW() - INTERVAL 30 DAY, NULL, NULL,
     NOW() - INTERVAL 30 DAY),
    (2, @c2, NULL, 'SECURITY', 'New device sign-in',
     'A new device signed in to your account. If this wasn''t you, please contact support.',
     0, NULL, NOW() - INTERVAL 2 DAY, NULL, NULL, NOW() - INTERVAL 2 DAY),
    (3, @c1, NULL, 'SYSTEM', 'Welcome to e-Banking',
     'Thank you for registering for internet banking.',
     1, NOW() - INTERVAL 60 DAY, NOW() - INTERVAL 60 DAY, NULL, NULL,
     NOW() - INTERVAL 60 DAY),
    (4, @c2, @t1, 'TRANSFER', 'Funds received',
     'You received 5,000 MMK into 1001000002.',
     0, NULL, NOW() - INTERVAL 30 DAY, NULL, NULL, NOW() - INTERVAL 30 DAY),
    (5, @c1, @t50, 'PAYMENT', 'Payment pending authorization',
     'Your external payment of 28,000 MMK is awaiting approval.',
     0, NULL, NOW() - INTERVAL 4 HOUR, NULL, NULL, NOW() - INTERVAL 4 HOUR),
    (6, @c2, NULL, 'PAYMENT', 'Utility bill due',
     'Your utility bill payment is due in 2 days.',
     0, NULL, NOW() - INTERVAL 1 DAY, NULL, NULL, NOW() - INTERVAL 1 DAY);

-- ------------------------------------------------------------------
-- System parameters
-- ------------------------------------------------------------------
INSERT IGNORE INTO system_parameters
    (parameter_id, parameter_key, parameter_value, description,
     updated_by_staff_id, updated_by_type, updated_by_id, updated_at)
VALUES
    (1, 'MAX_LOGIN_ATTEMPTS', '5', 'Maximum failed password attempts before lockout',
     @s1, 'STAFF', NULL, NOW() - INTERVAL 90 DAY),
    (2, 'OTP_MAX_ATTEMPTS', '5', 'Maximum OTP verification attempts',
     @s1, 'STAFF', NULL, NOW() - INTERVAL 90 DAY),
    (3, 'DAILY_TRANSFER_LIMIT_DEFAULT', '10000000', 'Default daily transfer limit (MMK)',
     @s1, 'STAFF', NULL, NOW() - INTERVAL 90 DAY),
    (4, 'BASE_CURRENCY', 'MMK', 'Reporting base currency',
     @s1, 'STAFF', NULL, NOW() - INTERVAL 90 DAY),
    (5, 'MINIMUM_BALANCE_SAVINGS', '0', 'Minimum balance for savings accounts (MMK)',
     @s1, 'STAFF', NULL, NOW() - INTERVAL 90 DAY);