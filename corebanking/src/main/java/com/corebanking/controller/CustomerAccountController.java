package com.corebanking.controller;

import com.corebanking.dto.CustomerAccountResponseDTO;
import com.corebanking.service.CustomerAccountService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer/accounts")
@RequiredArgsConstructor
public class CustomerAccountController {

    private final CustomerAccountService customerAccountService;

    /**
     * Get all accounts belonging to logged-in customer
     */
    @GetMapping
    public ResponseEntity<List<CustomerAccountResponseDTO>> getMyAccounts() {

        List<CustomerAccountResponseDTO> accounts =
                customerAccountService.getMyAccounts();

        return ResponseEntity.ok(accounts);
    }

    /**
     * Get one account belonging to logged-in customer
     */
    @GetMapping("/{accountNumber}")
    public ResponseEntity<CustomerAccountResponseDTO> getMyAccount(
            @PathVariable String accountNumber) {

        CustomerAccountResponseDTO account =
                customerAccountService.getMyAccount(accountNumber);

        return ResponseEntity.ok(account);
    }
}