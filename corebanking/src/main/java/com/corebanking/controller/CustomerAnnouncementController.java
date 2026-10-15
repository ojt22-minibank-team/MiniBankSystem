package com.corebanking.controller;

import com.corebanking.dto.AnnouncementResponse;
import com.corebanking.service.AnnouncementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/customer/announcements") // CusSecurityConfig ထဲ အလိုလို ဝင်သွားမည်
@RequiredArgsConstructor
public class CustomerAnnouncementController {
    
    private final AnnouncementService announcementService;

    @GetMapping
    public ResponseEntity<List<AnnouncementResponse>> getCustomerAnnouncements() {
        return ResponseEntity.ok(announcementService.getAnnouncementsForCustomers());
    }
}