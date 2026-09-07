package com.corebanking.service;

import com.corebanking.dto.LoginRequest;
import com.corebanking.dto.LoginResponse;
import com.corebanking.entity.StaffUsers;
import com.corebanking.repository.PermissionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final StaffUsersRepository staffUsersRepository;
    private final RolesRepository rolesRepository;
    private final PermissionsRepository permissionsRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public LoginResponse login(LoginRequest request) {

        StaffUsers staff = staffUsersRepository
                .findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), staff.getPassword_hash())) {
            throw new RuntimeException("Invalid username or password");
        }

        if (!"ACTIVE".equals(staff.getStatus())) {
            throw new RuntimeException("Account is not active");
        }

        // Database မှ Roles နှင့် Permissions များကို ဆွဲထုတ်ခြင်း
        List<String> roles = rolesRepository.findRoleCodesByStaffId(staff.getStaff_id());
        List<String> permissions = permissionsRepository.findPermissionCodesByStaffId(staff.getStaff_id());

        // Token ထဲသို့ Roles နှင့် Permissions ထည့်၍ Generate လုပ်ခြင်း
        String token = jwtService.generateToken(staff.getUsername(), roles, permissions);

        return new LoginResponse(token, staff.getUsername(), roles, permissions);
    }
}