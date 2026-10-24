package com.corebanking.repository;

import com.corebanking.dto.CusTransactionHistoryItemDTO;
import com.corebanking.exception.AccountNotFoundException;
import lombok.Builder;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Repository
@RequiredArgsConstructor
public class CusTransactionHistoryRepository {

    private final JdbcTemplate jdbcTemplate;

    @Data
    @Builder
    public static class ProcedureResult {
        private List<CusTransactionHistoryItemDTO> items;
        private long totalElements;
    }

    /**
     * Executes the stored procedure sp_get_customer_transaction_history.
     * Returns requested page items (Result Set 1) and totalElements (Result Set 2).
     */
    public ProcedureResult getTransactionHistory(
            UUID customerId,
            String accountNumber,
            String status,
            String transactionType,
            LocalDate fromDate,
            LocalDate toDate,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            int page,
            int size
    ) {
        log.debug("Invoking sp_get_customer_transaction_history for account: {}, customer: {}, page: {}, size: {}",
                accountNumber, customerId, page, size);

        return jdbcTemplate.execute((Connection con) -> {
            CallableStatement cs = con.prepareCall("{CALL sp_get_customer_transaction_history(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)}");
            cs.setString(1, customerId.toString());
            cs.setString(2, accountNumber);
            cs.setString(3, status);
            cs.setString(4, transactionType);
            if (fromDate != null) {
                cs.setDate(5, java.sql.Date.valueOf(fromDate));
            } else {
                cs.setNull(5, Types.DATE);
            }
            if (toDate != null) {
                cs.setDate(6, java.sql.Date.valueOf(toDate));
            } else {
                cs.setNull(6, Types.DATE);
            }
            if (minAmount != null) {
                cs.setBigDecimal(7, minAmount);
            } else {
                cs.setNull(7, Types.DECIMAL);
            }
            if (maxAmount != null) {
                cs.setBigDecimal(8, maxAmount);
            } else {
                cs.setNull(8, Types.DECIMAL);
            }
            cs.setInt(9, page);
            cs.setInt(10, size);
            return cs;
        }, (CallableStatement cs) -> {
            boolean hasRs = cs.execute();
            List<CusTransactionHistoryItemDTO> items = new ArrayList<>();
            long totalElements = 0L;

            if (hasRs) {
                try (ResultSet rs = cs.getResultSet()) {
                    while (rs.next()) {
                        Timestamp tsDate = rs.getTimestamp("transaction_date");
                        Timestamp tsInit = rs.getTimestamp("initiated_at");
                        Timestamp tsComp = rs.getTimestamp("completed_at");

                        String txnType = rs.getString("transaction_type");
                        String srcAcc = rs.getString("source_account_number");
                        String dstAcc = rs.getString("destination_account_number");
                        String desc = rs.getString("description");
                        String counterpartyName = rs.getString("counterparty_name");
                        boolean isOwnAccount = rs.getInt("is_own_account") == 1;

                        String displayTitle = buildDisplayTitle(
                                txnType,
                                accountNumber,
                                srcAcc,
                                dstAcc,
                                counterpartyName,
                                isOwnAccount,
                                desc
                        );

                        CusTransactionHistoryItemDTO item = CusTransactionHistoryItemDTO.builder()
                                .transactionRef(rs.getString("transaction_ref"))
                                .transactionDate(tsDate != null ? tsDate.toLocalDateTime() : null)
                                .transactionType(txnType)
                                .status(rs.getString("status"))
                                .direction(rs.getString("direction"))
                                .amount(rs.getBigDecimal("amount"))
                                .currency(rs.getString("currency"))
                                .serviceFee(rs.getBigDecimal("service_fee"))
                                .description(desc)
                                .sourceAccountNumber(srcAcc)
                                .destinationAccountNumber(dstAcc)
                                .failureCode(rs.getString("failure_code"))
                                .failureMessage(rs.getString("failure_message"))
                                .initiatedAt(tsInit != null ? tsInit.toLocalDateTime() : null)
                                .completedAt(tsComp != null ? tsComp.toLocalDateTime() : null)
                                .counterpartyName(counterpartyName)
                                .isOwnAccount(isOwnAccount)
                                .displayTitle(displayTitle)
                                .build();
                        items.add(item);
                    }
                }
            }

            if (cs.getMoreResults()) {
                try (ResultSet rs = cs.getResultSet()) {
                    if (rs.next()) {
                        totalElements = rs.getLong("total_elements");
                    }
                }
            }

            return ProcedureResult.builder()
                    .items(items)
                    .totalElements(totalElements)
                    .build();
        });
    }

    /**
     * Resolves the account_id binary for the given account number and authenticated customer UUID.
     * Throws AccountNotFoundException if the account does not exist or does not belong to the customer.
     */
    public byte[] verifyAndGetAccountId(UUID customerId, String accountNumber) {
        String sql = "SELECT a.account_id FROM accounts a " +
                     "WHERE a.account_number = ? AND a.customer_id = UNHEX(REPLACE(?, '-', ''))";
        List<byte[]> list = jdbcTemplate.query(sql, (rs, rowNum) -> rs.getBytes("account_id"), accountNumber, customerId.toString());
        if (list.isEmpty()) {
            throw new AccountNotFoundException("Account not found or access denied for this customer");
        }
        return list.get(0);
    }

    /**
     * Retrieves distinct statuses that actually exist in bank_transactions for the selected account.
     */
    public List<String> getDistinctStatuses(UUID customerId, String accountNumber) {
        byte[] accountId = verifyAndGetAccountId(customerId, accountNumber);
        String sql = "SELECT DISTINCT status FROM bank_transactions WHERE source_account_id = ? " +
                     "UNION " +
                     "SELECT DISTINCT status FROM bank_transactions WHERE destination_account_id = ? " +
                     "ORDER BY status";
        return jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString("status"), accountId, accountId);
    }

    /**
     * Retrieves distinct transaction types that actually exist in bank_transactions for the selected account.
     */
    public List<String> getDistinctTypes(UUID customerId, String accountNumber) {
        byte[] accountId = verifyAndGetAccountId(customerId, accountNumber);
        String sql = "SELECT DISTINCT transaction_type FROM bank_transactions WHERE source_account_id = ? " +
                     "UNION " +
                     "SELECT DISTINCT transaction_type FROM bank_transactions WHERE destination_account_id = ? " +
                     "ORDER BY transaction_type";
        return jdbcTemplate.query(sql, (rs, rowNum) -> rs.getString("transaction_type"), accountId, accountId);
    }

    /**
     * Constructs a customer-facing display title purely in-memory based on structured transaction data.
     * Uses structural account matching (requested vs source vs destination) rather than financial direction,
     * ensuring proper titles even for non-COMPLETED (FAILED, REJECTED, CANCELLED, etc.) transactions.
     */
    public static String buildDisplayTitle(
            String transactionType,
            String requestedAccountNumber,
            String sourceAccountNumber,
            String destinationAccountNumber,
            String counterpartyName,
            boolean isOwnAccount,
            String description
    ) {
        String normReq = requestedAccountNumber != null ? requestedAccountNumber.trim() : "";
        String normSrc = sourceAccountNumber != null ? sourceAccountNumber.trim() : "";
        String normDst = destinationAccountNumber != null ? destinationAccountNumber.trim() : "";

        boolean isSource = !normReq.isEmpty() && normReq.equals(normSrc);
        boolean isDestination = !normReq.isEmpty() && normReq.equals(normDst);

        boolean hasCounterparty = counterpartyName != null && !counterpartyName.trim().isEmpty();
        String counterparty = hasCounterparty ? counterpartyName.trim() : null;

        if (transactionType == null) {
            return fallbackTitle(description, null);
        }

        switch (transactionType) {
            case "INTERNAL_TRANSFER":
                if (isSource) {
                    if (isOwnAccount) {
                        return "Transfer to Own Account";
                    } else if (hasCounterparty) {
                        return "Transfer to " + counterparty;
                    } else {
                        return "Outgoing Transfer";
                    }
                } else if (isDestination) {
                    if (isOwnAccount) {
                        return "Transfer from Own Account";
                    } else if (hasCounterparty) {
                        return "Transfer from " + counterparty;
                    } else {
                        return "Incoming Transfer";
                    }
                } else {
                    if (isOwnAccount) {
                        return "Transfer to Own Account";
                    } else if (hasCounterparty) {
                        return "Transfer to " + counterparty;
                    } else {
                        return "Internal Transfer";
                    }
                }

            case "EXTERNAL_PAYMENT":
                if (isSource) {
                    if (hasCounterparty) {
                        return "Payment to " + counterparty;
                    } else {
                        return "Payment";
                    }
                } else if (isDestination) {
                    if (hasCounterparty) {
                        return "Payment from " + counterparty;
                    } else {
                        return "Payment Received";
                    }
                } else {
                    if (hasCounterparty) {
                        return "Payment to " + counterparty;
                    } else {
                        return "Payment";
                    }
                }

            case "REFUND":
                if (isSource) {
                    return "Refund";
                } else {
                    return "Refund Received";
                }

            case "OTC_DEPOSIT":
                return "Cash Deposit";

            case "OTC_WITHDRAWAL":
                return "Cash Withdrawal";

            case "LEDGER_ADJUSTMENT":
                return "Account Adjustment";

            default:
                return fallbackTitle(description, transactionType);
        }
    }

    private static String fallbackTitle(String description, String transactionType) {
        if (description != null && !description.trim().isEmpty()) {
            return description.trim();
        }
        if (transactionType != null && !transactionType.trim().isEmpty()) {
            return toHumanReadableType(transactionType.trim());
        }
        return "Transaction";
    }

    private static String toHumanReadableType(String type) {
        String[] parts = type.split("_");
        StringBuilder sb = new StringBuilder();
        for (String part : parts) {
            if (part.isEmpty()) continue;
            if (sb.length() > 0) sb.append(" ");
            sb.append(Character.toUpperCase(part.charAt(0)));
            if (part.length() > 1) {
                sb.append(part.substring(1).toLowerCase());
            }
        }
        return sb.length() > 0 ? sb.toString() : "Transaction";
    }
}
