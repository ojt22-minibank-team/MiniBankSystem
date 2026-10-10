package com.corebanking.controller;

import com.corebanking.dto.AccountCreateDTO;
import com.corebanking.dto.AccountResponseDTO;
import com.corebanking.dto.AccountStatusUpdateDTO;
import com.corebanking.dto.CorporateAccountCreateDTO;
import com.corebanking.dto.DepositRequestDTO;
import com.corebanking.dto.JointHolderAddDTO;
import com.corebanking.service.AccountService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/accounts")
@RequiredArgsConstructor
public class AccountController {

    private final AccountService accountService;

    /**
     * ၁။ [အသစ်ထည့်သွင်းချက်] စနစ်အတွင်းရှိ အကောင့်အားလုံး စာရင်းဆွဲယူခြင်း
     * Dashboard Metrics နှင့် All Accounts Directory အတွက် အဓိက အသုံးပြုသည်
     * GET /api/accounts
     */
    @GetMapping
    public ResponseEntity<List<AccountResponseDTO>> getAllAccounts() {
        List<AccountResponseDTO> accounts = accountService.getAllAccounts();
        return ResponseEntity.ok(accounts);
    }

    // ၂။ Retail / Personal အကောင့်အသစ် ဖွင့်လှစ်ခြင်း
    @PostMapping
    public ResponseEntity<AccountResponseDTO> createAccount(@RequestBody AccountCreateDTO dto) {
        AccountResponseDTO response = accountService.createAccount(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // ၃။ Company Account အား CEO နှင့် Accountant တို့ဖြင့် ဖွင့်လှစ်ခြင်း
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

    // ၄။ Account Number ဖြင့် အသေးစိတ် ရှာဖွေခြင်း (Account Lookup)
    @GetMapping("/{accountNumber}")
    public ResponseEntity<AccountResponseDTO> getAccountByNumber(@PathVariable String accountNumber) {
        AccountResponseDTO response = accountService.getAccountByNumber(accountNumber);
        return ResponseEntity.ok(response);
    }

    // ၅။ Customer တစ်ဦးချင်းစီ ပိုင်ဆိုင်သည့် အကောင့်များအားလုံး စာရင်းဆွဲယူခြင်း
    @GetMapping("/customer/{customerCode}")
    public ResponseEntity<List<AccountResponseDTO>> getAccountsByCustomerCode(
            @PathVariable String customerCode) {
        List<AccountResponseDTO> accounts = accountService.getAccountsByCustomerCode(customerCode);
        return ResponseEntity.ok(accounts);
    }

    // ၆။ Account Status အခြေအနေ ပြင်ဆင်ခြင်း (PATCH Request)
    @PatchMapping("/{accountNumber}/status")
    public ResponseEntity<AccountResponseDTO> updateAccountStatus(
            @PathVariable String accountNumber,
            @RequestBody AccountStatusUpdateDTO dto) {
        AccountResponseDTO response = accountService.updateAccountStatus(accountNumber, dto);
        return ResponseEntity.ok(response);
    }

    // ၇။ အကောင့်ထဲသို့ Joint Holder ထည့်သွင်းခြင်း
    @PostMapping("/{accountNumber}/joint-holders")
    public ResponseEntity<AccountResponseDTO> addJointHolder(
            @PathVariable String accountNumber,
            @RequestBody JointHolderAddDTO dto) {
        AccountResponseDTO response = accountService.addJointHolder(accountNumber, dto);
        return ResponseEntity.ok(response);
    }
    @PostMapping("/deposit")
    public ResponseEntity<AccountResponseDTO> depositFunds(@Valid @RequestBody DepositRequestDTO dto) {
        AccountResponseDTO response = accountService.depositFunds(dto);
        return ResponseEntity.ok(response);
    }
}