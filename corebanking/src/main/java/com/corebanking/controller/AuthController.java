package com.corebanking.controller;

import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.security.JwtService;
import lombok.RequiredArgsConstructor;
import lombok.Getter;
import lombok.Setter;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final StaffUsersRepository staffUsersRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService; // Member 1 ၏ JwtService ကို တိုက်ရိုက် အသုံးပြုခြင်း

    @Getter
    @Setter
    public static class LoginRequest {
        private String username;
        private String password;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        // ၁။ Database မှ Staff User ကို ရှာဖွေခြင်း
        StaffUsers staff = staffUsersRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        // ၂။ Password ကို BCrypt ဖြင့် စစ်ဆေးခြင်း
        if (!passwordEncoder.matches(request.getPassword(), staff.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "Invalid username or password"));
        }

        // ၃။ Staff Status Active ဖြစ်မဖြစ် စစ်ဆေးခြင်း
        if (staff.getStatus() != StaffUserStatus.ACTIVE) {
            return ResponseEntity.status(403).body(Map.of("error", "User account is not active"));
        }

        // ၄။ tokenVersion ကို တိုက်ရိုက် ရယူပြီး Member 1 ၏ JwtService သို့ ပေးပို့ခြင်း
        long tokenVersion = staff.getTokenVersion(); // ဤနေရာတွင် null check ဖြုတ်ပြီး တိုက်ရိုက် ထည့်သွင်းထားပါသည်
        
        List<String> roles = List.of("STAFF", "ADMIN");
        List<String> permissions = List.of("CUSTOMER_READ", "CUSTOMER_WRITE");

        String realJwtToken = jwtService.generateToken(
                staff.getStaffId(),         // 1. UUID staffId
                staff.getUsername(),        // 2. String username
                tokenVersion,               // 3. long tokenVersion
                roles,                      // 4. List<String> roles
                permissions                 // 5. List<String> permissions
        );

        // ၅။ Postman သို့ Token အစစ် ပြန်လည် ပေးပို့ခြင်း
        return ResponseEntity.ok(Map.of(
                "token", realJwtToken,
                "type", "Bearer",
                "username", staff.getUsername(),
                "status", "SUCCESS"
        ));
    }}