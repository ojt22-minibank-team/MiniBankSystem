-- =============================================
-- Group 2 Reporting Subsystem - Stored Procedures
-- =============================================

-- =============================================
-- 1. SP: sp_get_daily_ledger_summary
-- =============================================
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

-- =============================================
-- 2. SP: sp_get_customer_account_status_summary
-- =============================================
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

-- =============================================
-- 3. SP: sp_fee_revenue_report
-- =============================================
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

-- =============================================
-- 4. SP: sp_large_transaction_aml_report
-- =============================================
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
            WHEN bt.amount >= (COALESCE(p_min_amount, 10000000.0000) * 2) THEN 'HIGH RISK'
            WHEN bt.amount >= COALESCE(p_min_amount, 10000000.0000)       THEN 'MEDIUM RISK'
            ELSE 'STANDARD'
        END                                            AS risk_level
    FROM bank_transactions bt
    LEFT JOIN accounts src_acc   ON bt.source_account_id = src_acc.account_id
    LEFT JOIN customers src_cust ON src_acc.customer_id = src_cust.customer_id
    LEFT JOIN accounts dest_acc   ON bt.destination_account_id = dest_acc.account_id
    LEFT JOIN customers dest_cust ON dest_acc.customer_id = dest_cust.customer_id
    WHERE bt.status = 'COMPLETED'
      AND bt.completed_at >= CAST(CONCAT(p_start_date, ' 00:00:00') AS DATETIME)
      AND bt.completed_at <= CAST(CONCAT(p_end_date, ' 23:59:59') AS DATETIME)
      AND bt.amount >= COALESCE(p_min_amount, 10000000.0000)
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
