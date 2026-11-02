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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Announcement Unit Tests - AnnouncementService")
class AnnouncementServiceTest {

    @Mock
    private AnnouncementsRepository announcementsRepository;

    @Mock
    private StaffUsersRepository staffUsersRepository;

    @InjectMocks
    private AnnouncementService announcementService;

    private StaffUsers adminStaff;
    private Announcements sampleAnnouncement;
    private static final String ADMIN_USERNAME = "admin_user";
    private static final UUID STAFF_UUID = UUID.fromString("11111111-2222-3333-4444-555555555555");
    private static final ZoneId MYANMAR_ZONE = ZoneId.of("Asia/Rangoon");

    @BeforeEach
    void setUp() {
        adminStaff = StaffUsers.builder()
                .staffId(STAFF_UUID)
                .username(ADMIN_USERNAME)
                .fullName("Admin User")
                .build();

        LocalDateTime now = LocalDateTime.now(MYANMAR_ZONE);

        sampleAnnouncement = Announcements.builder()
                .announcementId(1)
                .title("System Maintenance")
                .message("Banking services will be temporarily unavailable from 1 AM to 3 AM.")
                .audience(AnnouncementAudience.ALL)
                .isActive(true)
                .isDeleted(false)
                .startsAt(now.minusHours(1))
                .endsAt(now.plusDays(1))
                .createdByStaff(adminStaff)
                .updatedById(STAFF_UUID)
                .updatedByType(UpdatedByType.STAFF)
                .createdAt(now)
                .updatedAt(now)
                .build();
    }

    // =========================================================================
    // 1. CREATE ANNOUNCEMENT
    // =========================================================================
    @Nested
    @DisplayName("Create Announcement Tests")
    class CreateAnnouncementTests {

        @Test
        @DisplayName("Should successfully create a new announcement")
        void createAnnouncement_Success() {
            LocalDateTime startsAt = LocalDateTime.now(MYANMAR_ZONE).plusHours(1);
            LocalDateTime endsAt = startsAt.plusDays(2);

            AnnouncementCreateRequest request = new AnnouncementCreateRequest(
                    "Scheduled Downtime",
                    "We will undergo server updates.",
                    AnnouncementAudience.STAFF,
                    startsAt,
                    endsAt
            );

            when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));
            when(announcementsRepository.save(any(Announcements.class))).thenAnswer(inv -> {
                Announcements a = inv.getArgument(0);
                a.setAnnouncementId(10);
                return a;
            });

            AnnouncementResponse response = announcementService.createAnnouncement(request, ADMIN_USERNAME);

            assertNotNull(response);
            assertEquals(10, response.getAnnouncementId());
            assertEquals("Scheduled Downtime", response.getTitle());
            assertEquals("We will undergo server updates.", response.getMessage());
            assertEquals(AnnouncementAudience.STAFF, response.getAudience());
            assertTrue(response.isActive());
            assertEquals(STAFF_UUID, response.getCreatedByStaffId());

            ArgumentCaptor<Announcements> captor = ArgumentCaptor.forClass(Announcements.class);
            verify(announcementsRepository).save(captor.capture());
            Announcements captured = captor.getValue();
            assertEquals(UpdatedByType.STAFF, captured.getUpdatedByType());
            assertEquals(STAFF_UUID, captured.getUpdatedById());
        }

        @Test
        @DisplayName("Should throw RuntimeException if creator staff is not found")
        void createAnnouncement_ThrowsException_WhenStaffNotFound() {
            AnnouncementCreateRequest request = new AnnouncementCreateRequest(
                    "Title", "Message", AnnouncementAudience.ALL,
                    LocalDateTime.now(MYANMAR_ZONE), LocalDateTime.now(MYANMAR_ZONE).plusDays(1)
            );

            when(staffUsersRepository.findByUsername("unknown_admin")).thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> announcementService.createAnnouncement(request, "unknown_admin"));
            assertEquals("Staff not found", ex.getMessage());
            verify(announcementsRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should throw RuntimeException if audience is null")
        void createAnnouncement_ThrowsException_WhenAudienceNull() {
            AnnouncementCreateRequest request = new AnnouncementCreateRequest(
                    "Title", "Message", null,
                    LocalDateTime.now(MYANMAR_ZONE), LocalDateTime.now(MYANMAR_ZONE).plusDays(1)
            );

            when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> announcementService.createAnnouncement(request, ADMIN_USERNAME));
            assertEquals("Audience must not be null", ex.getMessage());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException if startsAt is null")
        void createAnnouncement_ThrowsException_WhenStartsAtNull() {
            AnnouncementCreateRequest request = new AnnouncementCreateRequest(
                    "Title", "Message", AnnouncementAudience.ALL,
                    null, LocalDateTime.now(MYANMAR_ZONE).plusDays(1)
            );

            when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> announcementService.createAnnouncement(request, ADMIN_USERNAME));
            assertEquals("Start date and time are required", ex.getMessage());
        }

        @Test
        @DisplayName("Should throw IllegalArgumentException if endsAt is before or equal to startsAt")
        void createAnnouncement_ThrowsException_WhenEndsAtBeforeStartsAt() {
            LocalDateTime start = LocalDateTime.now(MYANMAR_ZONE).plusDays(2);
            LocalDateTime end = start.minusHours(1);

            AnnouncementCreateRequest request = new AnnouncementCreateRequest(
                    "Title", "Message", AnnouncementAudience.ALL, start, end
            );

            when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));

            IllegalArgumentException ex = assertThrows(IllegalArgumentException.class,
                    () -> announcementService.createAnnouncement(request, ADMIN_USERNAME));
            assertEquals("End date and time must be after start date and time", ex.getMessage());
        }
    }

    // =========================================================================
    // 2. GET ANNOUNCEMENTS (ALL & BY ID)
    // =========================================================================
    @Nested
    @DisplayName("Read Announcement Tests")
    class ReadAnnouncementTests {

        @Test
        @DisplayName("Should return all announcements")
        void getAllAnnouncements_ReturnsList() {
            when(announcementsRepository.findAll()).thenReturn(List.of(sampleAnnouncement));

            List<AnnouncementResponse> result = announcementService.getAllAnnouncements();

            assertEquals(1, result.size());
            assertEquals("System Maintenance", result.get(0).getTitle());
        }

        @Test
        @DisplayName("Should return announcement by ID when found")
        void getAnnouncementById_Success() {
            when(announcementsRepository.findById(1)).thenReturn(Optional.of(sampleAnnouncement));

            AnnouncementResponse response = announcementService.getAnnouncementById(1);

            assertNotNull(response);
            assertEquals(1, response.getAnnouncementId());
            assertEquals("System Maintenance", response.getTitle());
        }

        @Test
        @DisplayName("Should throw RuntimeException when announcement not found by ID")
        void getAnnouncementById_ThrowsException_WhenNotFound() {
            when(announcementsRepository.findById(99)).thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> announcementService.getAnnouncementById(99));
            assertEquals("Announcement not found", ex.getMessage());
        }
    }

    // =========================================================================
    // 3. UPDATE ANNOUNCEMENT
    // =========================================================================
    @Nested
    @DisplayName("Update Announcement Tests")
    class UpdateAnnouncementTests {

        @Test
        @DisplayName("Should update announcement details successfully")
        void updateAnnouncement_Success() {
            LocalDateTime startsAt = LocalDateTime.now(MYANMAR_ZONE).plusHours(2);
            LocalDateTime endsAt = startsAt.plusDays(3);

            AnnouncementUpdateRequest updateRequest = new AnnouncementUpdateRequest(
                    "Emergency Maintenance",
                    "Immediate updates required.",
                    AnnouncementAudience.CUSTOMERS,
                    startsAt,
                    endsAt
            );

            when(announcementsRepository.findById(1)).thenReturn(Optional.of(sampleAnnouncement));
            when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));
            when(announcementsRepository.save(any(Announcements.class))).thenAnswer(inv -> inv.getArgument(0));

            AnnouncementResponse response = announcementService.updateAnnouncement(1, updateRequest, ADMIN_USERNAME);

            assertNotNull(response);
            assertEquals("Emergency Maintenance", response.getTitle());
            assertEquals("Immediate updates required.", response.getMessage());
            assertEquals(AnnouncementAudience.CUSTOMERS, response.getAudience());
            verify(announcementsRepository).save(sampleAnnouncement);
        }

        @Test
        @DisplayName("Should throw RuntimeException if announcement not found on update")
        void updateAnnouncement_ThrowsException_WhenNotFound() {
            AnnouncementUpdateRequest request = new AnnouncementUpdateRequest(
                    "Title", "Msg", AnnouncementAudience.ALL,
                    LocalDateTime.now(MYANMAR_ZONE), LocalDateTime.now(MYANMAR_ZONE).plusDays(1)
            );

            when(announcementsRepository.findById(99)).thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> announcementService.updateAnnouncement(99, request, ADMIN_USERNAME));
            assertEquals("Announcement not found", ex.getMessage());
        }
    }

    // =========================================================================
    // 4. DEACTIVATE & DELETE ANNOUNCEMENT
    // =========================================================================
    @Nested
    @DisplayName("Deactivate and Delete Tests")
    class DeactivateAndDeleteTests {

        @Test
        @DisplayName("Should deactivate an active announcement successfully")
        void deactivateAnnouncement_Success() {
            when(announcementsRepository.findById(1)).thenReturn(Optional.of(sampleAnnouncement));
            when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));
            when(announcementsRepository.save(any(Announcements.class))).thenAnswer(inv -> inv.getArgument(0));

            AnnouncementResponse response = announcementService.deactivateAnnouncement(1, ADMIN_USERNAME);

            assertNotNull(response);
            assertFalse(response.isActive());
            assertFalse(sampleAnnouncement.isActive());
            verify(announcementsRepository).save(sampleAnnouncement);
        }

        @Test
        @DisplayName("Should throw RuntimeException if announcement is already inactive")
        void deactivateAnnouncement_ThrowsException_WhenAlreadyInactive() {
            sampleAnnouncement.setActive(false);
            when(announcementsRepository.findById(1)).thenReturn(Optional.of(sampleAnnouncement));
            when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> announcementService.deactivateAnnouncement(1, ADMIN_USERNAME));
            assertEquals("Announcement is already inactive", ex.getMessage());
            verify(announcementsRepository, never()).save(any());
        }

        @Test
        @DisplayName("Should delete announcement by calling repository.delete")
        void deleteAnnouncement_Success() {
            when(announcementsRepository.findById(1)).thenReturn(Optional.of(sampleAnnouncement));

            announcementService.deleteAnnouncement(1);

            verify(announcementsRepository).delete(sampleAnnouncement);
        }

        @Test
        @DisplayName("Should throw RuntimeException when deleting non-existent announcement")
        void deleteAnnouncement_ThrowsException_WhenNotFound() {
            when(announcementsRepository.findById(99)).thenReturn(Optional.empty());

            RuntimeException ex = assertThrows(RuntimeException.class,
                    () -> announcementService.deleteAnnouncement(99));
            assertEquals("Announcement not found", ex.getMessage());
            verify(announcementsRepository, never()).delete(any());
        }

        @Test
        @DisplayName("Should bulk delete expired announcements")
        void bulkDeleteExpiredAnnouncements_Success() {
            LocalDateTime now = LocalDateTime.now(MYANMAR_ZONE);

            Announcements expired1 = Announcements.builder()
                    .announcementId(10)
                    .title("Old 1")
                    .endsAt(now.minusDays(2))
                    .build();

            Announcements active = Announcements.builder()
                    .announcementId(11)
                    .title("Current")
                    .endsAt(now.plusDays(2))
                    .build();

            when(announcementsRepository.findAll()).thenReturn(List.of(expired1, active));

            announcementService.bulkDeleteExpiredAnnouncements();

            verify(announcementsRepository).deleteAll(List.of(expired1));
        }
    }

    // =========================================================================
    // 5. AUDIENCE & ACTIVE ANNOUNCEMENTS
    // =========================================================================
    @Nested
    @DisplayName("Visibility and Active Tests")
    class VisibilityAndActiveTests {

        @Test
        @DisplayName("Should filter active announcements valid for current time")
        void getActiveAnnouncements_FiltersCorrectly() {
            LocalDateTime now = LocalDateTime.now(MYANMAR_ZONE);

            Announcements valid = Announcements.builder()
                    .announcementId(1)
                    .title("Valid")
                    .isActive(true)
                    .startsAt(now.minusHours(1))
                    .endsAt(now.plusHours(2))
                    .build();

            Announcements future = Announcements.builder()
                    .announcementId(2)
                    .title("Future")
                    .isActive(true)
                    .startsAt(now.plusDays(1))
                    .endsAt(now.plusDays(2))
                    .build();

            Announcements inactive = Announcements.builder()
                    .announcementId(3)
                    .title("Inactive")
                    .isActive(false)
                    .startsAt(now.minusDays(1))
                    .endsAt(now.plusDays(1))
                    .build();

            when(announcementsRepository.findAll()).thenReturn(List.of(valid, future, inactive));

            List<AnnouncementResponse> active = announcementService.getActiveAnnouncements();

            assertEquals(1, active.size());
            assertEquals("Valid", active.get(0).getTitle());
        }

        @Test
        @DisplayName("Should fetch announcements visible to staff")
        void getAnnouncementsForStaff_Success() {
            when(announcementsRepository.findVisibleAnnouncements(
                    eq(AnnouncementAudience.STAFF), eq(AnnouncementAudience.ALL), any(LocalDateTime.class)))
                    .thenReturn(List.of(sampleAnnouncement));

            List<AnnouncementResponse> responses = announcementService.getAnnouncementsForStaff();

            assertEquals(1, responses.size());
            assertEquals("System Maintenance", responses.get(0).getTitle());
        }

        @Test
        @DisplayName("Should fetch announcements visible to customers")
        void getAnnouncementsForCustomers_Success() {
            when(announcementsRepository.findVisibleAnnouncements(
                    eq(AnnouncementAudience.CUSTOMERS), eq(AnnouncementAudience.ALL), any(LocalDateTime.class)))
                    .thenReturn(List.of(sampleAnnouncement));

            List<AnnouncementResponse> responses = announcementService.getAnnouncementsForCustomers();

            assertEquals(1, responses.size());
            assertEquals("System Maintenance", responses.get(0).getTitle());
        }
    }
}
