package com.corebanking.controller;

import com.corebanking.dto.CusProfileResponseDTO;
import com.corebanking.dto.CusProfileUpdateDTO;
import com.corebanking.service.CusProfileService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/customer/profile")
@RequiredArgsConstructor
public class CusProfileController {

    private final CusProfileService customerProfileService;

    @GetMapping
    public ResponseEntity<CusProfileResponseDTO> getMyProfile() {

        return ResponseEntity.ok(
                customerProfileService.getMyProfile()
        );
    }

    @PutMapping
    public ResponseEntity<CusProfileResponseDTO> updateMyProfile(
            @RequestBody CusProfileUpdateDTO dto) {

        return ResponseEntity.ok(
                customerProfileService.updateMyProfile(dto)
        );
    }

    @PostMapping(
            value = "/image",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<CusProfileResponseDTO> uploadProfileImage(
            @RequestParam("file") MultipartFile file) {

        return ResponseEntity.ok(
                customerProfileService.updateProfileImage(file)
        );
    }
}