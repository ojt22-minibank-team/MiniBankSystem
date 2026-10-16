
package com.corebanking.controller;

import com.corebanking.dto.CusAnnouncementResponse;
import com.corebanking.service.CusAnnouncementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/customer/announcements")
@RequiredArgsConstructor
public class CusAnnouncementController {

    private final CusAnnouncementService cusAnnouncementService;

    @GetMapping
    public ResponseEntity<List<CusAnnouncementResponse>> getAnnouncements(
            @AuthenticationPrincipal String customerId
    ) {
        UUID authenticatedCustomerId = parseCustomerId(customerId);

        return ResponseEntity.ok(
                cusAnnouncementService.getAnnouncements(
                        authenticatedCustomerId
                )
        );
    }

    @PutMapping("/{announcementId}/read")
    public ResponseEntity<Void> markAsRead(
            @AuthenticationPrincipal String customerId,
            @PathVariable Integer announcementId
    ) {
        cusAnnouncementService.markAsRead(
                parseCustomerId(customerId),
                announcementId
        );

        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{announcementId}/read")
    public ResponseEntity<Void> markAsUnread(
            @AuthenticationPrincipal String customerId,
            @PathVariable Integer announcementId
    ) {
        cusAnnouncementService.markAsUnread(
                parseCustomerId(customerId),
                announcementId
        );

        return ResponseEntity.noContent().build();
    }

    @PutMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(
            @AuthenticationPrincipal String customerId
    ) {
        cusAnnouncementService.markAllAsRead(
                parseCustomerId(customerId)
        );

        return ResponseEntity.noContent().build();
    }

    private UUID parseCustomerId(String customerId) {
        if (customerId == null || customerId.isBlank()) {
            throw new IllegalStateException(
                    "Authenticated customer is required."
            );
        }

        try {
            return UUID.fromString(customerId);
        } catch (IllegalArgumentException exception) {
            throw new IllegalStateException(
                    "Invalid authenticated customer identity.",
                    exception
            );
        }
    }
}
