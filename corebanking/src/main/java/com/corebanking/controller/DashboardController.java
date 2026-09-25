package com.corebanking.controller;

import com.corebanking.dto.DashboardResponseDTO;
import com.corebanking.service.DashboardService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;


@RestController
@RequestMapping("/api/customer")
@RequiredArgsConstructor
public class DashboardController {

    private final DashboardService dashboardService;

    @GetMapping("/dashboard")
    public ResponseEntity<DashboardResponseDTO> getDashboard() {

        DashboardResponseDTO response =
                dashboardService.getDashboard();

        return ResponseEntity.ok(response);
    }
}