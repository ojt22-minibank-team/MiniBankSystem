package com.corebanking.controller;

import com.corebanking.dto.CusDashboardResponseDTO;
import com.corebanking.service.CusDashboardService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class CusDashboardController {

    private final CusDashboardService dashboardService;

    @GetMapping("/dashboard")
    public ResponseEntity<CusDashboardResponseDTO> getDashboard() {

        CusDashboardResponseDTO response = dashboardService.getDashboard();

        return ResponseEntity.ok(response);
    }
}