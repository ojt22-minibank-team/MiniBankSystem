package com.corebanking.controller;

import com.corebanking.dto.CusAccountResponseDTO;
import com.corebanking.service.CusAccountService;
import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/customer/accounts")
@RequiredArgsConstructor
public class CusAccountController {

    private final CusAccountService customerAccountService;

    /**
     * Get all accounts belonging to logged-in customer
     */
    @GetMapping
    public ResponseEntity<List<CusAccountResponseDTO>> getMyAccounts() {

        List<CusAccountResponseDTO> accounts =
                customerAccountService.getMyAccounts();

        return ResponseEntity.ok(accounts);
    }

    /**
     * Get one account belonging to logged-in customer
     */
    @GetMapping("/{accountNumber}")
    public ResponseEntity<CusAccountResponseDTO> getMyAccount(
            @PathVariable String accountNumber) {

        CusAccountResponseDTO account =
                customerAccountService.getMyAccount(accountNumber);

        return ResponseEntity.ok(account);
    }
}