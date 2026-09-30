package com.corebanking.controller;

import com.corebanking.dto.FeeScheduleCreateRequest;
import com.corebanking.dto.FeeScheduleResponse;
import com.corebanking.dto.FeeScheduleUpdateRequest;
import com.corebanking.dto.SystemParameterCreateRequest;
import com.corebanking.dto.SystemParameterResponse;
import com.corebanking.dto.SystemParameterUpdateRequest;
import com.corebanking.service.SystemRulesConfigService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;


@RestController
@RequestMapping("/api/admin/system-rules")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class SystemRulesConfigController {

    private final SystemRulesConfigService systemRulesConfigService;


    // =========================================================
    // SYSTEM PARAMETERS
    // =========================================================

    @PostMapping("/parameters")
    public ResponseEntity<SystemParameterResponse> createParameter(
            @Valid @RequestBody SystemParameterCreateRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        systemRulesConfigService
                                .createParameter(request)
                );
    }


    @GetMapping("/parameters")
    public ResponseEntity<List<SystemParameterResponse>> getAllParameters() {

        return ResponseEntity.ok(
                systemRulesConfigService.getAllParameters()
        );
    }


    @GetMapping("/parameters/{parameterKey}")
    public ResponseEntity<SystemParameterResponse> getParameterByKey(
            @PathVariable String parameterKey) {

        return ResponseEntity.ok(
                systemRulesConfigService
                        .getParameterByKey(parameterKey)
        );
    }


    @PutMapping("/parameters/{parameterKey}")
    public ResponseEntity<SystemParameterResponse> updateParameter(
            @PathVariable String parameterKey,
            @Valid @RequestBody SystemParameterUpdateRequest request) {

        return ResponseEntity.ok(
                systemRulesConfigService
                        .updateParameter(parameterKey, request)
        );
    }


    // =========================================================
    // FEE SCHEDULES
    // =========================================================

    @PostMapping("/fees")
    public ResponseEntity<FeeScheduleResponse> createFee(
            @Valid @RequestBody FeeScheduleCreateRequest request) {

        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        systemRulesConfigService
                                .createFee(request)
                );
    }


    @GetMapping("/fees")
    public ResponseEntity<List<FeeScheduleResponse>> getAllFees() {

        return ResponseEntity.ok(
                systemRulesConfigService.getAllFees()
        );
    }


    @GetMapping("/fees/{feeScheduleId}")
    public ResponseEntity<FeeScheduleResponse> getFeeById(
            @PathVariable Integer feeScheduleId) {

        return ResponseEntity.ok(
                systemRulesConfigService
                        .getFeeById(feeScheduleId)
        );
    }


    @PutMapping("/fees/{feeScheduleId}")
    public ResponseEntity<FeeScheduleResponse> updateFee(
            @PathVariable Integer feeScheduleId,
            @Valid @RequestBody FeeScheduleUpdateRequest request) {

        return ResponseEntity.ok(
                systemRulesConfigService
                        .updateFee(
                                feeScheduleId,
                                request
                        )
        );
    }


    @PatchMapping("/fees/{feeScheduleId}/activate")
    public ResponseEntity<FeeScheduleResponse> activateFee(
            @PathVariable Integer feeScheduleId) {

        return ResponseEntity.ok(
                systemRulesConfigService
                        .activateFee(feeScheduleId)
        );
    }


    @PatchMapping("/fees/{feeScheduleId}/deactivate")
    public ResponseEntity<FeeScheduleResponse> deactivateFee(
            @PathVariable Integer feeScheduleId) {

        return ResponseEntity.ok(
                systemRulesConfigService
                        .deactivateFee(feeScheduleId)
        );
    }
}