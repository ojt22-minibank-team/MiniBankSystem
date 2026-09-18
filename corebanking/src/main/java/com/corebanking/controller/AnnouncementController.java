package com.corebanking.controller;

import com.corebanking.dto.AnnouncementResponse;
import com.corebanking.service.AnnouncementService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/announcements")
@RequiredArgsConstructor
public class AnnouncementController {


    private final AnnouncementService announcementService;


    // =====================================================
    // GET ACTIVE ANNOUNCEMENTS
    //
    // ADMIN / TELLER / AUDITOR
    // =====================================================

    @GetMapping
    public ResponseEntity<List<AnnouncementResponse>>
    getActiveAnnouncements() {

        return ResponseEntity.ok(
                announcementService
                        .getActiveAnnouncements()
        );
    }
}