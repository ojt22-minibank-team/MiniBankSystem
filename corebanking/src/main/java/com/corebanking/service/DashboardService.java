package com.corebanking.service;

import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.DashboardResponseDTO;
import com.corebanking.entity.Customers;
import com.corebanking.repository.CustomerRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DashboardService {

    private final CustomerRepository customerRepository;
    private final AccountService accountService;

    @Transactional(readOnly = true)
    public DashboardResponseDTO getDashboard(String customerCode) {

        // 1. Find customer
        Customers customer = customerRepository.findByCustomerCode(customerCode)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Customer not found with code: " + customerCode
                        )
                );

        // 2. Get customer's accounts
        List<AccountResponseDTO> accounts =
                accountService.getAccountsByCustomerCode(customerCode);

        // 3. Calculate total available balance
        BigDecimal totalBalance = accounts.stream()
                .map(AccountResponseDTO::getAvailableBalance)
                .filter(balance -> balance != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        // 4. Count accounts
        int accountCount = accounts.size();

        // 5. Return dashboard
        return DashboardResponseDTO.builder()
                .customerCode(customer.getCustomerCode())
                .fullName(customer.getFullName())
                .totalBalance(totalBalance)
                .accountCount(accountCount)
                .accounts(accounts)
                .build();
    }
}