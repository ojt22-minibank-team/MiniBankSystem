package com.corebanking.controller;

import com.corebanking.dto.DashboardResponseDTO;
import com.corebanking.service.DashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/dashboard/{customerCode}")
    public ResponseEntity<DashboardResponseDTO> getDashboard(
            @PathVariable String customerCode) {

        DashboardResponseDTO response =
                dashboardService.getDashboard(customerCode);

        return ResponseEntity.ok(response);
    }
}