package com.corebanking.controller;

import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.service.CusNotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customer/notifications")
@RequiredArgsConstructor
public class CusNotificationController {

    private final CusNotificationService cusNotificationService;

    @GetMapping
    public ResponseEntity<List<NotificationResponseDto>> getMyNotifications(
            @AuthenticationPrincipal String customerId) {
        List<NotificationResponseDto> notifications = cusNotificationService.getMyNotifications(customerId);
        return ResponseEntity.ok(notifications);
    }

    @GetMapping("/unread-count")
    public ResponseEntity<Map<String, Object>> getUnreadCount(
            @AuthenticationPrincipal String customerId) {
        long count = cusNotificationService.getUnreadCount(customerId);
        return ResponseEntity.ok(Map.of(
                "unreadCount", count
        ));
    }

    @PatchMapping("/{notificationId}/read")
    public ResponseEntity<Map<String, Object>> markAsRead(
            @AuthenticationPrincipal String customerId,
            @PathVariable Long notificationId) {
        boolean success = cusNotificationService.markAsRead(customerId, notificationId);
        return ResponseEntity.ok(Map.of(
                "success", success
        ));
    }

    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead(
            @AuthenticationPrincipal String customerId) {
        int updatedCount = cusNotificationService.markAllAsRead(customerId);
        return ResponseEntity.ok(Map.of(
                "success", true,
                "updatedCount", updatedCount
        ));
    }
}
