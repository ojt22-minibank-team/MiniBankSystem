-- =========================================================================
-- Group 2 Reporting Subsystem -- Performance Indexes
-- Database: corebanking / cbd
-- Table: bank_transactions
-- File: idx_reporting_performance.sql
--
-- Purpose:
--   Accelerates reporting queries (Daily Ledger, Fee Revenue, AML Large Transactions,
--   and Transaction Detail Reporting) at scale (100,000+ entries) by providing:
--   1. Composite index matching WHERE filters on status, completed_at, amount, and transaction_type.
--   2. Standalone completed_at index for unconstrained status range queries.
--   3. Expression index on COALESCE(completed_at, initiated_at) for transaction detail date ranges and ordering.
-- =========================================================================

-- 1. Accelerates completed transaction reports (Fee Revenue & Large Transactions)
CREATE INDEX IF NOT EXISTS idx_bt_reporting_completed
ON bank_transactions (status, completed_at, amount, transaction_type);

-- 2. Accelerates Daily Ledger summary when status filter is optional or 'ALL'
CREATE INDEX IF NOT EXISTS idx_bt_completed_at
ON bank_transactions (completed_at);

-- 3. Accelerates Transaction Detail report filtering and backward date ordering
CREATE INDEX IF NOT EXISTS idx_bt_tx_date
ON bank_transactions ((COALESCE(completed_at, initiated_at)));
