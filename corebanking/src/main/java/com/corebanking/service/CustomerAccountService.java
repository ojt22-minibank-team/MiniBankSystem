package com.corebanking.service;

import com.corebanking.dto.CustomerAccountResponseDTO;
import com.corebanking.entity.Accounts;
import com.corebanking.repository.AccountRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerAccountService {

    private final AccountRepository accountRepository;

    // =========================================================
    // GET LOGGED-IN CUSTOMER ID
    // =========================================================

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

        boolean isCustomer =
                authentication
                        .getAuthorities()
                        .stream()
                        .anyMatch(authority ->
                                authority.getAuthority()
                                        .equals("ROLE_CUSTOMER")
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


    // =========================================================
    // GET MY ACCOUNTS
    // =========================================================

    public List<CustomerAccountResponseDTO> getMyAccounts() {

        UUID customerId =
                getAuthenticatedCustomerId();

        List<Accounts> accounts =
                accountRepository
                        .findByCustomerCustomerId(customerId);

        return accounts
                .stream()
                .map(this::mapToResponse)
                .toList();
    }


    // =========================================================
    // GET MY ACCOUNT BY ACCOUNT NUMBER
    // =========================================================

    public CustomerAccountResponseDTO getMyAccount(
            String accountNumber) {

        if (accountNumber == null
                || accountNumber.isBlank()) {

            throw new RuntimeException(
                    "Account number is required."
            );
        }

        UUID customerId =
                getAuthenticatedCustomerId();

        Accounts account =
                accountRepository
                        .findByAccountNumber(
                                accountNumber.trim()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Account not found."
                                )
                        );

        // =====================================================
        // OWNERSHIP CHECK
        // =====================================================

        if (account.getCustomer() == null
                || account.getCustomer().getCustomerId() == null
                || !account.getCustomer()
                        .getCustomerId()
                        .equals(customerId)) {

            throw new RuntimeException(
                    "You are not authorized to access this account."
            );
        }

        return mapToResponse(account);
    }


    // =========================================================
    // ENTITY → CUSTOMER RESPONSE DTO
    // =========================================================

    private CustomerAccountResponseDTO mapToResponse(
            Accounts account) {

        return CustomerAccountResponseDTO.builder()

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

                .minimumBalance(
                        account.getMinimumBalance()
                )

                .dailyTransferLimit(
                        account.getDailyTransferLimit()
                )

                .status(
                        account.getStatus() != null
                                ? account.getStatus().name()
                                : null
                )

                .jointAccount(
                        account.isJointAccount()
                )

                // Accounts = short
                // DTO = Integer
                .requiredApprovals(
                        (int) account.getRequiredApprovals()
                )

                .openedAt(
                        account.getOpenedAt()
                )

                .closedAt(
                        account.getClosedAt()
                )

                .build();
    }
}