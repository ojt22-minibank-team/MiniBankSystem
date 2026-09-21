package com.corebanking.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestController {

    // =====================================================
    // ADMIN TEST
    // =====================================================

    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> adminAccess() {

        return ResponseEntity.ok(
                "Admin Access Granted"
        );
    }


    // =====================================================
    // TELLER TEST
    // =====================================================

    @GetMapping("/teller")
    @PreAuthorize("hasRole('TELLER')")
    public ResponseEntity<String> tellerAccess() {

        return ResponseEntity.ok(
                "Teller Access Granted"
        );
    }


    // =====================================================
    // AUDITOR TEST
    // =====================================================

    @GetMapping("/auditor")
    @PreAuthorize("hasRole('AUDITOR')")
    public ResponseEntity<String> auditorAccess() {

        return ResponseEntity.ok(
                "Auditor Access Granted"
        );
    }
}