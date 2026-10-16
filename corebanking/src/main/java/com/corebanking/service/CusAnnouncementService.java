package com.corebanking.service;

import com.corebanking.dto.CusAnnouncementResponse;
import com.corebanking.entity.AnnouncementReadStatus;
import com.corebanking.entity.Announcements;
import com.corebanking.entity.enums.AnnouncementAudience;
import com.corebanking.repository.AnnouncementsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CusAnnouncementService {

    private final AnnouncementsRepository announcementsRepository;
    private final AnnouncementReadStatusService readStatusService;

    public List<CusAnnouncementResponse> getAnnouncements(UUID customerId) {
        validateCustomerId(customerId);

        LocalDateTime now = LocalDateTime.now();

        List<Announcements> announcements =
                announcementsRepository.findVisibleAnnouncements(
                        AnnouncementAudience.CUSTOMERS,
                        AnnouncementAudience.ALL,
                        now
                );

        if (announcements.isEmpty()) {
            return List.of();
        }

        List<Integer> announcementIds = announcements.stream()
                .map(Announcements::getAnnouncementId)
                .toList();

        Map<Integer, AnnouncementReadStatus> readStatusByAnnouncementId =
                readStatusService.getReadStatuses(
                                customerId,
                                announcementIds
                        )
                        .stream()
                        .collect(Collectors.toMap(
                                status -> status.getAnnouncement()
                                        .getAnnouncementId(),
                                Function.identity()
                        ));

        return announcements.stream()
                .map(announcement -> {
                    AnnouncementReadStatus readStatus =
                            readStatusByAnnouncementId.get(
                                    announcement.getAnnouncementId()
                            );

                    return new CusAnnouncementResponse(
                            announcement.getAnnouncementId(),
                            announcement.getTitle(),
                            announcement.getMessage(),
                            announcement.getAudience(),
                            announcement.isActive(),
                            announcement.getStartsAt(),
                            announcement.getEndsAt(),
                            announcement.getCreatedAt(),
                            announcement.getUpdatedAt(),
                            readStatus != null,
                            readStatus != null
                                    ? readStatus.getReadAt()
                                    : null
                    );
                })
                .toList();
    }

    @Transactional
    public void markAsRead(UUID customerId, Integer announcementId) {
        validateRequest(customerId, announcementId);

        Announcements announcement =
                findVisibleAnnouncement(announcementId);

        readStatusService.markAsRead(
                customerId,
                announcement.getAnnouncementId()
        );
    }

    @Transactional
    public void markAsUnread(UUID customerId, Integer announcementId) {
        validateRequest(customerId, announcementId);

        findVisibleAnnouncement(announcementId);

        readStatusService.markAsUnread(
                customerId,
                announcementId
        );
    }

    @Transactional
    public void markAllAsRead(UUID customerId) {
        validateCustomerId(customerId);

        List<Announcements> visibleAnnouncements =
                announcementsRepository.findVisibleAnnouncements(
                        AnnouncementAudience.CUSTOMERS,
                        AnnouncementAudience.ALL,
                        LocalDateTime.now()
                );

        if (visibleAnnouncements.isEmpty()) {
            return;
        }

        readStatusService.markAllAsRead(
                customerId,
                visibleAnnouncements
        );
    }

    private Announcements findVisibleAnnouncement(Integer announcementId) {
        return announcementsRepository.findVisibleAnnouncementById(
                        announcementId,
                        AnnouncementAudience.CUSTOMERS,
                        AnnouncementAudience.ALL,
                        LocalDateTime.now()
                )
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Announcement not found or not available to this customer."
                        )
                );
    }

    private void validateRequest(
            UUID customerId,
            Integer announcementId
    ) {
        validateCustomerId(customerId);

        if (announcementId == null) {
            throw new IllegalArgumentException(
                    "Announcement ID is required."
            );
        }
    }

    private void validateCustomerId(UUID customerId) {
        if (customerId == null) {
            throw new IllegalArgumentException(
                    "Customer ID is required."
            );
        }
    }
}