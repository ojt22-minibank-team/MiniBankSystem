package com.corebanking.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/test")
public class TestController {

    // Admin Role ရှိသူသာ ဝင်ခွင့်ရမည်
	// ADMIN Role ရထားသော မည်သူမဆို (admin, super_admin, admin02 စသည်ဖြင့်) ဝင်ခွင့်ရမည်
    @GetMapping("/admin")
    @PreAuthorize("hasRole('ADMIN')") 
    public ResponseEntity<String> adminAccess() {
        return ResponseEntity.ok("Admin Access Granted");
    }

    // TELLER Role ရထားသော မည်သူမဆို (teller01, teller02, teller03 အားလုံး) ဝင်ခွင့်ရမည်
    @GetMapping("/teller")
    @PreAuthorize("hasRole('TELLER')") 
    public ResponseEntity<String> tellerAccess() {
        return ResponseEntity.ok("Teller Access Granted");
    }
    
    @GetMapping("/auditor")
    @PreAuthorize("hasRole('AUDITOR')") 
    public ResponseEntity<String> auditorAccess() {
        return ResponseEntity.ok("Auditor Access Granted");
    }
}