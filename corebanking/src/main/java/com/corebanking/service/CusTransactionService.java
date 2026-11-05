package com.corebanking.service;

import com.corebanking.dto.CusTransactionHistoryResponseDTO;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.repository.CusTransactionHistoryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Service for Customer Transaction History (G1).
 * Handles authentication checks, input parameter validations,
 * stored procedure invocation via repository, and database error translation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CusTransactionService {

    private final CusTransactionHistoryRepository repository;

    /**
     * Retrieves filterable paginated transaction history for the authenticated customer.
     */
    public CusTransactionHistoryResponseDTO getTransactionHistory(
            String accountNumber,
            String status,
            String transactionType,
            LocalDate fromDate,
            LocalDate toDate,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            Integer page,
            Integer size
    ) {
        UUID customerId = getAuthenticatedCustomerId();
        return getTransactionHistory(customerId, accountNumber, status, transactionType, fromDate, toDate, minAmount, maxAmount, page, size);
    }

    /**
     * Retrieves filterable paginated transaction history for an explicit customer UUID.
     */
    public CusTransactionHistoryResponseDTO getTransactionHistory(
            UUID customerId,
            String accountNumber,
            String status,
            String transactionType,
            LocalDate fromDate,
            LocalDate toDate,
            BigDecimal minAmount,
            BigDecimal maxAmount,
            Integer page,
            Integer size
    ) {
        if (customerId == null) {
            throw new CusAuthenticationException("Customer identity is required.");
        }
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            throw new CusValidationException("Account number is required.");
        }

        int pageNum = (page != null) ? page : 0;
        if (pageNum < 0) {
            throw new CusValidationException("Page index cannot be negative.");
        }
        int pageSize = (size != null) ? size : 10;
        if (pageSize < 1 || pageSize > 100) {
            throw new CusValidationException("Page size must be between 1 and 100.");
        }

        String cleanStatus = null;
        if (status != null && !status.trim().isEmpty()) {
            cleanStatus = status.trim();
            try {
                TransactionStatus.valueOf(cleanStatus);
            } catch (IllegalArgumentException e) {
                throw new CusValidationException("Unsupported transaction status: " + cleanStatus);
            }
        }

        String cleanType = null;
        if (transactionType != null && !transactionType.trim().isEmpty()) {
            cleanType = transactionType.trim();
            try {
                TransactionType.valueOf(cleanType);
            } catch (IllegalArgumentException e) {
                throw new CusValidationException("Unsupported transaction type: " + cleanType);
            }
        }

        if (fromDate != null && toDate != null && fromDate.isAfter(toDate)) {
            throw new CusValidationException("From Date cannot be later than To Date.");
        }

        if (minAmount != null && minAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new CusValidationException("Minimum amount cannot be negative.");
        }
        if (maxAmount != null && maxAmount.compareTo(BigDecimal.ZERO) < 0) {
            throw new CusValidationException("Maximum amount cannot be negative.");
        }
        if (minAmount != null && maxAmount != null && minAmount.compareTo(maxAmount) > 0) {
            throw new CusValidationException("Minimum amount cannot be greater than maximum amount.");
        }

        try {
            CusTransactionHistoryRepository.ProcedureResult result = repository.getTransactionHistory(
                    customerId, accountNumber.trim(), cleanStatus, cleanType,
                    fromDate, toDate, minAmount, maxAmount, pageNum, pageSize
            );

            long totalElements = result.getTotalElements();
            int totalPages = pageSize > 0 ? (int) Math.ceil((double) totalElements / pageSize) : 0;
            boolean isFirst = (pageNum == 0);
            boolean isLast = (pageNum >= totalPages - 1 || totalPages == 0);
            boolean hasNext = (pageNum < totalPages - 1);
            boolean hasPrev = (pageNum > 0);

            return CusTransactionHistoryResponseDTO.builder()
                    .content(result.getItems())
                    .page(pageNum)
                    .size(pageSize)
                    .totalElements(totalElements)
                    .totalPages(totalPages)
                    .first(isFirst)
                    .last(isLast)
                    .hasNext(hasNext)
                    .hasPrevious(hasPrev)
                    .build();
        } catch (DataAccessException ex) {
            handleDatabaseException(ex);
            throw ex;
        }
    }

    /**
     * Retrieves distinct statuses that actually exist for the selected account.
     */
    public List<String> getDistinctStatuses(String accountNumber) {
        UUID customerId = getAuthenticatedCustomerId();
        return getDistinctStatuses(customerId, accountNumber);
    }

    public List<String> getDistinctStatuses(UUID customerId, String accountNumber) {
        if (customerId == null) {
            throw new CusAuthenticationException("Customer identity is required.");
        }
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            throw new CusValidationException("Account number is required.");
        }
        try {
            return repository.getDistinctStatuses(customerId, accountNumber.trim());
        } catch (DataAccessException ex) {
            handleDatabaseException(ex);
            throw ex;
        }
    }

    /**
     * Retrieves distinct transaction types that actually exist for the selected account.
     */
    public List<String> getDistinctTypes(String accountNumber) {
        UUID customerId = getAuthenticatedCustomerId();
        return getDistinctTypes(customerId, accountNumber);
    }

    public List<String> getDistinctTypes(UUID customerId, String accountNumber) {
        if (customerId == null) {
            throw new CusAuthenticationException("Customer identity is required.");
        }
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            throw new CusValidationException("Account number is required.");
        }
        try {
            return repository.getDistinctTypes(customerId, accountNumber.trim());
        } catch (DataAccessException ex) {
            handleDatabaseException(ex);
            throw ex;
        }
    }

    /**
     * Extracts authenticated customer UUID from SecurityContext.
     */
    public UUID getAuthenticatedCustomerId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new CusAuthenticationException("Customer authentication is required.");
        }

        boolean isCustomer = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_CUSTOMER".equals(a.getAuthority()));

        if (!isCustomer) {
            throw new CusAuthenticationException("Customer access is required.");
        }

        try {
            return UUID.fromString(authentication.getName());
        } catch (IllegalArgumentException ex) {
            throw new CusAuthenticationException("Invalid customer identity.");
        }
    }

    /**
     * Translates database SQLSTATE '45000' and known error messages to application domain exceptions.
     */
    private void handleDatabaseException(DataAccessException ex) {
        Throwable root = ex.getRootCause();
        String message = root != null ? root.getMessage() : ex.getMessage();

        if (root instanceof SQLException sqlEx) {
            String sqlState = sqlEx.getSQLState();
            if ("45000".equals(sqlState) && message != null) {
                if (message.contains("Account not found or access denied for this customer")) {
                    throw new AccountNotFoundException("Account not found or access denied for this customer");
                }
                throw new CusValidationException(message);
            }
        }

        if (message != null && message.contains("Account not found or access denied for this customer")) {
            throw new AccountNotFoundException("Account not found or access denied for this customer");
        }
    }
}
