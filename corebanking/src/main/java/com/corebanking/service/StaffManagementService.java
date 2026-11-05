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
import com.corebanking.repository.AuthSessionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffUserRolesRepository;
import com.corebanking.repository.StaffUsersRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class StaffManagementService {

    private final StaffUsersRepository staffUsersRepository;
    private final StaffUserRolesRepository staffUserRolesRepository;
    private final RolesRepository rolesRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthSessionsRepository authSessionsRepository;


    // =====================================================
    // 1. CREATE STAFF
    // =====================================================

    public StaffResponse createStaff(StaffCreateRequest request) {

        if (staffUsersRepository.existsByEmailIgnoreCase(
                request.getEmail().trim())) {
            throw new IllegalArgumentException(
                "Email is already registered");
        }

        // Check username
        if (staffUsersRepository
                .existsByUsernameCustom(request.getUsername())) {

            throw new RuntimeException(
                    "Username already exists"
            );
        }

        // Check role
        Roles role = rolesRepository
                .findById(request.getRoleId())
                .orElseThrow(() ->
                        new RuntimeException("Role not found")
                );

        // Role Creation Restriction:
        // An Admin should only be able to create users with 'Teller' and 'Auditor' roles.
        String roleCode = role.getRoleCode();
        if (!"TELLER".equalsIgnoreCase(roleCode) && !"AUDITOR".equalsIgnoreCase(roleCode)) {
            throw new IllegalArgumentException(
                    "Admin can only create staff users with 'Teller' or 'Auditor' roles. Provided role: " + role.getRoleName()
            );
        }

        // =================================================
        // Auto-generated Staff Number
        // =================================================
        String generatedStaffNo = generateUniqueStaffNo(roleCode);

        // =================================================
        // Create Staff
        // =================================================

        StaffUsers staff = new StaffUsers();

        staff.setStaffNo(generatedStaffNo);
        staff.setUsername(request.getUsername());
        staff.setFullName(request.getFullName());
        staff.setEmail(request.getEmail());
        staff.setPhone(request.getPhone());

        staff.setPasswordHash(
                passwordEncoder.encode(
                    java.util.UUID.randomUUID().toString()
                )
            );

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


        // Return DTO with role information
        return toResponse(savedStaff, role);
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

        // Security check: An Admin can ONLY edit their own profile info or non-admin staff info.
        // Admins cannot edit the information of other administrators.
        StaffUsers currentStaff = getCurrentAuthenticatedStaff();
        if (currentStaff != null && isAdministrator(currentStaff)) {
            boolean targetIsAdmin = isAdministrator(staff);
            boolean isSelf = currentStaff.getStaffId().equals(staff.getStaffId());
            if (targetIsAdmin && !isSelf) {
                throw new IllegalArgumentException("Administrators cannot edit the information of other administrators.");
            }
        }

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

    @Transactional // Transactional မဖြစ်မနေ ထည့်ပေးပါ
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

         // Security check: Role modification restrictions
         StaffUsers currentStaff = getCurrentAuthenticatedStaff();
         if (currentStaff != null && isAdministrator(currentStaff)) {
             boolean targetIsAdmin = isAdministrator(staff);
             boolean isSelf = currentStaff.getStaffId().equals(staff.getStaffId());

             if (isSelf) {
                 throw new IllegalArgumentException("Administrators cannot change their own role.");
             }
             if (targetIsAdmin) {
                 throw new IllegalArgumentException("Administrators cannot change the role of other administrators.");
             }
         }

         // Check new role
         Roles newRole =
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

         Roles currentRole = rolesRepository.findById(staffRole.getRoleId()).orElse(null);

         if (currentRole != null && currentRole.getRoleId().equals(newRole.getRoleId())) {
             throw new IllegalArgumentException("Staff member already has the role: " + newRole.getRoleName());
         }

         // Allowed target roles: ADMIN, TELLER, AUDITOR
         String targetRoleCode = newRole.getRoleCode();
         if (!"ADMIN".equalsIgnoreCase(targetRoleCode) &&
             !"TELLER".equalsIgnoreCase(targetRoleCode) &&
             !"AUDITOR".equalsIgnoreCase(targetRoleCode)) {
             throw new IllegalArgumentException("Role change to " + newRole.getRoleName() + " is not permitted.");
         }

         // Primary Key ပြောင်းလို့မရတဲ့အတွက် အဟောင်းကို ဖျက်ပါ
         staffUserRolesRepository.delete(staffRole);
         staffUserRolesRepository.flush(); // Database ထဲသို့ ချက်ချင်းသက်ရောက်စေရန်

         // Role အသစ်ဖြင့် အသစ်ပြန်ဆောက်ပါ
         StaffUserRoles newStaffRole = new StaffUserRoles();
         newStaffRole.setStaffId(staffId);
         newStaffRole.setRoleId(newRole.getRoleId());
         newStaffRole.setAssignedAt(LocalDateTime.now());
         newStaffRole.setUpdatedAt(LocalDateTime.now());

         staffUserRolesRepository.save(newStaffRole);

         // Dynamic ID Update: Automatically update Staff No. to reflect the new role
         String updatedStaffNo = updateStaffNoForRole(staff.getStaffNo(), targetRoleCode);
         staff.setStaffNo(updatedStaffNo);

         staff.setTokenVersion(staff.getTokenVersion() + 1);
         staff.setUpdatedAt(LocalDateTime.now());
         staffUsersRepository.save(staff); // Staff Table ကို Update လုပ်ရန်

         authSessionsRepository.revokeAllActiveSessionsByStaffId(staffId);

         return toResponse(staff, newRole);
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

        // Security check: Admins cannot deactivate themselves or other administrators
        StaffUsers currentStaff = getCurrentAuthenticatedStaff();
        if (currentStaff != null && isAdministrator(currentStaff)) {
            boolean targetIsAdmin = isAdministrator(staff);
            boolean isSelf = currentStaff.getStaffId().equals(staff.getStaffId());

            if (isSelf) {
                throw new IllegalArgumentException("Administrators cannot deactivate their own account.");
            }
            if (targetIsAdmin) {
                throw new IllegalArgumentException("Administrators cannot deactivate other administrators.");
            }
        }

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

        validateAdminCanResetPassword(staffId);

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
    // 8. SECURITY RBAC VALIDATION FOR PASSWORD RESET
    // =====================================================

    public void validateAdminCanResetPassword(UUID targetStaffId) {
        StaffUsers currentStaff = getCurrentAuthenticatedStaff();
        if (currentStaff == null) return;

        StaffUsers targetStaff = staffUsersRepository.findById(targetStaffId)
                .orElseThrow(() -> new IllegalArgumentException("Staff account not found"));

        if (isAdministrator(currentStaff)) {
            boolean targetIsAdmin = isAdministrator(targetStaff);
            boolean isSelf = currentStaff.getStaffId().equals(targetStaff.getStaffId());

            if (targetIsAdmin && !isSelf) {
                throw new IllegalArgumentException("Administrators cannot reset the password of other administrators.");
            }
        }
    }


    // =====================================================
    // 9. GET ALL ROLES
    // =====================================================

    public List<Roles> getAllRoles() {
        return rolesRepository.findAll();
    }


    // =====================================================
    // HELPER METHODS: ID GENERATION & FORMATTING
    // =====================================================

    // Helper: Retrieve the currently authenticated staff entity
    private StaffUsers getCurrentAuthenticatedStaff() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || "anonymousUser".equalsIgnoreCase(auth.getName())) {
            return null;
        }
        return staffUsersRepository.findByUsername(auth.getName()).orElse(null);
    }

    // Helper: Determine if a staff member has the ADMINISTRATOR role
    private boolean isAdministrator(StaffUsers staff) {
        if (staff == null) return false;
        if (staff.getStaffNo() != null && staff.getStaffNo().toUpperCase().contains("ADM")) {
            return true;
        }
        Optional<StaffUserRoles> roleOpt = staffUserRolesRepository.findByStaffId(staff.getStaffId());
        if (roleOpt.isPresent()) {
            Optional<Roles> role = rolesRepository.findById(roleOpt.get().getRoleId());
            if (role.isPresent() && "ADMIN".equalsIgnoreCase(role.get().getRoleCode())) {
                return true;
            }
        }
        return false;
    }

    public String getRolePrefix(String roleCode) {
        if (roleCode == null) return "STF";
        return switch (roleCode.toUpperCase()) {
            case "ADMIN" -> "STF-ADM";
            case "TELLER" -> "STF-TLR";
            case "AUDITOR" -> "STF-AUD";
            default -> "STF-" + roleCode.toUpperCase();
        };
    }

    public synchronized String generateUniqueStaffNo(String roleCode) {
        String prefix = getRolePrefix(roleCode);
        List<StaffUsers> allStaff = staffUsersRepository.findAll();
        int maxSeq = 0;
        Pattern pattern = Pattern.compile("^" + Pattern.quote(prefix) + "-(\\d+)$");
        for (StaffUsers s : allStaff) {
            if (s.getStaffNo() != null) {
                Matcher m = pattern.matcher(s.getStaffNo().trim());
                if (m.matches()) {
                    try {
                        int val = Integer.parseInt(m.group(1));
                        if (val > maxSeq) {
                            maxSeq = val;
                        }
                    } catch (NumberFormatException ignored) {}
                }
            }
        }

        int nextSeq = maxSeq + 1;
        String candidate;
        do {
            candidate = String.format("%s-%04d", prefix, nextSeq++);
        } while (staffUsersRepository.existsByStaffNo(candidate));

        return candidate;
    }

    public String updateStaffNoForRole(String currentStaffNo, String newRoleCode) {
        String newPrefix = getRolePrefix(newRoleCode);
        if (currentStaffNo != null && !currentStaffNo.isBlank()) {
            Matcher matcher = Pattern.compile("(\\d+)$").matcher(currentStaffNo.trim());
            if (matcher.find()) {
                String numberPart = matcher.group(1);
                String candidate = newPrefix + "-" + numberPart;
                if (!staffUsersRepository.existsByStaffNo(candidate)) {
                    return candidate;
                }
            }
        }
        return generateUniqueStaffNo(newRoleCode);
    }


    // =====================================================
    // ENTITY -> DTO
    // =====================================================

    private StaffResponse toResponse(StaffUsers staff) {
        StaffUserRoles userRole = staffUserRolesRepository.findByStaffId(staff.getStaffId()).orElse(null);
        Roles role = (userRole != null) ? rolesRepository.findById(userRole.getRoleId()).orElse(null) : null;
        return toResponse(staff, role);
    }

    private StaffResponse toResponse(StaffUsers staff, Roles role) {
        StaffResponse response = new StaffResponse(
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
        if (role != null) {
            response.setRoleId(role.getRoleId());
            response.setRoleCode(role.getRoleCode());
            response.setRoleName(role.getRoleName());
        }
        return response;
    }
}
