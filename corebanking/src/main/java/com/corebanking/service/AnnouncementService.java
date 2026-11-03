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
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AnnouncementService {

    private final AnnouncementsRepository announcementsRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final AuditTrailService auditTrailService;
    
    // Define Myanmar Timezone
    private static final ZoneId MYANMAR_ZONE = ZoneId.of("Asia/Rangoon");

    // 1. CREATE ANNOUNCEMENT
    public AnnouncementResponse createAnnouncement(AnnouncementCreateRequest request, String username) {
        StaffUsers admin = staffUsersRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Staff not found"));

        validateAudience(request.getAudience());
        validateDates(request.getStartsAt(), request.getEndsAt());

        Announcements announcement = new Announcements();
        announcement.setTitle(request.getTitle());
        announcement.setMessage(request.getMessage());
        announcement.setAudience(request.getAudience());
        announcement.setActive(true);
        announcement.setStartsAt(request.getStartsAt());
        announcement.setEndsAt(request.getEndsAt());
        announcement.setCreatedByStaff(admin);

        // Apply Myanmar Timezone
        LocalDateTime now = LocalDateTime.now(MYANMAR_ZONE);
        announcement.setCreatedAt(now);
        announcement.setUpdatedAt(now);
        announcement.setUpdatedByType(UpdatedByType.STAFF);
        announcement.setUpdatedById(admin.getStaffId());

        Announcements savedAnnouncement = announcementsRepository.save(announcement);

        java.util.Map<String, Object> newAnnouncementSnapshot = new java.util.LinkedHashMap<>();
        newAnnouncementSnapshot.put("announcementId", savedAnnouncement.getAnnouncementId());
        newAnnouncementSnapshot.put("title", savedAnnouncement.getTitle());
        newAnnouncementSnapshot.put("audience", savedAnnouncement.getAudience().name());
        newAnnouncementSnapshot.put("active", savedAnnouncement.isActive());
        newAnnouncementSnapshot.put("startsAt", savedAnnouncement.getStartsAt());
        newAnnouncementSnapshot.put("endsAt", savedAnnouncement.getEndsAt());

        if (auditTrailService != null) auditTrailService.logDataChange(
                "SYSTEM",
                "CREATE_ANNOUNCEMENT",
                "ANNOUNCEMENT",
                savedAnnouncement.getAnnouncementId().toString(),
                null,
                newAnnouncementSnapshot,
                "Created announcement: " + savedAnnouncement.getTitle()
        );

        return toResponse(savedAnnouncement);
    }

    // 2. GET ALL ANNOUNCEMENTS (Sorted chronologically by newest first)
    public List<AnnouncementResponse> getAllAnnouncements() {
        return announcementsRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                .stream()
                .map(this::toResponse)
                .toList();
    }

    // 3. GET BY ID
    public AnnouncementResponse getAnnouncementById(Integer announcementId) {
        Announcements announcement = announcementsRepository.findById(announcementId)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));
        return toResponse(announcement);
    }

    // 4. UPDATE ANNOUNCEMENT
    public AnnouncementResponse updateAnnouncement(Integer announcementId, AnnouncementUpdateRequest request, String username) {
        Announcements announcement = announcementsRepository.findById(announcementId)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));
        StaffUsers admin = staffUsersRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Staff not found"));

        validateAudience(request.getAudience());
        validateDates(request.getStartsAt(), request.getEndsAt());

        announcement.setTitle(request.getTitle());
        announcement.setMessage(request.getMessage());
        announcement.setAudience(request.getAudience());
        announcement.setStartsAt(request.getStartsAt());
        announcement.setEndsAt(request.getEndsAt());

        // Apply Myanmar Timezone
        announcement.setUpdatedAt(LocalDateTime.now(MYANMAR_ZONE));
        announcement.setUpdatedByType(UpdatedByType.STAFF);
        announcement.setUpdatedById(admin.getStaffId());

        Announcements updatedAnnouncement = announcementsRepository.save(announcement);

        java.util.Map<String, Object> newAnnouncementSnapshot = new java.util.LinkedHashMap<>();
        newAnnouncementSnapshot.put("title", updatedAnnouncement.getTitle());
        newAnnouncementSnapshot.put("audience", updatedAnnouncement.getAudience().name());
        newAnnouncementSnapshot.put("startsAt", updatedAnnouncement.getStartsAt());
        newAnnouncementSnapshot.put("endsAt", updatedAnnouncement.getEndsAt());

        if (auditTrailService != null) auditTrailService.logDataChange(
                "SYSTEM",
                "UPDATE_ANNOUNCEMENT",
                "ANNOUNCEMENT",
                updatedAnnouncement.getAnnouncementId().toString(),
                null,
                newAnnouncementSnapshot,
                "Updated announcement: " + updatedAnnouncement.getTitle()
        );

        return toResponse(updatedAnnouncement);
    }

    // 5. DELETE ANNOUNCEMENT (Soft Delete will be triggered by Hibernate @SQLDelete)
    public void deleteAnnouncement(Integer announcementId) {
        Announcements announcement = announcementsRepository.findById(announcementId)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));
        announcementsRepository.delete(announcement);

        if (auditTrailService != null) auditTrailService.logDataChange(
                "SYSTEM",
                "DELETE_ANNOUNCEMENT",
                "ANNOUNCEMENT",
                announcementId.toString(),
                java.util.Map.of("title", announcement.getTitle(), "id", announcementId),
                null,
                "Deleted announcement: " + announcement.getTitle()
        );
    }

    // 6. DEACTIVATE ANNOUNCEMENT
    public AnnouncementResponse deactivateAnnouncement(Integer announcementId, String username) {
        Announcements announcement = announcementsRepository.findById(announcementId)
                .orElseThrow(() -> new RuntimeException("Announcement not found"));
        StaffUsers admin = staffUsersRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Staff not found"));

        if (!announcement.isActive()) {
            throw new RuntimeException("Announcement is already inactive");
        }

        announcement.setActive(false);
        // Apply Myanmar Timezone
        announcement.setUpdatedAt(LocalDateTime.now(MYANMAR_ZONE));
        announcement.setUpdatedByType(UpdatedByType.STAFF);
        announcement.setUpdatedById(admin.getStaffId());

        Announcements updatedAnnouncement = announcementsRepository.save(announcement);

        java.util.Map<String, Object> newAnnouncementSnapshot = new java.util.LinkedHashMap<>();
        newAnnouncementSnapshot.put("title", updatedAnnouncement.getTitle());
        newAnnouncementSnapshot.put("audience", updatedAnnouncement.getAudience().name());
        newAnnouncementSnapshot.put("startsAt", updatedAnnouncement.getStartsAt());
        newAnnouncementSnapshot.put("endsAt", updatedAnnouncement.getEndsAt());

        if (auditTrailService != null) auditTrailService.logDataChange(
                "SYSTEM",
                "UPDATE_ANNOUNCEMENT",
                "ANNOUNCEMENT",
                updatedAnnouncement.getAnnouncementId().toString(),
                null,
                newAnnouncementSnapshot,
                "Updated announcement: " + updatedAnnouncement.getTitle()
        );

        return toResponse(updatedAnnouncement);
    }

    // 7. GET ACTIVE ANNOUNCEMENTS
    public List<AnnouncementResponse> getActiveAnnouncements() {
        // Apply Myanmar Timezone
        LocalDateTime now = LocalDateTime.now(MYANMAR_ZONE);

        return announcementsRepository.findAll().stream()
                .filter(Announcements::isActive)
                .filter(a -> a.getStartsAt() == null || !a.getStartsAt().isAfter(now))
                .filter(a -> a.getEndsAt() == null || a.getEndsAt().isAfter(now))
                .map(this::toResponse)
                .toList();
    }

    // NEW: BULK DELETE EXPIRED ANNOUNCEMENTS
    public void bulkDeleteExpiredAnnouncements() {
        LocalDateTime now = LocalDateTime.now(MYANMAR_ZONE);
        List<Announcements> expiredAnnouncements = announcementsRepository.findAll().stream()
                .filter(a -> a.getEndsAt() != null && a.getEndsAt().isBefore(now))
                .toList();
        
        // This will trigger @SQLDelete for each expired announcement
        announcementsRepository.deleteAll(expiredAnnouncements);
    }

    // 8. VALIDATE AUDIENCE
    private void validateAudience(AnnouncementAudience audience) {
        if (audience == null) {
            throw new RuntimeException("Audience must not be null");
        }
    }

    // 9. ENTITY -> DTO
    private AnnouncementResponse toResponse(Announcements announcement) {
        return new AnnouncementResponse(
                announcement.getAnnouncementId(),
                announcement.getTitle(),
                announcement.getMessage(),
                announcement.getAudience(),
                announcement.isActive(),
                announcement.getStartsAt(),
                announcement.getEndsAt(),
                announcement.getCreatedByStaff() != null ? announcement.getCreatedByStaff().getStaffId() : null,
                announcement.getCreatedAt(),
                announcement.getUpdatedAt()
        );
    }
    
    // Validate announcement date range
    private void validateDates(LocalDateTime startsAt, LocalDateTime endsAt) {
        if (startsAt == null) {
            throw new IllegalArgumentException("Start date and time are required");
        }
        if (endsAt != null && !endsAt.isAfter(startsAt)) {
            throw new IllegalArgumentException("End date and time must be after start date and time");
        }
    }

    // Active announcements visible to staff
    public List<AnnouncementResponse> getAnnouncementsForStaff() {
        LocalDateTime now = LocalDateTime.now(MYANMAR_ZONE);
        return announcementsRepository.findVisibleAnnouncements(
                AnnouncementAudience.STAFF, AnnouncementAudience.ALL, now
        ).stream().map(this::toResponse).toList();
    }

    // Active announcements visible to customers
    public List<AnnouncementResponse> getAnnouncementsForCustomers() {
        LocalDateTime now = LocalDateTime.now(MYANMAR_ZONE);
        return announcementsRepository.findVisibleAnnouncements(
                AnnouncementAudience.CUSTOMERS, AnnouncementAudience.ALL, now
        ).stream().map(this::toResponse).toList();
    }
}