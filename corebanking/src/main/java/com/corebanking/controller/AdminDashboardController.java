package com.corebanking.controller;

import com.corebanking.dto.AdminDashboardResponseDTO;
import com.corebanking.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/dashboard")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR', 'TELLER')")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping("/summary")
    public ResponseEntity<AdminDashboardResponseDTO> getDashboardSummary() {
        return ResponseEntity.ok(adminDashboardService.getDashboardSummary());
    }
}
