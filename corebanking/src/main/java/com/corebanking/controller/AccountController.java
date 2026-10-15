package com.corebanking.controller;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.dto.CorporateAccountResponseDTO;
import com.corebanking.dto.JointHolderAddDTO;
import com.corebanking.service.AccountService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/accounts")
@CrossOrigin(origins = "http://localhost:5173", allowedHeaders = "*")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    /**
     * Retail Account ဖွင့်လှစ်ခြင်း
     */
    @PostMapping
    public ResponseEntity<AccountResponseDTO> createAccount(@Valid @RequestBody AccountCreateDTO dto) {
        AccountResponseDTO response = accountService.createAccount(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Corporate Account ဖွင့်လှစ်ခြင်း (CEO, Accountant တို့အတွက် သီးခြား Corporate Password များဖြင့်)
     */
    @PostMapping("/corporate")
    public ResponseEntity<CorporateAccountResponseDTO> createCorporateAccount(
            @Valid @RequestBody CorporateAccountCreateDTO dto) {
        CorporateAccountResponseDTO response = accountService.createCorporateAccount(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Account နံပါတ်ဖြင့် အကောင့်အချက်အလက် ကြည့်ရှုခြင်း
     */
    @GetMapping("/{accountNumber}")
    public ResponseEntity<AccountResponseDTO> getAccountByNumber(@PathVariable String accountNumber) {
        AccountResponseDTO response = accountService.getAccountByNumber(accountNumber);
        return ResponseEntity.ok(response);
    }

    /**
     * Customer Code ဖြင့် အကောင့်များ ရှာဖွေခြင်း
     */
    @GetMapping("/customer/{customerCode}")
    public ResponseEntity<List<AccountResponseDTO>> getAccountsByCustomerCode(@PathVariable String customerCode) {
        List<AccountResponseDTO> accounts = accountService.getAccountsByCustomerCode(customerCode);
        return ResponseEntity.ok(accounts);
    }

    /**
     * အကောင့်အားလုံး ကြည့်ရှုခြင်း (Staff / Admin Portal အတွက်)
     */
    @GetMapping
    public ResponseEntity<List<AccountResponseDTO>> getAllAccounts() {
        List<AccountResponseDTO> accounts = accountService.getAllAccounts();
        return ResponseEntity.ok(accounts);
    }

    /**
     * Joint Holder ထည့်သွင်းခြင်း
     */
    @PostMapping("/{accountNumber}/joint-holders")
    public ResponseEntity<AccountResponseDTO> addJointHolder(
            @PathVariable String accountNumber,
            @Valid @RequestBody JointHolderAddDTO dto) {
        AccountResponseDTO response = accountService.addJointHolder(accountNumber, dto);
        return ResponseEntity.ok(response);
    }
}