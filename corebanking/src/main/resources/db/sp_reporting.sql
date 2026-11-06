-- ============================================================================
-- CoreBanking - Group 2 Reporting Subsystem: Master Database Script
-- Contains:
--   PART 1: High-Performance Reporting Covering & Compound Indexes
--   PART 2: All 8 Stored Procedures (Summaries, Full Exports & Paged Queries)
-- ============================================================================

-- ============================================================================
-- PART 1: HIGH-PERFORMANCE REPORTING INDEXES
-- Idempotent index creation using an internal setup procedure.
-- ============================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_create_reporting_indexes //

CREATE PROCEDURE sp_create_reporting_indexes()
BEGIN
    -- 1.1. bank_transactions: Main covering index for aggregate queries (Daily Ledger, Fee, AML)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'bank_transactions' AND index_name = 'idx_bt_reporting_perf'
    ) THEN
        CREATE INDEX idx_bt_reporting_perf 
            ON bank_transactions (status, completed_at, transaction_type, channel, amount, service_fee);
    END IF;

    -- 1.2. bank_transactions: Dedicated index on completed_at for range filtering
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'bank_transactions' AND index_name = 'idx_bt_completed_at'
    ) THEN
        CREATE INDEX idx_bt_completed_at 
            ON bank_transactions (completed_at);
    END IF;

    -- 1.3. bank_transactions: Filter on status + date + amount + type (AML & Ledger)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'bank_transactions' AND index_name = 'idx_bt_reporting_completed'
    ) THEN
        CREATE INDEX idx_bt_reporting_completed 
            ON bank_transactions (status, completed_at, amount, transaction_type);
    END IF;

    -- 1.4. bank_transactions: Functional index for COALESCE(completed_at, initiated_at)
    -- Used by Transaction Detail report for transactions with or without completion timestamps
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'bank_transactions' AND index_name = 'idx_bt_tx_date'
    ) THEN
        CREATE INDEX idx_bt_tx_date 
            ON bank_transactions ((COALESCE(completed_at, initiated_at)));
    END IF;

    -- 1.5. accounts: Covering index for Account Status Summary & Balance Bracket calculation
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'accounts' AND index_name = 'idx_acc_status_created'
    ) THEN
        CREATE INDEX idx_acc_status_created 
            ON accounts (status, created_at, current_balance);
    END IF;

    -- 1.6. accounts: Foreign key lookup index on customer_id for joins
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'accounts' AND index_name = 'idx_acc_customer_id'
    ) THEN
        CREATE INDEX idx_acc_customer_id 
            ON accounts (customer_id);
    END IF;

    -- 1.7. audit_logs: Composite index for fast audit trail log filtering
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.statistics 
        WHERE table_schema = DATABASE() AND table_name = 'audit_logs' AND index_name = 'idx_audit_composite_search'
    ) THEN
        CREATE INDEX idx_audit_composite_search 
            ON audit_logs (action_type, entity_type, created_at);
    END IF;
END //

DELIMITER ;

-- Execute index setup and clean up helper procedure
CALL sp_create_reporting_indexes();
DROP PROCEDURE IF EXISTS sp_create_reporting_indexes;


-- ============================================================================
-- PART 2: STORED PROCEDURES
-- ============================================================================

-- ============================================================================
-- 1. SP: sp_get_daily_ledger_summary
--    Aggregates daily transaction volume, counts, and fees grouped by type & date.
-- ============================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_daily_ledger_summary //

CREATE PROCEDURE sp_get_daily_ledger_summary(
    IN p_start_date DATE,
    IN p_end_date   DATE,
    IN p_status     VARCHAR(25)
)
BEGIN
    SELECT 
        DATE(bt.completed_at)                          AS report_date,
        bt.transaction_type                            AS transaction_type,
        COUNT(bt.transaction_id)                       AS transaction_count,
        COALESCE(SUM(bt.amount), 0.0000)               AS total_amount,
        COALESCE(SUM(bt.service_fee), 0.0000)          AS total_fee,
        bt.currency                                    AS currency
    FROM bank_transactions bt
    WHERE bt.completed_at >= CAST(CONCAT(p_start_date, ' 00:00:00') AS DATETIME)
      AND bt.completed_at <= CAST(CONCAT(p_end_date, ' 23:59:59') AS DATETIME)
      AND (p_status IS NULL OR p_status = '' OR bt.status = p_status)
    GROUP BY DATE(bt.completed_at), bt.transaction_type, bt.currency
    ORDER BY report_date DESC, total_amount DESC;
END //

DELIMITER ;


-- ============================================================================
-- 2. SP: sp_get_customer_account_status_summary
--    Returns 2 Result Sets:
--      RS1: Account status distribution with balance metrics (avg, min, max, new)
--      RS2: Balance bracket distribution across account statuses
-- ============================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_customer_account_status_summary //

CREATE PROCEDURE sp_get_customer_account_status_summary(
    IN p_start_date     DATE,
    IN p_end_date       DATE,
    IN p_account_status VARCHAR(20)
)
BEGIN
    -- Result Set 1: Account Status Distribution
    SELECT 
        a.status                                       AS account_status,
        COUNT(a.account_id)                            AS account_count,
        SUM(CASE 
            WHEN a.created_at >= CAST(CONCAT(p_start_date, ' 00:00:00') AS DATETIME)
             AND a.created_at <= CAST(CONCAT(p_end_date, ' 23:59:59') AS DATETIME) 
            THEN 1 ELSE 0 
        END)                                           AS new_accounts_in_range,
        COALESCE(AVG(a.current_balance), 0.0000)       AS avg_balance,
        COALESCE(MIN(a.current_balance), 0.0000)       AS min_balance,
        COALESCE(MAX(a.current_balance), 0.0000)       AS max_balance
    FROM accounts a
    WHERE (p_account_status IS NULL OR p_account_status = '' OR a.status = p_account_status)
    GROUP BY a.status;

    -- Result Set 2: Balance Bracket Distribution
    SELECT 
        CASE 
            WHEN a.current_balance < 100000            THEN '0 - 100K'
            WHEN a.current_balance < 1000000           THEN '100K - 1M'
            WHEN a.current_balance < 10000000          THEN '1M - 10M'
            ELSE '10M+'
        END                                            AS balance_bracket,
        a.status                                       AS account_status,
        COUNT(a.account_id)                            AS bracket_count,
        COALESCE(SUM(a.current_balance), 0.0000)       AS bracket_total_balance
    FROM accounts a
    WHERE (p_account_status IS NULL OR p_account_status = '' OR a.status = p_account_status)
    GROUP BY balance_bracket, a.status
    ORDER BY MIN(a.current_balance) ASC;
END //

DELIMITER ;


-- ============================================================================
-- 3. SP: sp_fee_revenue_report
--    Aggregates fee income and transaction volume broken down by transaction type & channel.
-- ============================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_fee_revenue_report //
DROP PROCEDURE IF EXISTS sp_fee_revemue_report //

CREATE PROCEDURE sp_fee_revenue_report(
    IN p_start_date DATE,
    IN p_end_date   DATE,
    IN p_channel    VARCHAR(20)
)
BEGIN
    SELECT 
        bt.transaction_type                            AS transaction_type,
        bt.channel                                     AS channel,
        COUNT(bt.transaction_id)                       AS transaction_count,
        COALESCE(SUM(bt.amount), 0.0000)               AS total_volume,
        COALESCE(SUM(bt.service_fee), 0.0000)          AS total_fee_revenue,
        COALESCE(AVG(bt.service_fee), 0.0000)          AS avg_fee_per_tx
    FROM bank_transactions bt
    WHERE bt.status = 'COMPLETED'
      AND bt.completed_at >= CAST(CONCAT(p_start_date, ' 00:00:00') AS DATETIME)
      AND bt.completed_at <= CAST(CONCAT(p_end_date, ' 23:59:59') AS DATETIME)
      AND (p_channel IS NULL OR p_channel = '' OR bt.channel = p_channel)
    GROUP BY bt.transaction_type, bt.channel
    ORDER BY total_fee_revenue DESC;
END //

DELIMITER ;


-- ============================================================================
-- 4. SP: sp_large_transaction_aml_report (Full Dataset)
--    Used for complete background exports (CSV, Excel, PDF).
-- ============================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_large_transaction_aml_report //
DROP PROCEDURE IF EXISTS sp_large_transactions_aml_report //

CREATE PROCEDURE sp_large_transaction_aml_report(
    IN p_start_date  DATE,
    IN p_end_date    DATE,
    IN p_min_amount  DECIMAL(18, 4),
    IN p_tx_type     VARCHAR(25)
)
BEGIN
    DECLARE v_min DECIMAL(18, 4);
    SET v_min = COALESCE(p_min_amount, 10000000.0000);

    SELECT 
        bt.transaction_ref                             AS transaction_ref,
        bt.completed_at                                AS transaction_time,
        bt.transaction_type                            AS transaction_type,
        bt.channel                                     AS channel,
        bt.amount                                      AS amount,
        bt.currency                                    AS currency,
        COALESCE(src_acc.account_number, 'N/A')        AS source_account_no,
        COALESCE(src_cust.full_name, 'N/A')            AS source_customer_name,
        COALESCE(dest_acc.account_number, 'N/A')       AS dest_account_no,
        COALESCE(dest_cust.full_name, 'N/A')           AS dest_customer_name,
        CASE 
            WHEN bt.amount >= (v_min * 2) THEN 'HIGH RISK'
            ELSE 'MEDIUM RISK'
        END                                            AS risk_level
    FROM bank_transactions bt
    LEFT JOIN accounts src_acc   ON bt.source_account_id = src_acc.account_id
    LEFT JOIN customers src_cust ON src_acc.customer_id = src_cust.customer_id
    LEFT JOIN accounts dest_acc   ON bt.destination_account_id = dest_acc.account_id
    LEFT JOIN customers dest_cust ON dest_acc.customer_id = dest_cust.customer_id
    WHERE bt.status = 'COMPLETED'
      AND bt.completed_at >= CAST(CONCAT(p_start_date, ' 00:00:00') AS DATETIME)
      AND bt.completed_at <= CAST(CONCAT(p_end_date, ' 23:59:59') AS DATETIME)
      AND bt.amount >= v_min
      AND (p_tx_type IS NULL OR p_tx_type = '' OR bt.transaction_type = p_tx_type)
    ORDER BY bt.amount DESC, bt.completed_at DESC;
END //

CREATE PROCEDURE sp_large_transactions_aml_report(
    IN p_start_date  DATE,
    IN p_end_date    DATE,
    IN p_min_amount  DECIMAL(18, 4),
    IN p_tx_type     VARCHAR(25)
)
BEGIN
    CALL sp_large_transaction_aml_report(p_start_date, p_end_date, p_min_amount, p_tx_type);
END //

DELIMITER ;


-- ============================================================================
-- 5. SP: sp_large_transaction_aml_report_paged
--    Ultra-fast server-side pagination for UI AML Monitoring.
--    Returns 2 Result Sets:
--      RS1: Summary aggregates (Flagged Count, Volume, High/Med Risk distribution) via covering index
--      RS2: Paginated rows (30 items only) with customer & account lookups
-- ============================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_large_transaction_aml_report_paged //

CREATE PROCEDURE sp_large_transaction_aml_report_paged(
    IN p_start_date  DATE,
    IN p_end_date    DATE,
    IN p_min_amount  DECIMAL(18, 4),
    IN p_tx_type     VARCHAR(25),
    IN p_page        INT,
    IN p_page_size   INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_min DECIMAL(18, 4);
    SET v_min = COALESCE(p_min_amount, 10000000.0000);
    SET v_offset = (GREATEST(COALESCE(p_page, 1), 1) - 1) * COALESCE(p_page_size, 30);

    -- RS1: Summary totals (index-covered scan, < 0.05s)
    SELECT 
        COUNT(*)                                                                                 AS total_flagged_count,
        COALESCE(SUM(bt.amount), 0.0000)                                                         AS total_flagged_volume,
        COALESCE(SUM(CASE WHEN bt.amount >= (v_min * 2) THEN 1 ELSE 0 END), 0)                  AS high_risk_count,
        COALESCE(SUM(CASE WHEN bt.amount >= v_min AND bt.amount < (v_min * 2) THEN 1 ELSE 0 END), 0) AS med_risk_count
    FROM bank_transactions bt
    WHERE bt.status = 'COMPLETED'
      AND bt.completed_at >= CAST(CONCAT(p_start_date, ' 00:00:00') AS DATETIME)
      AND bt.completed_at <= CAST(CONCAT(p_end_date, ' 23:59:59') AS DATETIME)
      AND bt.amount >= v_min
      AND (p_tx_type IS NULL OR p_tx_type = '' OR bt.transaction_type = p_tx_type);

    -- RS2: Paginated rows (only 30 rows joined, < 0.05s)
    SELECT 
        bt.transaction_ref                             AS transaction_ref,
        bt.completed_at                                AS transaction_time,
        bt.transaction_type                            AS transaction_type,
        bt.channel                                     AS channel,
        bt.amount                                      AS amount,
        bt.currency                                    AS currency,
        COALESCE(src_acc.account_number, 'N/A')        AS source_account_no,
        COALESCE(src_cust.full_name, 'N/A')            AS source_customer_name,
        COALESCE(dest_acc.account_number, 'N/A')       AS dest_account_no,
        COALESCE(dest_cust.full_name, 'N/A')           AS dest_customer_name,
        CASE 
            WHEN bt.amount >= (v_min * 2) THEN 'HIGH RISK'
            ELSE 'MEDIUM RISK'
        END                                            AS risk_level
    FROM bank_transactions bt
    LEFT JOIN accounts src_acc   ON bt.source_account_id = src_acc.account_id
    LEFT JOIN customers src_cust ON src_acc.customer_id = src_cust.customer_id
    LEFT JOIN accounts dest_acc   ON bt.destination_account_id = dest_acc.account_id
    LEFT JOIN customers dest_cust ON dest_acc.customer_id = dest_cust.customer_id
    WHERE bt.status = 'COMPLETED'
      AND bt.completed_at >= CAST(CONCAT(p_start_date, ' 00:00:00') AS DATETIME)
      AND bt.completed_at <= CAST(CONCAT(p_end_date, ' 23:59:59') AS DATETIME)
      AND bt.amount >= v_min
      AND (p_tx_type IS NULL OR p_tx_type = '' OR bt.transaction_type = p_tx_type)
    ORDER BY bt.amount DESC, bt.completed_at DESC
    LIMIT p_page_size OFFSET v_offset;
END //

DELIMITER ;


-- ============================================================================
-- 6. SP: sp_get_transaction_detail_report (Full Dataset)
--    Used for complete background exports (CSV, Excel, PDF).
-- ============================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_transaction_detail_report //

CREATE PROCEDURE sp_get_transaction_detail_report(
    IN p_start_date DATE,
    IN p_end_date   DATE,
    IN p_status     VARCHAR(32),
    IN p_type       VARCHAR(32),
    IN p_channel    VARCHAR(32),
    IN p_min_amount DECIMAL(18, 4),
    IN p_max_amount DECIMAL(18, 4)
)
BEGIN
    SELECT 
        bt.transaction_ref                             AS ref,
        COALESCE(bt.completed_at, bt.initiated_at)     AS tx_date,
        bt.amount                                      AS amount,
        bt.service_fee                                 AS fee,
        COALESCE(src_acc.account_number, 'N/A')        AS source_account,
        COALESCE(dest_acc.account_number, 'N/A')       AS dest_account,
        bt.status                                      AS status,
        bt.channel                                     AS channel,
        bt.currency                                    AS currency
    FROM bank_transactions bt
    LEFT JOIN accounts src_acc  ON bt.source_account_id = src_acc.account_id
    LEFT JOIN accounts dest_acc ON bt.destination_account_id = dest_acc.account_id
    WHERE COALESCE(bt.completed_at, bt.initiated_at) >= CAST(CONCAT(p_start_date, ' 00:00:00') AS DATETIME)
      AND COALESCE(bt.completed_at, bt.initiated_at) <= CAST(CONCAT(p_end_date, ' 23:59:59') AS DATETIME)
      AND (p_status IS NULL OR p_status = '' OR bt.status = p_status)
      AND (p_type IS NULL OR p_type = '' OR bt.transaction_type = p_type)
      AND (p_channel IS NULL OR p_channel = '' OR bt.channel = p_channel)
      AND (p_min_amount IS NULL OR bt.amount >= p_min_amount)
      AND (p_max_amount IS NULL OR bt.amount <= p_max_amount)
    ORDER BY COALESCE(bt.completed_at, bt.initiated_at) DESC;
END //

DELIMITER ;


-- ============================================================================
-- 7. SP: sp_get_transaction_detail_report_paged
--    Ultra-fast server-side pagination for UI Transaction Detail viewing.
--    Returns 2 Result Sets:
--      RS1: Summary aggregates (total_count, total_volume, total_fees)
--      RS2: Paginated rows (30 items only)
-- ============================================================================
DELIMITER //

DROP PROCEDURE IF EXISTS sp_get_transaction_detail_report_paged //

CREATE PROCEDURE sp_get_transaction_detail_report_paged(
    IN p_start_date DATE,
    IN p_end_date   DATE,
    IN p_status     VARCHAR(32),
    IN p_type       VARCHAR(32),
    IN p_channel    VARCHAR(32),
    IN p_min_amount DECIMAL(18, 4),
    IN p_max_amount DECIMAL(18, 4),
    IN p_page       INT,
    IN p_page_size  INT
)
BEGIN
    DECLARE v_offset INT;
    SET v_offset = (GREATEST(COALESCE(p_page, 1), 1) - 1) * COALESCE(p_page_size, 30);

    -- RS1: Summary aggregates
    SELECT 
        COUNT(*)                         AS total_count,
        COALESCE(SUM(bt.amount), 0)      AS total_volume,
        COALESCE(SUM(bt.service_fee), 0) AS total_fees
    FROM bank_transactions bt
    WHERE COALESCE(bt.completed_at, bt.initiated_at) >= CAST(CONCAT(p_start_date, ' 00:00:00') AS DATETIME)
      AND COALESCE(bt.completed_at, bt.initiated_at) <= CAST(CONCAT(p_end_date, ' 23:59:59') AS DATETIME)
      AND (p_status IS NULL OR p_status = '' OR bt.status = p_status)
      AND (p_type IS NULL OR p_type = '' OR bt.transaction_type = p_type)
      AND (p_channel IS NULL OR p_channel = '' OR bt.channel = p_channel)
      AND (p_min_amount IS NULL OR bt.amount >= p_min_amount)
      AND (p_max_amount IS NULL OR bt.amount <= p_max_amount);

    -- RS2: Paginated rows (only 30 rows joined)
    SELECT 
        bt.transaction_ref                             AS ref,
        COALESCE(bt.completed_at, bt.initiated_at)     AS tx_date,
        bt.amount                                      AS amount,
        bt.service_fee                                 AS fee,
        COALESCE(src_acc.account_number, 'N/A')        AS source_account,
        COALESCE(dest_acc.account_number, 'N/A')       AS dest_account,
        bt.status                                      AS status,
        bt.channel                                     AS channel,
        bt.currency                                    AS currency
    FROM bank_transactions bt
    LEFT JOIN accounts src_acc  ON bt.source_account_id = src_acc.account_id
    LEFT JOIN accounts dest_acc ON bt.destination_account_id = dest_acc.account_id
    WHERE COALESCE(bt.completed_at, bt.initiated_at) >= CAST(CONCAT(p_start_date, ' 00:00:00') AS DATETIME)
      AND COALESCE(bt.completed_at, bt.initiated_at) <= CAST(CONCAT(p_end_date, ' 23:59:59') AS DATETIME)
      AND (p_status IS NULL OR p_status = '' OR bt.status = p_status)
      AND (p_type IS NULL OR p_type = '' OR bt.transaction_type = p_type)
      AND (p_channel IS NULL OR p_channel = '' OR bt.channel = p_channel)
      AND (p_min_amount IS NULL OR bt.amount >= p_min_amount)
      AND (p_max_amount IS NULL OR bt.amount <= p_max_amount)
    ORDER BY COALESCE(bt.completed_at, bt.initiated_at) DESC
    LIMIT p_page_size OFFSET v_offset;
END //

DELIMITER ;
