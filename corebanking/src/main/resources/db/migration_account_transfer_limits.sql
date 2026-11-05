-- =========================================================================
-- Migration: Create account_transfer_limits & account_transfer_limit_history
-- Standardized Decimal: DECIMAL(18,4)
-- =========================================================================

CREATE TABLE IF NOT EXISTS account_transfer_limits (
    limit_id                 BINARY(16) NOT NULL,
    account_id               BINARY(16) NOT NULL UNIQUE,
    customer_id              BINARY(16) NOT NULL,
    custom_one_time_limit    DECIMAL(18,4) NULL,
    custom_daily_limit       DECIMAL(18,4) NULL,
    last_limit_increased_at  DATETIME NULL,
    created_at               DATETIME NOT NULL,
    updated_at               DATETIME NOT NULL,
    updated_by_type          ENUM('CUSTOMER','STAFF','SYSTEM') NOT NULL,
    updated_by_id            BINARY(16) NULL,

    PRIMARY KEY (limit_id),
    CONSTRAINT fk_limits_account  FOREIGN KEY (account_id)  REFERENCES accounts (account_id)   ON DELETE RESTRICT,
    CONSTRAINT fk_limits_customer FOREIGN KEY (customer_id) REFERENCES customers (customer_id) ON DELETE RESTRICT,
    INDEX idx_limits_customer (customer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- Audit History Table for Transfer Limit Changes
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS account_transfer_limit_history (
    history_id               BINARY(16) NOT NULL,
    account_id               BINARY(16) NOT NULL,
    customer_id              BINARY(16) NOT NULL,

    -- Previous Custom Limits
    previous_one_time_limit  DECIMAL(18,4) NULL,
    previous_daily_limit     DECIMAL(18,4) NULL,

    -- New Custom Limits
    new_one_time_limit       DECIMAL(18,4) NULL,
    new_daily_limit          DECIMAL(18,4) NULL,

    -- Type of Change
    change_action            ENUM('INITIAL_SET', 'UPDATE', 'RESET_TO_DEFAULT') NOT NULL,

    -- Who made the change
    changed_by_type          ENUM('CUSTOMER', 'STAFF', 'SYSTEM') NOT NULL,
    changed_by_id            BINARY(16) NULL,

    -- Change Information
    changed_at               DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reason                   VARCHAR(255) NULL,

    PRIMARY KEY (history_id),

    -- Foreign Key Constraints
    CONSTRAINT fk_limit_history_account
        FOREIGN KEY (account_id)
        REFERENCES accounts (account_id)
        ON DELETE RESTRICT,

    CONSTRAINT fk_limit_history_customer
        FOREIGN KEY (customer_id)
        REFERENCES customers (customer_id)
        ON DELETE RESTRICT,

    -- Validation Constraints
    CONSTRAINT chk_previous_one_time
        CHECK (
            previous_one_time_limit IS NULL
            OR previous_one_time_limit > 0
        ),

    CONSTRAINT chk_new_one_time
        CHECK (
            new_one_time_limit IS NULL
            OR new_one_time_limit > 0
        ),

    CONSTRAINT chk_previous_daily
        CHECK (
            previous_daily_limit IS NULL
            OR previous_daily_limit > 0
        ),

    CONSTRAINT chk_new_daily
        CHECK (
            new_daily_limit IS NULL
            OR new_daily_limit > 0
        ),

    -- Search Indexes (Optimized for Audit & Timeline queries)
    INDEX idx_limit_history_account (account_id, changed_at),
    INDEX idx_limit_history_customer (customer_id, changed_at),
    INDEX idx_limit_history_actor (changed_by_type, changed_by_id, changed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------------------
-- Migrate existing custom daily limits from accounts table
-- -------------------------------------------------------------------------
INSERT INTO account_transfer_limits (
    limit_id, account_id, customer_id, custom_daily_limit,
    created_at, updated_at, updated_by_type
)
SELECT
    UUID_TO_BIN(UUID(), 1),
    a.account_id,
    a.customer_id,
    a.daily_transfer_limit,
    NOW(),
    NOW(),
    'SYSTEM'
FROM accounts a
WHERE a.daily_transfer_limit IS NOT NULL AND a.daily_transfer_limit > 0
  AND NOT EXISTS (
      SELECT 1 FROM account_transfer_limits atl WHERE atl.account_id = a.account_id
  );

-- -------------------------------------------------------------------------
-- Clean up legacy parameter records from system_parameters table
-- -------------------------------------------------------------------------
DELETE FROM system_parameters WHERE parameter_key LIKE 'LIMIT_ONETIME_%';
