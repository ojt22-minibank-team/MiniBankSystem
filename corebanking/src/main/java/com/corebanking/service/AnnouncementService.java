package com.corebanking.service;

import com.corebanking.dto.AnnouncementCreateRequest;
import com.corebanking.dto.AnnouncementResponse;
import com.corebanking.dto.AnnouncementUpdateRequest;
import com.corebanking.entity.Announcements;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.AnnouncementAudience;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.repository.AnnouncementsRepository;
import com.corebanking.repository.StaffUsersRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementsRepository announcementsRepository;

    private final StaffUsersRepository staffUsersRepository;


    // =====================================================
    // 1. CREATE ANNOUNCEMENT
    // =====================================================

    public AnnouncementResponse createAnnouncement(
            AnnouncementCreateRequest request,
            String username
    ) {

        // Get logged-in admin
        StaffUsers admin =
                staffUsersRepository
                        .findByUsername(username)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );


        // Validate audience
        validateAudience(request.getAudience());


        // Create announcement
        Announcements announcement =
                new Announcements();

        announcement.setTitle(
                request.getTitle()
        );

        announcement.setMessage(
                request.getMessage()
        );

        announcement.setAudience(
                request.getAudience()
        );

        announcement.setActive(true);

        announcement.setStartsAt(
                request.getStartsAt()
        );

        announcement.setEndsAt(
                request.getEndsAt()
        );


        // Set creator from logged-in user (ManyToOne relation)
        announcement.setCreatedByStaff(admin);


        LocalDateTime now =
                LocalDateTime.now();

        announcement.setCreatedAt(now);

        announcement.setUpdatedAt(now);


        // Audit information
        announcement.setUpdatedByType(UpdatedByType.STAFF);

        announcement.setUpdatedById(
                admin.getStaffId()
        );


        Announcements savedAnnouncement =
                announcementsRepository.save(
                        announcement
                );


        return toResponse(savedAnnouncement);
    }


    // =====================================================
    // 2. ADMIN - GET ALL ANNOUNCEMENTS
    // =====================================================

    public List<AnnouncementResponse> getAllAnnouncements() {

        return announcementsRepository.findAll()
                .stream()
                .map(this::toResponse)
                .toList();
    }


    // =====================================================
    // 3. ADMIN - GET ANNOUNCEMENT BY ID
    // =====================================================

    public AnnouncementResponse getAnnouncementById(
            Integer announcementId
    ) {

        Announcements announcement =
                announcementsRepository
                        .findById(announcementId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Announcement not found"
                                )
                        );


        return toResponse(announcement);
    }


    // =====================================================
    // 4. UPDATE ANNOUNCEMENT
    // =====================================================

    public AnnouncementResponse updateAnnouncement(
            Integer announcementId,
            AnnouncementUpdateRequest request,
            String username
    ) {

        Announcements announcement =
                announcementsRepository
                        .findById(announcementId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Announcement not found"
                                )
                        );


        StaffUsers admin =
                staffUsersRepository
                        .findByUsername(username)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );


        validateAudience(
                request.getAudience()
        );


        announcement.setTitle(
                request.getTitle()
        );

        announcement.setMessage(
                request.getMessage()
        );

        announcement.setAudience(
                request.getAudience()
        );

        announcement.setStartsAt(
                request.getStartsAt()
        );

        announcement.setEndsAt(
                request.getEndsAt()
        );


        announcement.setUpdatedAt(
                LocalDateTime.now()
        );

        announcement.setUpdatedByType(
                UpdatedByType.STAFF
        );

        announcement.setUpdatedById(
                admin.getStaffId()
        );


        Announcements updatedAnnouncement =
                announcementsRepository.save(
                        announcement
                );


        return toResponse(updatedAnnouncement);
    }


    // =====================================================
    // 5. DELETE ANNOUNCEMENT
    // =====================================================

    public void deleteAnnouncement(
            Integer announcementId
    ) {

        Announcements announcement =
                announcementsRepository
                        .findById(announcementId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Announcement not found"
                                )
                        );


        announcementsRepository.delete(
                announcement
        );
    }


    // =====================================================
    // 6. DEACTIVATE ANNOUNCEMENT
    // =====================================================

    public AnnouncementResponse deactivateAnnouncement(
            Integer announcementId,
            String username
    ) {

        Announcements announcement =
                announcementsRepository
                        .findById(announcementId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Announcement not found"
                                )
                        );


        StaffUsers admin =
                staffUsersRepository
                        .findByUsername(username)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Staff not found"
                                )
                        );


        if (!announcement.isActive()) {

            throw new RuntimeException(
                    "Announcement is already inactive"
            );
        }


        announcement.setActive(false);

        announcement.setUpdatedAt(
                LocalDateTime.now()
        );

        announcement.setUpdatedByType(
                UpdatedByType.STAFF
        );

        announcement.setUpdatedById(
                admin.getStaffId()
        );


        Announcements updatedAnnouncement =
                announcementsRepository.save(
                        announcement
                );


        return toResponse(updatedAnnouncement);
    }


    // =====================================================
    // 7. TELLER / AUDITOR / ADMIN
    //    GET ACTIVE ANNOUNCEMENTS
    // =====================================================

    public List<AnnouncementResponse>
    getActiveAnnouncements() {

        LocalDateTime now =
                LocalDateTime.now();


        return announcementsRepository.findAll()
                .stream()

                .filter(Announcements::isActive)

                .filter(announcement ->
                        announcement.getStartsAt() == null
                                ||
                        !announcement.getStartsAt()
                                .isAfter(now)
                )

                .filter(announcement ->
                        announcement.getEndsAt() == null
                                ||
                        announcement.getEndsAt()
                                .isAfter(now)
                )

                .map(this::toResponse)

                .toList();
    }


    // =====================================================
    // 8. VALIDATE AUDIENCE
    // =====================================================

    private void validateAudience(
            AnnouncementAudience audience
    ) {

        if (audience == null) {

            throw new RuntimeException(
                    "Audience must not be null"
            );
        }
    }


    // =====================================================
    // 9. ENTITY -> DTO
    // =====================================================

    private AnnouncementResponse toResponse(
            Announcements announcement
    ) {

        return new AnnouncementResponse(

                announcement.getAnnouncementId(),

                announcement.getTitle(),

                announcement.getMessage(),

                announcement.getAudience(),

                announcement.isActive(),

                announcement.getStartsAt(),

                announcement.getEndsAt(),

                announcement.getCreatedByStaff() != null
                        ? announcement.getCreatedByStaff().getStaffId()
                        : null,

                announcement.getCreatedAt(),

                announcement.getUpdatedAt()
        );
    }
}