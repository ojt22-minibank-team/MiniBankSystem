package com.corebanking.service;

import com.corebanking.dto.ChangeStaffRoleRequest;
import com.corebanking.dto.PasswordResetRequest;
import com.corebanking.dto.StaffCreateRequest;
import com.corebanking.dto.StaffResponse;
import com.corebanking.dto.StaffUpdateRequest;
import com.corebanking.entity.Roles;
import com.corebanking.entity.StaffUserRoles;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffUserRolesRepository;
import com.corebanking.repository.StaffUsersRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

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
                .existsByStaffNo(request.getStaffNo())) {

            throw new RuntimeException(
                    "Staff number already exists"
            );
        }

        // Check role
        Roles role = rolesRepository
                .findById(request.getRoleId())
                .orElseThrow(() ->
                        new RuntimeException("Role not found")
                );


        // =================================================
        // Create Staff
        // =================================================

        StaffUsers staff = new StaffUsers();

        staff.setStaffNo(request.getStaffNo());
        staff.setUsername(request.getUsername());
        staff.setFullName(request.getFullName());
        staff.setEmail(request.getEmail());
        staff.setPhone(request.getPhone());

        // Hash password
        staff.setPasswordHash(
                passwordEncoder.encode(
                        request.getPassword()
                )
        );

        // New staff must change temporary password
        staff.setMustChangePassword(true);
        staff.setPasswordChangedAt(null);

        // Default status
        staff.setStatus(StaffUserStatus.ACTIVE);

        // Login security fields
        staff.setFailedLoginCount(0);
        staff.setLockedUntil(null);
        staff.setLastLoginAt(null);

        // JWT token version
        staff.setTokenVersion(1L);

        LocalDateTime now = LocalDateTime.now();

        staff.setCreatedAt(now);
        staff.setUpdatedAt(now);


        // Save Staff first
        StaffUsers savedStaff =
                staffUsersRepository.save(staff);


        // =================================================
        // Assign Role
        // =================================================

        StaffUserRoles staffRole =
                new StaffUserRoles();

        staffRole.setStaffId(
                savedStaff.getStaffId()
        );

        staffRole.setRoleId(
                role.getRoleId()
        );

        staffRole.setAssignedAt(now);
        staffRole.setUpdatedAt(now);

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

    public StaffResponse getStaffById(UUID staffId) {

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
            UUID staffId,
            StaffUpdateRequest request
    ) {

        StaffUsers staff =
                staffUsersRepository.findById(staffId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );


        staff.setFullName(
                request.getFullName()
        );

        staff.setEmail(
                request.getEmail()
        );

        staff.setPhone(
                request.getPhone()
        );

        staff.setUpdatedAt(
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
         UUID staffId,
         ChangeStaffRoleRequest request
 ) {
     // Check staff
     StaffUsers staff =
             staffUsersRepository.findById(staffId)
                     .orElseThrow(() ->
                             new RuntimeException("Staff not found")
                     );

     // Check new role
     Roles role =
             rolesRepository.findById(
                     request.getRoleId()
             )
             .orElseThrow(() ->
                     new RuntimeException("Role not found")
             );

     // Find current role association
     StaffUserRoles staffRole =
             staffUserRolesRepository
                     .findByStaffId(staffId)
                     .orElseThrow(() ->
                             new RuntimeException("Staff role not found")
                     );

     // Primary Key ပြောင်းလို့မရတဲ့အတွက် အဟောင်းကို ဖျက်ပါ
     staffUserRolesRepository.delete(staffRole);
     staffUserRolesRepository.flush(); // Database ထဲသို့ ချက်ချင်းသက်ရောက်စေရန်

     // Role အသစ်ဖြင့် အသစ်ပြန်ဆောက်ပါ
     StaffUserRoles newStaffRole = new StaffUserRoles();
     newStaffRole.setStaffId(staffId);
     newStaffRole.setRoleId(role.getRoleId());
     newStaffRole.setAssignedAt(LocalDateTime.now());
     newStaffRole.setUpdatedAt(LocalDateTime.now());

     staffUserRolesRepository.save(newStaffRole);

     return toResponse(staff);
 }


    // =====================================================
    // 6. DEACTIVATE STAFF
    // =====================================================

    public StaffResponse deactivateStaff(
            UUID staffId
    ) {

        StaffUsers staff =
                staffUsersRepository.findById(staffId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );


        if (staff.getStatus() == StaffUserStatus.DEACTIVATED) {

            throw new RuntimeException(
                    "Staff account is already inactive"
            );
        }


        // Deactivate
        staff.setStatus(StaffUserStatus.DEACTIVATED);


        // Invalidate existing JWT tokens
        staff.setTokenVersion(
                staff.getTokenVersion() + 1
        );


        staff.setUpdatedAt(
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
            UUID staffId,
            PasswordResetRequest request
    ) {

        StaffUsers staff =
                staffUsersRepository.findById(staffId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );


        if (staff.getStatus() == StaffUserStatus.DEACTIVATED) {

            throw new RuntimeException(
                    "Cannot reset password for inactive staff"
            );
        }


        // Hash new password
        staff.setPasswordHash(
                passwordEncoder.encode(
                        request.getNewPassword()
                )
        );


        // Force password change on next login
        staff.setMustChangePassword(true);

        staff.setPasswordChangedAt(null);


        // Reset login failure counter
        staff.setFailedLoginCount(0);

        staff.setLockedUntil(null);


        // Invalidate old JWT tokens
        staff.setTokenVersion(
                staff.getTokenVersion() + 1
        );


        staff.setUpdatedAt(
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

                staff.getStaffId(),

                staff.getStaffNo(),

                staff.getUsername(),

                staff.getFullName(),

                staff.getEmail(),

                staff.getPhone(),

                staff.isMustChangePassword(),

                staff.getStatus(),

                staff.getLastLoginAt(),

                staff.getCreatedAt(),

                staff.getUpdatedAt()
        );
    }
}