package com.corebanking.controller;

import com.corebanking.dto.ChangeStaffRoleRequest;
import com.corebanking.dto.PasswordResetRequest;
import com.corebanking.dto.StaffCreateRequest;
import com.corebanking.dto.StaffResponse;
import com.corebanking.dto.StaffUpdateRequest;
import com.corebanking.service.StaffManagementService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/staff")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class StaffManagementController {


    private final StaffManagementService staffManagementService;


    // =====================================================
    // CREATE STAFF
    // POST /api/admin/staff
    // =====================================================

    @PostMapping
    public ResponseEntity<StaffResponse> createStaff(
            @RequestBody StaffCreateRequest request
    ) {

        return ResponseEntity.ok(
                staffManagementService.createStaff(request)
        );
    }


    // =====================================================
    // GET ALL STAFF
    // GET /api/admin/staff
    // =====================================================

    @GetMapping
    public ResponseEntity<List<StaffResponse>> getAllStaff() {

        return ResponseEntity.ok(
                staffManagementService.getAllStaff()
        );
    }


    // =====================================================
    // GET STAFF BY ID
    // GET /api/admin/staff/{staffId}
    // =====================================================

    @GetMapping("/{staffId}")
    public ResponseEntity<StaffResponse> getStaffById(
            @PathVariable UUID staffId
    ) {

        return ResponseEntity.ok(
                staffManagementService.getStaffById(staffId)
        );
    }


    // =====================================================
    // UPDATE STAFF
    // PUT /api/admin/staff/{staffId}
    // =====================================================

    @PutMapping("/{staffId}")
    public ResponseEntity<StaffResponse> updateStaff(
            @PathVariable UUID staffId,
            @RequestBody StaffUpdateRequest request
    ) {

        return ResponseEntity.ok(
                staffManagementService.updateStaff(
                        staffId,
                        request
                )
        );
    }


    // =====================================================
    // CHANGE ROLE
    // PUT /api/admin/staff/{staffId}/role
    // =====================================================

    @PutMapping("/{staffId}/role")
    public ResponseEntity<StaffResponse> changeRole(
            @PathVariable UUID staffId,
            @RequestBody ChangeStaffRoleRequest request
    ) {

        return ResponseEntity.ok(
                staffManagementService.changeRole(
                        staffId,
                        request
                )
        );
    }


    // =====================================================
    // DEACTIVATE
    // PATCH /api/admin/staff/{staffId}/deactivate
    // =====================================================

    @PatchMapping("/{staffId}/deactivate")
    public ResponseEntity<StaffResponse> deactivateStaff(
            @PathVariable UUID staffId
    ) {

        return ResponseEntity.ok(
                staffManagementService.deactivateStaff(
                        staffId
                )
        );
    }


    // =====================================================
    // RESET PASSWORD
    // POST /api/admin/staff/{staffId}/reset-password
    // =====================================================

    @PostMapping("/{staffId}/reset-password")
    public ResponseEntity<String> resetPassword(
            @PathVariable UUID staffId,
            @RequestBody PasswordResetRequest request
    ) {

        staffManagementService.resetPassword(
                staffId,
                request
        );

        return ResponseEntity.ok(
                "Password reset successfully"
        );
    }
}