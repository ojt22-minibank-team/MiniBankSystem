package com.corebanking.service;

import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.repository.PermissionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final StaffUsersRepository staffUsersRepository;
    private final RolesRepository rolesRepository;
    private final PermissionsRepository permissionsRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public CoreLoginResponse login(CoreLoginRequest request) {

        StaffUsers staff = staffUsersRepository
                .findByUsername(request.getUsername())
                .orElseThrow(() -> new RuntimeException("Invalid username or password"));

        if (!passwordEncoder.matches(request.getPassword(), staff.getPasswordHash())) {
            throw new RuntimeException("Invalid username or password");
        }

        if (staff.getStatus() != StaffUserStatus.ACTIVE) {
            throw new RuntimeException("Account is not active");
        }

        UUID staffId = staff.getStaffId();

        // Fetch Roles and Permissions from database using UUID as bytes
        List<String> roles = rolesRepository.findRoleCodesByStaffId(uuidToBytes(staffId));
        List<String> permissions = permissionsRepository.findPermissionCodesByStaffId(uuidToBytes(staffId));

        // Generate Token with Roles and Permissions
        String token = jwtService.generateToken(
                staffId,
                staff.getUsername(),
                staff.getTokenVersion(),
                roles,
                permissions
        );

        return new CoreLoginResponse(token, staff.getUsername(), roles, permissions);
    }

    // Convert UUID to byte[] for native queries (BINARY(16) storage)
    private byte[] uuidToBytes(UUID uuid) {
        long msb = uuid.getMostSignificantBits();
        long lsb = uuid.getLeastSignificantBits();
        byte[] bytes = new byte[16];
        for (int i = 0; i < 8; i++) {
            bytes[i]     = (byte) (msb >>> (56 - 8 * i));
            bytes[i + 8] = (byte) (lsb >>> (56 - 8 * i));
        }
        return bytes;
    }
}