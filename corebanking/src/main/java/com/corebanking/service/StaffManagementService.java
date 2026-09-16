package com.corebanking.service;

import com.corebanking.dto.ChangeStaffRoleRequest;
import com.corebanking.dto.PasswordResetRequest;
import com.corebanking.dto.StaffCreateRequest;
import com.corebanking.dto.StaffResponse;
import com.corebanking.dto.StaffUpdateRequest;
import com.corebanking.entity.Roles;
import com.corebanking.entity.StaffUserRoles;
import com.corebanking.entity.StaffUsers;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffUserRolesRepository;
import com.corebanking.repository.StaffUsersRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StaffManagementService {

    private final StaffUsersRepository staffUsersRepository;
    private final StaffUserRolesRepository staffUserRolesRepository;
    private final RolesRepository rolesRepository;
    private final PasswordEncoder passwordEncoder;


    // =====================================================
    // 1. CREATE STAFF
    // =====================================================

    public StaffResponse createStaff(StaffCreateRequest request) {

        // Check username
        if (staffUsersRepository
                .existsByUsernameCustom(request.getUsername())) {

            throw new RuntimeException(
                    "Username already exists"
            );
        }

        // Check staff number
        if (staffUsersRepository
                .existsByStaffNo(request.getStaff_no())) {

            throw new RuntimeException(
                    "Staff number already exists"
            );
        }

        // Check role
        Roles role = rolesRepository
                .findById(request.getRole_id())
                .orElseThrow(() ->
                        new RuntimeException("Role not found")
                );


        // =================================================
        // Create Staff
        // =================================================

        StaffUsers staff = new StaffUsers();

        staff.setStaff_no(request.getStaff_no());
        staff.setUsername(request.getUsername());
        staff.setFull_name(request.getFull_name());
        staff.setEmail(request.getEmail());
        staff.setPhone(request.getPhone());

        // Hash password
        staff.setPassword_hash(
                passwordEncoder.encode(
                        request.getPassword()
                )
        );

        // New staff must change temporary password
        staff.setMust_change_password(true);
        staff.setPassword_changed_at(null);

        // Default status
        staff.setStatus("ACTIVE");

        // Login security fields
        staff.setFailed_login_count(0);
        staff.setLocked_until(null);
        staff.setLast_login_at(null);

        // JWT token version
        staff.setToken_version(0);

        LocalDateTime now = LocalDateTime.now();

        staff.setCreated_at(now);
        staff.setUpdated_at(now);


        // Save Staff first
        StaffUsers savedStaff =
                staffUsersRepository.save(staff);


        // =================================================
        // Assign Role
        // =================================================

        StaffUserRoles staffRole =
                new StaffUserRoles();

        staffRole.setStaff_id(
                savedStaff.getStaff_id()
        );

        staffRole.setRole_id(
                role.getRole_id()
        );

        staffRole.setAssigned_at(now);
        staffRole.setUpdated_at(now);

        staffUserRolesRepository.save(staffRole);


        // Return DTO
        return toResponse(savedStaff);
    }


    // =====================================================
    // 2. GET ALL STAFF
    // =====================================================

    public List<StaffResponse> getAllStaff() {

        return staffUsersRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }


    // =====================================================
    // 3. GET STAFF BY ID
    // =====================================================

    public StaffResponse getStaffById(Long staffId) {

        StaffUsers staff =
                staffUsersRepository.findById(staffId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );

        return toResponse(staff);
    }


    // =====================================================
    // 4. UPDATE STAFF INFORMATION
    // =====================================================

    public StaffResponse updateStaff(
            Long staffId,
            StaffUpdateRequest request
    ) {

        StaffUsers staff =
                staffUsersRepository.findById(staffId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );


        staff.setFull_name(
                request.getFull_name()
        );

        staff.setEmail(
                request.getEmail()
        );

        staff.setPhone(
                request.getPhone()
        );

        staff.setUpdated_at(
                LocalDateTime.now()
        );


        StaffUsers updatedStaff =
                staffUsersRepository.save(staff);


        return toResponse(updatedStaff);
    }


    // =====================================================
    // 5. CHANGE STAFF ROLE
    // =====================================================

    public StaffResponse changeRole(
            Long staffId,
            ChangeStaffRoleRequest request
    ) {

        // Check staff
        StaffUsers staff =
                staffUsersRepository.findById(staffId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );


        // Check new role
        Roles role =
                rolesRepository.findById(
                        request.getRole_id()
                )
                .orElseThrow(() ->
                        new RuntimeException(
                                "Role not found"
                        )
                );


        // Find current role
        StaffUserRoles staffRole =
                staffUserRolesRepository
                        .findByStaffId(staffId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff role not found"
                                )
                        );


        // Change role
        staffRole.setRole_id(
                role.getRole_id()
        );

        staffRole.setUpdated_at(
                LocalDateTime.now()
        );


        staffUserRolesRepository.save(staffRole);


        return toResponse(staff);
    }


    // =====================================================
    // 6. DEACTIVATE STAFF
    // =====================================================

    public StaffResponse deactivateStaff(
            Long staffId
    ) {

        StaffUsers staff =
                staffUsersRepository.findById(staffId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );


        if ("INACTIVE".equals(staff.getStatus())) {

            throw new RuntimeException(
                    "Staff account is already inactive"
            );
        }


        // Deactivate
        staff.setStatus("INACTIVE");


        // Invalidate existing JWT tokens
        staff.setToken_version(
                staff.getToken_version() + 1
        );


        staff.setUpdated_at(
                LocalDateTime.now()
        );


        StaffUsers updatedStaff =
                staffUsersRepository.save(staff);


        return toResponse(updatedStaff);
    }


    // =====================================================
    // 7. RESET PASSWORD
    // =====================================================

    public void resetPassword(
            Long staffId,
            PasswordResetRequest request
    ) {

        StaffUsers staff =
                staffUsersRepository.findById(staffId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );


        if ("INACTIVE".equals(staff.getStatus())) {

            throw new RuntimeException(
                    "Cannot reset password for inactive staff"
            );
        }


        // Hash new password
        staff.setPassword_hash(
                passwordEncoder.encode(
                        request.getNew_password()
                )
        );


        // Force password change on next login
        staff.setMust_change_password(true);

        staff.setPassword_changed_at(null);


        // Reset login failure counter
        staff.setFailed_login_count(0);

        staff.setLocked_until(null);


        // Invalidate old JWT tokens
        staff.setToken_version(
                staff.getToken_version() + 1
        );


        staff.setUpdated_at(
                LocalDateTime.now()
        );


        staffUsersRepository.save(staff);
    }


    // =====================================================
    // ENTITY -> DTO
    // =====================================================

    private StaffResponse toResponse(
            StaffUsers staff
    ) {

        return new StaffResponse(

                staff.getStaff_id(),

                staff.getStaff_no(),

                staff.getUsername(),

                staff.getFull_name(),

                staff.getEmail(),

                staff.getPhone(),

                staff.getMust_change_password(),

                staff.getStatus(),

                staff.getLast_login_at(),

                staff.getCreated_at(),

                staff.getUpdated_at()
        );
    }
}