package com.corebanking.dto;

import com.corebanking.entity.enums.AnnouncementAudience;

import java.time.LocalDateTime;

public record CusAnnouncementResponse(
        Integer announcementId,
        String title,
        String message,
        AnnouncementAudience audience,
        boolean isActive,
        LocalDateTime startsAt,
        LocalDateTime endsAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt,
        boolean isRead,
        LocalDateTime readAt
) {
}
