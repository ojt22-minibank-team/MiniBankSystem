-- =========================================================================
-- Customer Portal (G1) -- Customer Transaction History Stored Procedure
-- Database: cbd
-- File: sp_customer_transaction_history.sql
--
-- Description:
--   Retrieves filterable, paginated transaction history for an authenticated customer
--   and selected account.
--   Returns 2 Result Sets:
--     Result Set 1: Requested Page Rows (with structured counterparty & own-account info)
--     Result Set 2: totalElements (total matching count across both branches)
--
-- Security & Performance Invariants:
--   1. Authenticated Ownership Validation:
--      Accepts p_customer_id VARCHAR(36) and validates that the account belongs to
--      the authenticated customer. Raises SQLSTATE '45000' immediately if account
--      is not found or does not belong to the customer.
--   2. SARGable Index Utilization:
--      Uses composite indexes (source_account_id, initiated_at, transaction_id)
--      and (destination_account_id, initiated_at, transaction_id).
--      Avoids functions like DATE(), CAST(), or ABS() on indexed columns.
--   3. Two-Branch UNION ALL Architecture:
--      Branch 1: source_account_id = accountId (Direction: OUT for COMPLETED, NONE otherwise)
--      Branch 2: destination_account_id = accountId AND (source_account_id IS NULL OR source_account_id <> accountId)
--                (Direction: IN for COMPLETED, NONE otherwise)
--      Deduplication is guaranteed by the mutually exclusive condition in branch 2.
--   4. Parameterized Dynamic SQL:
--      Only active filters are appended to the WHERE clause to prevent optimizer plan
--      degradation. Filter values are bound to session variables to prevent SQL injection.
--   5. Delayed Join on Accounts & Customers:
--      Joins to accounts (sa, da) and customers (sc, dc) occur only on the final
--      paginated page rows. The count query remains index-only with zero joins.
--   6. Structured Counterparty Information:
--      - counterparty_name: Resolved opposite party customer full_name (INTERNAL_TRANSFER,
--        EXTERNAL_PAYMENT) or NULL when not applicable (OTC, REFUND, LEDGER_ADJUSTMENT).
--      - is_own_account: 1 if source and destination account belong to the same customer,
--        0 otherwise.
-- =========================================================================

DROP PROCEDURE IF EXISTS sp_get_customer_transaction_history;

DELIMITER $$

CREATE PROCEDURE sp_get_customer_transaction_history(
    IN p_customer_id        VARCHAR(36),
    IN p_account_number     VARCHAR(34),
    IN p_status             VARCHAR(32),
    IN p_transaction_type   VARCHAR(32),
    IN p_from_date          DATE,
    IN p_to_date            DATE,
    IN p_min_amount         DECIMAL(18,4),
    IN p_max_amount         DECIMAL(18,4),
    IN p_page               INT,
    IN p_size               INT
)
proc_label: BEGIN
    DECLARE v_customer_bin_id BINARY(16);
    DECLARE v_account_id BINARY(16);
    DECLARE v_page INT;
    DECLARE v_size INT;
    DECLARE v_offset INT;
    DECLARE v_branch_limit INT;
    DECLARE v_filter_sql TEXT DEFAULT '';

    -- -------------------------------------------------------------------------
    -- 1. Validate Account Ownership
    -- -------------------------------------------------------------------------
    IF p_customer_id IS NULL OR p_account_number IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Customer identity and account number are required.';
    END IF;

    SET v_customer_bin_id = UNHEX(REPLACE(p_customer_id, '-', ''));

    SELECT a.account_id INTO v_account_id
    FROM accounts a
    JOIN customers c ON a.customer_id = c.customer_id
    WHERE a.account_number = p_account_number
      AND a.customer_id = v_customer_bin_id;

    IF v_account_id IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Account not found or access denied for this customer';
    END IF;

    -- -------------------------------------------------------------------------
    -- 2. Pagination Bounds Validation
    -- -------------------------------------------------------------------------
    SET v_page = COALESCE(p_page, 0);
    IF v_page < 0 THEN
        SET v_page = 0;
    END IF;

    SET v_size = COALESCE(p_size, 10);
    IF v_size < 1 THEN
        SET v_size = 10;
    END IF;
    IF v_size > 100 THEN
        SET v_size = 100;
    END IF;

    SET v_offset = v_page * v_size;
    SET v_branch_limit = v_offset + v_size;

    -- -------------------------------------------------------------------------
    -- 3. Prepare Bound Parameters for Safe Dynamic SQL
    -- -------------------------------------------------------------------------
    SET @acc_id = v_account_id;

    IF p_status IS NOT NULL AND TRIM(p_status) <> '' THEN
        SET @p_status = TRIM(p_status);
        SET v_filter_sql = CONCAT(v_filter_sql, ' AND bt.status = @p_status');
    END IF;

    IF p_transaction_type IS NOT NULL AND TRIM(p_transaction_type) <> '' THEN
        SET @p_transaction_type = TRIM(p_transaction_type);
        SET v_filter_sql = CONCAT(v_filter_sql, ' AND bt.transaction_type = @p_transaction_type');
    END IF;

    IF p_from_date IS NOT NULL THEN
        SET @p_from_datetime = CAST(p_from_date AS DATETIME);
        SET v_filter_sql = CONCAT(v_filter_sql, ' AND bt.initiated_at >= @p_from_datetime');
    END IF;

    IF p_to_date IS NOT NULL THEN
        SET @p_to_datetime_exclusive = DATE_ADD(CAST(p_to_date AS DATETIME), INTERVAL 1 DAY);
        SET v_filter_sql = CONCAT(v_filter_sql, ' AND bt.initiated_at < @p_to_datetime_exclusive');
    END IF;

    IF p_min_amount IS NOT NULL THEN
        SET @p_min_amount = p_min_amount;
        SET v_filter_sql = CONCAT(v_filter_sql, ' AND bt.amount >= @p_min_amount');
    END IF;

    IF p_max_amount IS NOT NULL THEN
        SET @p_max_amount = p_max_amount;
        SET v_filter_sql = CONCAT(v_filter_sql, ' AND bt.amount <= @p_max_amount');
    END IF;

    -- -------------------------------------------------------------------------
    -- 4. Result Set 1: Page of Transaction Rows with Counterparty Information
    -- -------------------------------------------------------------------------
    SET @sql_rows = CONCAT(
      'SELECT ',
      '  t.transaction_ref, ',
      '  t.initiated_at AS transaction_date, ',
      '  t.transaction_type, ',
      '  t.status, ',
      '  t.direction, ',
      '  t.amount, ',
      '  t.currency, ',
      '  t.service_fee, ',
      '  t.description, ',
      '  sa.account_number AS source_account_number, ',
      '  da.account_number AS destination_account_number, ',
      '  t.failure_code, ',
      '  t.failure_message, ',
      '  t.initiated_at, ',
      '  t.completed_at, ',
      '  CASE ',
      '    WHEN t.transaction_type = \'INTERNAL_TRANSFER\' THEN ',
      '      CASE ',
      '        WHEN t.account_side = \'SOURCE\' THEN dc.full_name ',
      '        WHEN t.account_side = \'DESTINATION\' THEN sc.full_name ',
      '        ELSE NULL ',
      '      END ',
      '    WHEN t.transaction_type = \'EXTERNAL_PAYMENT\' THEN ',
      '      CASE ',
      '        WHEN t.account_side = \'SOURCE\' THEN dc.full_name ',
      '        WHEN t.account_side = \'DESTINATION\' THEN sc.full_name ',
      '        ELSE NULL ',
      '      END ',
      '    ELSE NULL ',
      '  END AS counterparty_name, ',
      '  CASE ',
      '    WHEN sa.customer_id IS NOT NULL AND da.customer_id IS NOT NULL AND sa.customer_id = da.customer_id THEN 1 ',
      '    ELSE 0 ',
      '  END AS is_own_account ',
      'FROM (',
      '  (SELECT bt.transaction_id, bt.transaction_ref, bt.source_account_id, bt.destination_account_id, ',
      '          bt.amount, bt.currency, bt.service_fee, bt.description, bt.status, bt.transaction_type, ',
      '          bt.failure_code, bt.failure_message, bt.initiated_at, bt.completed_at, ',
      '          CASE WHEN bt.status = \'COMPLETED\' THEN \'OUT\' ELSE \'NONE\' END AS direction, ',
      '          \'SOURCE\' AS account_side ',
      '   FROM bank_transactions bt ',
      '   WHERE bt.source_account_id = @acc_id ', v_filter_sql, ' ',
      '   ORDER BY bt.initiated_at DESC, bt.transaction_id DESC ',
      '   LIMIT ', v_branch_limit, ') ',
      '  UNION ALL ',
      '  (SELECT bt.transaction_id, bt.transaction_ref, bt.source_account_id, bt.destination_account_id, ',
      '          bt.amount, bt.currency, bt.service_fee, bt.description, bt.status, bt.transaction_type, ',
      '          bt.failure_code, bt.failure_message, bt.initiated_at, bt.completed_at, ',
      '          CASE WHEN bt.status = \'COMPLETED\' THEN \'IN\' ELSE \'NONE\' END AS direction, ',
      '          \'DESTINATION\' AS account_side ',
      '   FROM bank_transactions bt ',
      '   WHERE bt.destination_account_id = @acc_id ',
      '     AND (bt.source_account_id IS NULL OR bt.source_account_id <> @acc_id) ', v_filter_sql, ' ',
      '   ORDER BY bt.initiated_at DESC, bt.transaction_id DESC ',
      '   LIMIT ', v_branch_limit, ') ',
      ') t ',
      'LEFT JOIN accounts sa ON t.source_account_id = sa.account_id ',
      'LEFT JOIN accounts da ON t.destination_account_id = da.account_id ',
      'LEFT JOIN customers sc ON sa.customer_id = sc.customer_id ',
      'LEFT JOIN customers dc ON da.customer_id = dc.customer_id ',
      'ORDER BY t.initiated_at DESC, t.transaction_id DESC ',
      'LIMIT ', v_size, ' OFFSET ', v_offset
    );

    PREPARE stmt_rows FROM @sql_rows;
    EXECUTE stmt_rows;
    DEALLOCATE PREPARE stmt_rows;

    -- -------------------------------------------------------------------------
    -- 5. Result Set 2: Total Matching Elements Count
    -- -------------------------------------------------------------------------
    SET @sql_count = CONCAT(
      'SELECT (',
      '  (SELECT COUNT(*) FROM bank_transactions bt WHERE bt.source_account_id = @acc_id ', v_filter_sql, ') + ',
      '  (SELECT COUNT(*) FROM bank_transactions bt WHERE bt.destination_account_id = @acc_id AND (bt.source_account_id IS NULL OR bt.source_account_id <> @acc_id) ', v_filter_sql, ')',
      ') AS total_elements'
    );

    PREPARE stmt_count FROM @sql_count;
    EXECUTE stmt_count;
    DEALLOCATE PREPARE stmt_count;

END $$

DELIMITER ;
