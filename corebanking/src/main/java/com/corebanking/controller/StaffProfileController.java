package com.corebanking.controller;

import com.corebanking.dto.StaffChangePasswordRequest;
import com.corebanking.dto.StaffResponse;
import com.corebanking.dto.StaffUpdateRequest;
import com.corebanking.service.StaffManagementService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/staff/profile")
@RequiredArgsConstructor
public class StaffProfileController {

    private final StaffManagementService staffManagementService;

    // =====================================================
    // 1. GET CURRENT STAFF PROFILE
    // GET /api/staff/profile
    // =====================================================
    @GetMapping
    public ResponseEntity<StaffResponse> getMyProfile() {
        return ResponseEntity.ok(staffManagementService.getMyProfile());
    }

    // =====================================================
    // 2. UPDATE CURRENT STAFF PROFILE
    // PUT /api/staff/profile
    // =====================================================
    @PutMapping
    public ResponseEntity<StaffResponse> updateMyProfile(
            @Valid @RequestBody StaffUpdateRequest request
    ) {
        return ResponseEntity.ok(staffManagementService.updateMyProfile(request));
    }

    // =====================================================
    // 3. CHANGE PASSWORD
    // POST /api/staff/profile/change-password
    // =====================================================
    @PostMapping("/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @Valid @RequestBody StaffChangePasswordRequest request
    ) {
        staffManagementService.changeMyPassword(request);
        return ResponseEntity.ok(Map.of("message", "Password changed successfully."));
    }
}
