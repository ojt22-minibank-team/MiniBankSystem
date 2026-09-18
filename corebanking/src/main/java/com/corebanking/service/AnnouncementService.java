package com.corebanking.service;

import com.corebanking.dto.AnnouncementCreateRequest;
import com.corebanking.dto.AnnouncementResponse;
import com.corebanking.dto.AnnouncementUpdateRequest;
import com.corebanking.entity.Announcements;
import com.corebanking.entity.StaffUsers;
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

        announcement.setIs_active(true);

        announcement.setStarts_at(
                request.getStarts_at()
        );

        announcement.setEnds_at(
                request.getEnds_at()
        );


        // Get creator from logged-in user
        announcement.setCreated_by_staff_id(
                admin.getStaff_id()
        );


        LocalDateTime now =
                LocalDateTime.now();

        announcement.setCreated_at(now);

        announcement.setUpdated_at(now);


        // Audit information
        announcement.setUpdated_by_type("STAFF");

        announcement.setUpdated_by_id(
                admin.getStaff_id()
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
            Long announcementId
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
            Long announcementId,
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

        announcement.setStarts_at(
                request.getStarts_at()
        );

        announcement.setEnds_at(
                request.getEnds_at()
        );


        announcement.setUpdated_at(
                LocalDateTime.now()
        );

        announcement.setUpdated_by_type(
                "STAFF"
        );

        announcement.setUpdated_by_id(
                admin.getStaff_id()
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
            Long announcementId
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
            Long announcementId,
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


        if (!announcement.getIs_active()) {

            throw new RuntimeException(
                    "Announcement is already inactive"
            );
        }


        announcement.setIs_active(false);

        announcement.setUpdated_at(
                LocalDateTime.now()
        );

        announcement.setUpdated_by_type(
                "STAFF"
        );

        announcement.setUpdated_by_id(
                admin.getStaff_id()
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

                .filter(Announcements::getIs_active)

                .filter(announcement ->
                        announcement.getStarts_at() == null
                                ||
                        !announcement.getStarts_at()
                                .isAfter(now)
                )

                .filter(announcement ->
                        announcement.getEnds_at() == null
                                ||
                        announcement.getEnds_at()
                                .isAfter(now)
                )

                .map(this::toResponse)

                .toList();
    }


    // =====================================================
    // 8. VALIDATE AUDIENCE
    // =====================================================

    private void validateAudience(
            String audience
    ) {

        if (audience == null ||
                !"ALL".equalsIgnoreCase(audience)) {

            throw new RuntimeException(
                    "Audience must be ALL"
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

                announcement.getAnnouncement_id(),

                announcement.getTitle(),

                announcement.getMessage(),

                announcement.getAudience(),

                announcement.getIs_active(),

                announcement.getStarts_at(),

                announcement.getEnds_at(),

                announcement.getCreated_by_staff_id(),

                announcement.getCreated_at(),

                announcement.getUpdated_at()
        );
    }
}