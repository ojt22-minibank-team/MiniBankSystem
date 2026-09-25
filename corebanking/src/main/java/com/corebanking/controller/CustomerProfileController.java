package com.corebanking.controller;

import com.corebanking.dto.CustomerProfileResponseDTO;
import com.corebanking.dto.CustomerProfileUpdateDTO;
import com.corebanking.service.CustomerProfileService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/customer/profile")
@RequiredArgsConstructor
public class CustomerProfileController {

    private final CustomerProfileService customerProfileService;

    @GetMapping
    public ResponseEntity<CustomerProfileResponseDTO> getMyProfile() {

        return ResponseEntity.ok(
                customerProfileService.getMyProfile()
        );
    }

    @PutMapping
    public ResponseEntity<CustomerProfileResponseDTO> updateMyProfile(
            @RequestBody CustomerProfileUpdateDTO dto) {

        return ResponseEntity.ok(
                customerProfileService.updateMyProfile(dto)
        );
    }

    @PostMapping(
            value = "/image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<CustomerProfileResponseDTO> uploadProfileImage(
            @RequestParam("file") MultipartFile file) {

        return ResponseEntity.ok(
                customerProfileService.updateProfileImage(file)
        );
    }
}