package com.corebanking.controller;

import com.corebanking.dto.AnnouncementCreateRequest;
import com.corebanking.dto.AnnouncementResponse;
import com.corebanking.dto.AnnouncementUpdateRequest;
import com.corebanking.service.AnnouncementService;

import lombok.RequiredArgsConstructor;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/announcements")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AnnouncementAdminController {


    private final AnnouncementService announcementService;


    // =====================================================
    // CREATE
    // POST /api/admin/announcements
    // =====================================================

    @PostMapping
    public ResponseEntity<AnnouncementResponse> createAnnouncement(
            @RequestBody AnnouncementCreateRequest request,
            Authentication authentication
    ) {

        String username =
                authentication.getName();


        return ResponseEntity.ok(
                announcementService.createAnnouncement(
                        request,
                        username
                )
        );
    }


    // =====================================================
    // GET ALL
    // GET /api/admin/announcements
    // =====================================================

    @GetMapping
    public ResponseEntity<List<AnnouncementResponse>>
    getAllAnnouncements() {

        return ResponseEntity.ok(
                announcementService.getAllAnnouncements()
        );
    }


    // =====================================================
    // GET BY ID
    // GET /api/admin/announcements/{id}
    // =====================================================

    @GetMapping("/{id}")
    public ResponseEntity<AnnouncementResponse>
    getAnnouncementById(
            @PathVariable Long id
    ) {

        return ResponseEntity.ok(
                announcementService.getAnnouncementById(id)
        );
    }


    // =====================================================
    // UPDATE
    // PUT /api/admin/announcements/{id}
    // =====================================================

    @PutMapping("/{id}")
    public ResponseEntity<AnnouncementResponse>
    updateAnnouncement(
            @PathVariable Long id,
            @RequestBody AnnouncementUpdateRequest request,
            Authentication authentication
    ) {

        String username =
                authentication.getName();


        return ResponseEntity.ok(
                announcementService.updateAnnouncement(
                        id,
                        request,
                        username
                )
        );
    }


    // =====================================================
    // DELETE
    // DELETE /api/admin/announcements/{id}
    // =====================================================

    @DeleteMapping("/{id}")
    public ResponseEntity<String>
    deleteAnnouncement(
            @PathVariable Long id
    ) {

        announcementService.deleteAnnouncement(id);

        return ResponseEntity.ok(
                "Announcement deleted successfully"
        );
    }


    // =====================================================
    // DEACTIVATE
    // PATCH /api/admin/announcements/{id}/deactivate
    // =====================================================

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<AnnouncementResponse>
    deactivateAnnouncement(
            @PathVariable Long id,
            Authentication authentication
    ) {

        String username =
                authentication.getName();


        return ResponseEntity.ok(
                announcementService.deactivateAnnouncement(
                        id,
                        username
                )
        );
    }
}