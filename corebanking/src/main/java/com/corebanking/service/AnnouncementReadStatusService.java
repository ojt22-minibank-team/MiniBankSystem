package com.corebanking.service;

import com.corebanking.entity.AnnouncementReadStatus;
import com.corebanking.entity.Announcements;
import com.corebanking.repository.AnnouncementReadStatusRepository;
import com.corebanking.repository.AnnouncementsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AnnouncementReadStatusService {

    private final AnnouncementReadStatusRepository readStatusRepository;
    private final AnnouncementsRepository announcementRepository;

    @Transactional
    public void markAsRead(UUID customerId, Integer announcementId) {
        validateIds(customerId, announcementId);

        if (readStatusRepository
                .existsByCustomerIdAndAnnouncement_AnnouncementId(
                        customerId,
                        announcementId
                )) {
            return;
        }

        Announcements announcement = announcementRepository
                .findById(announcementId)
                .orElseThrow(() ->
                        new IllegalArgumentException(
                                "Announcement not found."
                        )
                );

        AnnouncementReadStatus readStatus =
                new AnnouncementReadStatus(
                        customerId,
                        announcement,
                        LocalDateTime.now()
                );

        try {
            readStatusRepository.saveAndFlush(readStatus);
        } catch (DataIntegrityViolationException exception) {
            /*
             * A concurrent request may have inserted the same row.
             * Only treat it as success if that row now exists.
             */
            if (!readStatusRepository
                    .existsByCustomerIdAndAnnouncement_AnnouncementId(
                            customerId,
                            announcementId
                    )) {
                throw exception;
            }
        }
    }

    @Transactional
    public void markAsUnread(UUID customerId, Integer announcementId) {
        validateIds(customerId, announcementId);

        readStatusRepository
                .deleteByCustomerIdAndAnnouncement_AnnouncementId(
                        customerId,
                        announcementId
                );
    }

    @Transactional
    public void markAllAsRead(
            UUID customerId,
            Collection<Announcements> visibleAnnouncements
    ) {
        if (customerId == null) {
            throw new IllegalArgumentException(
                    "Customer ID is required."
            );
        }

        if (visibleAnnouncements == null
                || visibleAnnouncements.isEmpty()) {
            return;
        }

        List<Integer> announcementIds = visibleAnnouncements.stream()
                .map(Announcements::getAnnouncementId)
                .distinct()
                .toList();

        if (announcementIds.isEmpty()) {
            return;
        }

        Set<Integer> alreadyReadIds = new HashSet<>();

        readStatusRepository
                .findAllByCustomerIdAndAnnouncement_AnnouncementIdIn(
                        customerId,
                        announcementIds
                )
                .forEach(status ->
                        alreadyReadIds.add(
                                status.getAnnouncement()
                                        .getAnnouncementId()
                        )
                );

        LocalDateTime readAt = LocalDateTime.now();

        Set<Integer> processedIds = new HashSet<>(alreadyReadIds);

        List<AnnouncementReadStatus> newReadStatuses =
                visibleAnnouncements.stream()
                        .filter(announcement ->
                                processedIds.add(
                                        announcement.getAnnouncementId()
                                )
                        )
                        .map(announcement ->
                                new AnnouncementReadStatus(
                                        customerId,
                                        announcement,
                                        readAt
                                )
                        )
                        .toList();

        if (!newReadStatuses.isEmpty()) {
            readStatusRepository.saveAll(newReadStatuses);
        }
    }

    @Transactional(readOnly = true)
    public boolean isRead(UUID customerId, Integer announcementId) {
        validateIds(customerId, announcementId);

        return readStatusRepository
                .existsByCustomerIdAndAnnouncement_AnnouncementId(
                        customerId,
                        announcementId
                );
    }

    @Transactional(readOnly = true)
    public List<AnnouncementReadStatus> getReadStatuses(
            UUID customerId,
            Collection<Integer> announcementIds
    ) {
        if (customerId == null) {
            throw new IllegalArgumentException(
                    "Customer ID is required."
            );
        }

        if (announcementIds == null || announcementIds.isEmpty()) {
            return List.of();
        }

        return readStatusRepository
                .findAllByCustomerIdAndAnnouncement_AnnouncementIdIn(
                        customerId,
                        announcementIds
                );
    }

    private void validateIds(
            UUID customerId,
            Integer announcementId
    ) {
        if (customerId == null) {
            throw new IllegalArgumentException(
                    "Customer ID is required."
            );
        }

        if (announcementId == null) {
            throw new IllegalArgumentException(
                    "Announcement ID is required."
            );
        }
    }
}