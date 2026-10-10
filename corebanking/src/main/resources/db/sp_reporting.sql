-- ============================================================
-- Group 2 Reporting Subsystem -- MySQL Stored Procedures
-- Database: cbd
-- FIXED: Corrected table/column names to match actual JPA entity schema.
--   bank_transactions  (was: transactions)
--   staff_users        (was: staff)
--   audit_logs         (was: audit_log)
--   initiated_at       (was: created_at on transactions)
--   service_fee        (was: fee)
--   transaction_id     (was: id on transactions)
--   account_id, current_balance  (was: id, balance on accounts)
--   actor_staff_id     (was: staff_id on audit_logs)
--   old_values/new_values  (was: old_value/new_value)
-- Transaction types updated to real enum values.
-- ============================================================

DROP PROCEDURE IF EXISTS sp_get_daily_ledger_summary;

DELIMITER $$

CREATE PROCEDURE sp_get_daily_ledger_summary(
    IN p_start_date DATE,
    IN p_end_date   DATE,
    IN p_transaction_status VARCHAR(50)
)
BEGIN
    SELECT
        DATE(t.initiated_at)            AS report_date,
        t.transaction_type              AS transaction_type,
        COUNT(t.transaction_id)         AS transaction_count,
        COALESCE(SUM(t.amount), 0)      AS total_amount,
        COALESCE(SUM(t.service_fee), 0) AS total_fee,
        t.currency                      AS currency
    FROM bank_transactions t
    WHERE
        DATE(t.initiated_at) BETWEEN p_start_date AND p_end_date
        AND t.transaction_type IN (
            'INTERNAL_TRANSFER', 'OTC_DEPOSIT', 'OTC_WITHDRAWAL',
            'EXTERNAL_PAYMENT', 'LEDGER_ADJUSTMENT', 'REFUND'
        )
        AND (
            p_transaction_status IS NULL
            OR p_transaction_status = ''
            OR t.status = p_transaction_status
        )
    GROUP BY
        DATE(t.initiated_at),
        t.transaction_type,
        t.currency
    ORDER BY
        report_date ASC,
        t.transaction_type ASC;
END$$

DELIMITER ;

-- -----------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_get_customer_account_status_summary;

DELIMITER $$

CREATE PROCEDURE sp_get_customer_account_status_summary(
    IN p_start_date     DATE,
    IN p_end_date       DATE,
    IN p_account_status VARCHAR(50)
)
BEGIN
    -- RS1: Per-status breakdown
    SELECT
        a.status                AS account_status,
        COUNT(a.account_id)     AS account_count,
        SUM(CASE WHEN DATE(a.created_at) BETWEEN p_start_date AND p_end_date THEN 1 ELSE 0 END) AS new_accounts_in_range,
        COALESCE(AVG(a.current_balance), 0) AS avg_balance,
        COALESCE(MIN(a.current_balance), 0) AS min_balance,
        COALESCE(MAX(a.current_balance), 0) AS max_balance
    FROM accounts a
    WHERE a.deleted_at IS NULL
      AND (p_account_status IS NULL OR p_account_status = '' OR a.status = p_account_status)
    GROUP BY a.status
    ORDER BY account_count DESC;

    -- RS2: Balance bracket distribution
    SELECT
        CASE
            WHEN a.current_balance < 0       THEN 'NEGATIVE'
            WHEN a.current_balance < 100     THEN '0-100'
            WHEN a.current_balance < 1000    THEN '100-1K'
            WHEN a.current_balance < 10000   THEN '1K-10K'
            WHEN a.current_balance < 100000  THEN '10K-100K'
            WHEN a.current_balance < 1000000 THEN '100K-1M'
            ELSE                                  '1M+'
        END AS balance_bracket,
        COUNT(a.account_id)                 AS bracket_count,
        COALESCE(SUM(a.current_balance), 0) AS bracket_total_balance,
        a.status                            AS account_status
    FROM accounts a
    WHERE a.deleted_at IS NULL
      AND (p_account_status IS NULL OR p_account_status = '' OR a.status = p_account_status)
    GROUP BY balance_bracket, a.status
    ORDER BY FIELD(balance_bracket,'NEGATIVE','0-100','100-1K','1K-10K','10K-100K','100K-1M','1M+'), a.status;
END$$

DELIMITER ;

-- -----------------------------------------------------------------------

DROP PROCEDURE IF EXISTS sp_get_system_audit_trail_log;

DELIMITER $$

CREATE PROCEDURE sp_get_system_audit_trail_log(
    IN p_staff_id    VARCHAR(64),
    IN p_action_type VARCHAR(100),
    IN p_start_date  DATETIME,
    IN p_end_date    DATETIME,
    IN p_account_no  VARCHAR(50),
    IN p_page        INT,
    IN p_page_size   INT
)
BEGIN
    DECLARE v_offset INT;
    DECLARE v_limit  INT;
    SET v_limit  = IF(p_page_size IS NULL OR p_page_size <= 0, 20, p_page_size);
    SET v_offset = IF(p_page IS NULL OR p_page <= 0, 0, (p_page - 1) * v_limit);

    -- RS1: total count
    -- Filter by actor_staff_id using entity_id as a string reference,
    -- or by entity_id for account number filter.
    SELECT COUNT(*) AS total_count
    FROM audit_logs al
    LEFT JOIN staff_users s ON s.staff_id = al.actor_staff_id
    WHERE (p_staff_id    IS NULL OR p_staff_id    = '' OR al.request_id   = p_staff_id OR s.staff_no = p_staff_id)
      AND (p_action_type IS NULL OR p_action_type = '' OR al.action_type  = p_action_type)
      AND (p_account_no  IS NULL OR p_account_no  = '' OR al.entity_id    = p_account_no)
      AND (p_start_date  IS NULL OR al.created_at >= p_start_date)
      AND (p_end_date    IS NULL OR al.created_at <= p_end_date);

    -- RS2: paginated rows
    SELECT
        al.audit_id                           AS log_id,
        COALESCE(s.staff_no, '')              AS staff_id,
        COALESCE(s.username,  '')             AS staff_username,
        COALESCE(s.full_name, '')             AS staff_full_name,
        al.action_type                        AS action_type,
        al.entity_type                        AS entity_type,
        al.entity_id                          AS entity_id,
        al.old_values                         AS old_value,
        al.new_values                         AS new_value,
        al.ip_address                         AS ip_address,
        al.user_agent                         AS description,
        al.created_at                         AS created_at
    FROM audit_logs al
    LEFT JOIN staff_users s ON s.staff_id = al.actor_staff_id
    WHERE (p_staff_id    IS NULL OR p_staff_id    = '' OR al.request_id   = p_staff_id OR s.staff_no = p_staff_id)
      AND (p_action_type IS NULL OR p_action_type = '' OR al.action_type  = p_action_type)
      AND (p_account_no  IS NULL OR p_account_no  = '' OR al.entity_id    = p_account_no)
      AND (p_start_date  IS NULL OR al.created_at >= p_start_date)
      AND (p_end_date    IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC
    LIMIT  v_limit
    OFFSET v_offset;
END$$

DELIMITER ;
