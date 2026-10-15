package com.corebanking.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test-rbac")
public class RbacTestController {

    
    @GetMapping("/admin-only")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> adminAccess() {
        return ResponseEntity.ok("Welcome Admin! You have full system access.");
    }

    
    @GetMapping("/teller/deposit")
    @PreAuthorize("hasRole('TELLER')")
    public ResponseEntity<String> tellerAccess() {
        return ResponseEntity.ok("Deposit successful. Teller access granted.");
    }

    
    @GetMapping("/audit-logs")
    @PreAuthorize("hasAnyRole('AUDITOR', 'ADMIN')")
    public ResponseEntity<String> auditorAccess() {
        return ResponseEntity.ok("Audit logs retrieved successfully.");
    }

    // Permission ကို တိုက်ရိုက်စစ်ဆေးသော API (ဥပမာ - APPROVE_LOAN permission)
    @GetMapping("/loan-approval")
    @PreAuthorize("hasAuthority('APPROVE_LOAN')")
    public ResponseEntity<String> loanApprovalAccess() {
        return ResponseEntity.ok("Loan approved successfully.");
    }
}