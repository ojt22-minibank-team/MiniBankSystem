package com.corebanking.service;

import com.corebanking.dto.CusAccountStatementDTO;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.repository.CusAccountStatementRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.dao.DataAccessException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.sql.SQLException;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Service for G1 Customer Account Statement.
 * Orchestrates customer authentication, backend input validation,
 * stored procedure invocation, and database error translation.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CusAccountStatementService {

    private final CusAccountStatementRepository statementRepository;

    /**
     * Retrieves the account statement for the currently authenticated customer.
     * Extracts the customer UUID from Spring SecurityContext.
     *
     * @param accountNumber The account number selected by the customer
     * @param fromDate      Statement start date (inclusive)
     * @param toDate        Statement end date (inclusive)
     * @return Complete statement with header, summary, and transaction rows
     */
    public CusAccountStatementDTO getAccountStatement(
            String accountNumber,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        UUID authenticatedCustomerId = getAuthenticatedCustomerId();
        return getAccountStatement(authenticatedCustomerId, accountNumber, fromDate, toDate);
    }

    /**
     * Retrieves the account statement for a specific customer UUID.
     * Validates date parameters, delegates to repository, and translates SP errors.
     *
     * @param customerId    The authenticated customer UUID
     * @param accountNumber The account number selected by the customer
     * @param fromDate      Statement start date (inclusive)
     * @param toDate        Statement end date (inclusive)
     * @return Complete statement with header, summary, and transaction rows
     */
    public CusAccountStatementDTO getAccountStatement(
            UUID customerId,
            String accountNumber,
            LocalDate fromDate,
            LocalDate toDate
    ) {
        validateRequest(customerId, accountNumber, fromDate, toDate);

        try {
            CusAccountStatementDTO statement = statementRepository.getAccountStatement(
                    customerId, accountNumber, fromDate, toDate
            );

            if (statement == null) {
                throw new AccountNotFoundException("Account not found or access denied for this customer");
            }

            return statement;
        } catch (DataAccessException ex) {
            handleDatabaseException(ex);
            throw ex;
        }
    }

    /**
     * Extracts and validates the authenticated customer UUID from SecurityContext.
     *
     * @return Authenticated customer UUID
     * @throws CusAuthenticationException if unauthenticated or missing ROLE_CUSTOMER
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
     * Validates backend request parameters before invoking the database.
     */
    private void validateRequest(UUID customerId, String accountNumber, LocalDate fromDate, LocalDate toDate) {
        if (customerId == null) {
            throw new CusAuthenticationException("Customer identity is required.");
        }
        if (accountNumber == null || accountNumber.trim().isEmpty()) {
            throw new CusValidationException("Account number is required.");
        }
        if (fromDate == null) {
            throw new CusValidationException("From Date is required.");
        }
        if (toDate == null) {
            throw new CusValidationException("To Date is required.");
        }

        LocalDate today = LocalDate.now();

        if (fromDate.isAfter(today)) {
            throw new CusValidationException("From Date cannot be in the future.");
        }
        if (toDate.isAfter(today)) {
            throw new CusValidationException("To Date cannot be in the future.");
        }
        if (fromDate.isAfter(toDate)) {
            throw new CusValidationException("From Date cannot be later than To Date.");
        }
    }

    /**
     * Translates MySQL stored procedure errors (SQLSTATE '45000') into domain exceptions.
     */
    private void handleDatabaseException(DataAccessException ex) {
        Throwable root = ex.getRootCause();
        String message = root != null ? root.getMessage() : ex.getMessage();

        if (root instanceof SQLException sqlEx) {
            String sqlState = sqlEx.getSQLState();
            if ("45000".equals(sqlState) && message != null) {
                if (message.contains("From Date cannot be earlier than the account opening date")) {
                    throw new CusValidationException("From Date cannot be earlier than the account opening date.");
                }
                if (message.contains("Account not found or access denied for this customer")) {
                    throw new AccountNotFoundException("Account not found or access denied for this customer");
                }
                throw new CusValidationException(message);
            }
        }

        if (message != null) {
            if (message.contains("From Date cannot be earlier than the account opening date")) {
                throw new CusValidationException("From Date cannot be earlier than the account opening date.");
            }
            if (message.contains("Account not found or access denied for this customer")) {
                throw new AccountNotFoundException("Account not found or access denied for this customer");
            }
        }
    }
}
