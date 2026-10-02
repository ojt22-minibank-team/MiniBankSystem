package com.corebanking.service;

import com.corebanking.dto.DashboardAccountDTO;
import com.corebanking.dto.DashboardResponseDTO;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.Customers;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.CustomerRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;

    @Transactional(readOnly = true)
    public DashboardResponseDTO getDashboard() {

        // Get logged-in customer ID from Customer JWT
        UUID customerId = getAuthenticatedCustomerId();

        // Find customer
        Customers customer = customerRepository
                .findById(customerId)
                .orElseThrow(() ->
                        new RuntimeException("Customer not found.")
                );

        // Get customer's accounts
        List<Accounts> accountEntities =
                accountRepository.findByCustomerCustomerId(customerId);

        // Convert account entities to dashboard DTOs
        List<DashboardAccountDTO> accounts =
                accountEntities.stream()
                        .map(this::mapToDashboardAccount)
                        .toList();

        // Calculate total available balance
        BigDecimal totalBalance = accounts.stream()
                .map(DashboardAccountDTO::getAvailableBalance)
                .filter(balance -> balance != null)
                .reduce(
                        BigDecimal.ZERO,
                        BigDecimal::add
                );

        // Build dashboard response
        return DashboardResponseDTO.builder()
                .customerCode(customer.getCustomerCode())
                .fullName(customer.getFullName())
                .totalBalance(totalBalance)
                .accountCount(accounts.size())
                .accounts(accounts)
                .build();
    }

    /**
     * Get authenticated customer ID.
     *
     * CusJwtAuthenticationFilter stores the
     * Customer UUID in Authentication.getName().
     */
    private UUID getAuthenticatedCustomerId() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()) {

            throw new RuntimeException(
                    "Customer authentication is required."
            );
        }

        // Make sure this is a customer request
        boolean isCustomer =
                authentication.getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                "ROLE_CUSTOMER".equals(
                                        authority.getAuthority()
                                )
                        );

        if (!isCustomer) {

            throw new RuntimeException(
                    "Customer access is required."
            );
        }

        try {

            return UUID.fromString(
                    authentication.getName()
            );

        } catch (IllegalArgumentException ex) {

            throw new RuntimeException(
                    "Invalid customer identity."
            );
        }
    }

    /**
     * Convert Accounts entity to DashboardAccountDTO.
     *
     * No transaction information is included.
     */
    private DashboardAccountDTO mapToDashboardAccount(
            Accounts account) {

        return DashboardAccountDTO.builder()

                .accountNumber(
                        account.getAccountNumber()
                )

                .accountCategory(
                        account.getAccountCategory() != null
                                ? account.getAccountCategory().name()
                                : null
                )

                .accountType(
                        account.getAccountType() != null
                                ? account.getAccountType().name()
                                : null
                )

                .currency(
                        account.getCurrency()
                )

                .currentBalance(
                        account.getCurrentBalance()
                )

                .availableBalance(
                        account.getAvailableBalance()
                )

                .status(
                        account.getStatus() != null
                                ? account.getStatus().name()
                                : null
                )

                .jointAccount(
                        account.isJointAccount()
                )

                .build();
    }
}