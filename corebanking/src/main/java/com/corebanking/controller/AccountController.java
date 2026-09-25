package com.corebanking.controller;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.AccountStatusUpdateDTO;
import com.corebanking.dto.JointHolderAddDTO;
import com.corebanking.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    @PostMapping
    public ResponseEntity<AccountResponseDTO> createAccount(@RequestBody AccountCreateDTO dto) {
        AccountResponseDTO response = accountService.createAccount(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
    
 // Account Number ဖြင့် အသေးစိတ် ရှာဖွေခြင်း (Account Lookup)
    @GetMapping("/{accountNumber}")
    public ResponseEntity<AccountResponseDTO> getAccountByNumber(@PathVariable String accountNumber) {
        AccountResponseDTO response = accountService.getAccountByNumber(accountNumber);
        return ResponseEntity.ok(response);
    }
 // Customer တစ်ဦးချင်းစီ ပိုင်ဆိုင်သည့် အကောင့်များအားလုံး စာရင်းဆွဲယူခြင်း
    @GetMapping("/customer/{customerCode}")
    public ResponseEntity<java.util.List<AccountResponseDTO>> getAccountsByCustomerCode(
            @PathVariable String customerCode) {
        java.util.List<AccountResponseDTO> accounts = accountService.getAccountsByCustomerCode(customerCode);
        return ResponseEntity.ok(accounts);
    }
    
 // Account Status အခြေအနေ ပြင်ဆင်ခြင်း (PATCH Request)
    @PatchMapping("/{accountNumber}/status")
    public ResponseEntity<AccountResponseDTO> updateAccountStatus(
            @PathVariable String accountNumber,
            @RequestBody AccountStatusUpdateDTO dto) {
        AccountResponseDTO response = accountService.updateAccountStatus(accountNumber, dto);
        return ResponseEntity.ok(response);
    }
    
 // အကောင့်ထဲသို့ Joint Holder ထည့်သွင်းခြင်း
    @PostMapping("/{accountNumber}/joint-holders")
    public ResponseEntity<AccountResponseDTO> addJointHolder(
            @PathVariable String accountNumber,
            @RequestBody JointHolderAddDTO dto) {
        AccountResponseDTO response = accountService.addJointHolder(accountNumber, dto);
        return ResponseEntity.ok(response);
    }
}