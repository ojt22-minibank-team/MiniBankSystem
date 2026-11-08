package com.corebanking.controller;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.AccountStatusUpdateDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.dto.JointHolderAddDTO;
import com.corebanking.service.AccountService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    
    @GetMapping
    public ResponseEntity<List<AccountResponseDTO>> getAllAccounts() {
        List<AccountResponseDTO> accounts = accountService.getAllAccounts();
        return ResponseEntity.ok(accounts);
    }

    
    @PostMapping
    public ResponseEntity<AccountResponseDTO> createAccount(@Valid @RequestBody AccountCreateDTO dto) {
        AccountResponseDTO response = accountService.createAccount(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    
    @PostMapping("/corporate")
    public ResponseEntity<Map<String, Object>> createCorporateAccount(
            @Valid @RequestBody CorporateAccountCreateDTO dto) {

        String accountNumber = accountService.createCorporateAccountWithExistingRoles(dto);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "status", "SUCCESS",
                "message", "Corporate account created successfully with CEO and Accountant",
                "accountNumber", accountNumber
        ));
    }

    
    @GetMapping("/{accountNumber}")
    public ResponseEntity<AccountResponseDTO> getAccountByNumber(@PathVariable String accountNumber) {
        AccountResponseDTO response = accountService.getAccountByNumber(accountNumber);
        return ResponseEntity.ok(response);
    }

    
    @GetMapping("/customer/{customerCode}")
    public ResponseEntity<List<AccountResponseDTO>> getAccountsByCustomerCode(
            @PathVariable String customerCode) {
        List<AccountResponseDTO> accounts = accountService.getAccountsByCustomerCode(customerCode);
        return ResponseEntity.ok(accounts);
    }

    
    @PatchMapping("/{accountNumber}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER')")
    public ResponseEntity<AccountResponseDTO> updateAccountStatus(
            @PathVariable String accountNumber,
            @Valid @RequestBody AccountStatusUpdateDTO dto) {
        AccountResponseDTO response = accountService.updateAccountStatus(accountNumber, dto);
        return ResponseEntity.ok(response);
    }

    
    @PostMapping("/{accountNumber}/joint-holders")
    @PreAuthorize("hasAnyRole('ADMIN', 'TELLER')")
    public ResponseEntity<AccountResponseDTO> addJointHolder(
            @PathVariable String accountNumber,
            @Valid @RequestBody JointHolderAddDTO dto) {
        AccountResponseDTO response = accountService.addJointHolder(accountNumber, dto);
        return ResponseEntity.ok(response);
    }
}