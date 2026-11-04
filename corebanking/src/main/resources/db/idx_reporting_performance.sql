-- =========================================================================
-- Group 2 Reporting Subsystem -- Performance Index
-- Database: corebanking
-- Table: bank_transactions
-- File: idx_reporting_performance.sql
--
-- Purpose:
--   Accelerates reporting queries (Daily Ledger, Fee Revenue, and AML Large Transactions)
--   by providing a composite index matching WHERE filters on status, completed_at, amount,
--   and transaction_type.
-- =========================================================================

CREATE INDEX idx_bt_reporting_completed
ON bank_transactions (status, completed_at, amount, transaction_type);
