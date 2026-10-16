
package com.corebanking.controller;

import com.corebanking.dto.StaffPasswordSetupRequest;
import com.corebanking.service.StaffPasswordSetupService;

import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping
public class StaffPasswordSetupController {

    private final StaffPasswordSetupService staffPasswordSetupService;

    /**
     * Public endpoint:
     * Staff uses the emailed token to set their password.
     */
    @PostMapping("/api/auth/staff-password-setup/complete")
    public ResponseEntity<Map<String, String>> completePasswordSetup(
            @Valid @RequestBody StaffPasswordSetupRequest request) {

        staffPasswordSetupService.completePasswordSetup(request);

        return ResponseEntity.ok(Map.of(
                "message",
                "Password setup completed. Please log in."
        ));
    }

    /**
     * Admin-only endpoint:
     * Resend or issue a new setup link.
     */
    @PostMapping("/api/admin/staff/{staffId}/password-setup-link")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, String>> resendSetupLink(
            @PathVariable UUID staffId) {

        staffPasswordSetupService.createSetupLink(staffId);

        return ResponseEntity.ok(Map.of(
                "message",
                "Password setup link has been sent if email delivery succeeded."
        ));
    }
}