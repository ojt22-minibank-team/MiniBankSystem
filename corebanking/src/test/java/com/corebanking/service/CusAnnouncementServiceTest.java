package com.corebanking.service;

import com.corebanking.dto.CusAnnouncementResponse;
import com.corebanking.entity.AnnouncementReadStatus;
import com.corebanking.entity.Announcements;
import com.corebanking.entity.enums.AnnouncementAudience;
import com.corebanking.repository.AnnouncementsRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CusAnnouncementService Unit Tests")
class CusAnnouncementServiceTest {

    private static final UUID CUSTOMER_ID = UUID.fromString("44444444-4444-4444-8444-444444444444");

    @Mock
    private AnnouncementsRepository announcementsRepository;

    @Mock
    private AnnouncementReadStatusService readStatusService;

    @InjectMocks
    private CusAnnouncementService cusAnnouncementService;

    private Announcements createAnnouncement(
            Integer id,
            String title,
            String message,
            AnnouncementAudience audience,
            boolean isActive,
            LocalDateTime startsAt,
            LocalDateTime endsAt) {
        return Announcements.builder()
                .announcementId(id)
                .title(title)
                .message(message)
                .audience(audience)
                .isActive(isActive)
                .startsAt(startsAt)
                .endsAt(endsAt)
                .createdAt(LocalDateTime.of(2026, 1, 1, 0, 0))
                .updatedAt(LocalDateTime.of(2026, 1, 2, 0, 0))
                .build();
    }

    // -------------------------------------------------------------------------
    // getAnnouncements() Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("getAnnouncements() Tests")
    class GetAnnouncementsTests {

        @Test
        @DisplayName("Throws IllegalArgumentException when customerId is null")
        void getAnnouncements_ThrowsException_WhenCustomerIdNull() {
            assertThatThrownBy(() -> cusAnnouncementService.getAnnouncements(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Customer ID is required.");

            verifyNoInteractions(announcementsRepository, readStatusService);
        }

        @Test
        @DisplayName("Returns empty list when no visible announcements exist")
        void getAnnouncements_Success_WhenNoAnnouncements() {
            when(announcementsRepository.findVisibleAnnouncements(
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            )).thenReturn(Collections.emptyList());

            List<CusAnnouncementResponse> responses = cusAnnouncementService.getAnnouncements(CUSTOMER_ID);

            assertThat(responses).isEmpty();
            verify(announcementsRepository).findVisibleAnnouncements(
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            );
            verifyNoInteractions(readStatusService);
        }

        @Test
        @DisplayName("Returns announcements with mapped read and unread statuses")
        void getAnnouncements_Success_WithReadAndUnreadAnnouncements() {
            LocalDateTime now = LocalDateTime.now();
            Announcements ann1 = createAnnouncement(1, "Maintenance Notice", "Scheduled downtime.",
                    AnnouncementAudience.CUSTOMERS, true, now.minusDays(1), now.plusDays(2));
            Announcements ann2 = createAnnouncement(2, "New App Feature", "Fingerprint login available.",
                    AnnouncementAudience.ALL, true, now.minusDays(2), now.plusDays(5));

            when(announcementsRepository.findVisibleAnnouncements(
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            )).thenReturn(List.of(ann1, ann2));

            // Mark announcement 1 as READ by customer, announcement 2 is UNREAD
            LocalDateTime readTime = LocalDateTime.of(2026, 10, 20, 15, 30);
            AnnouncementReadStatus readStatus1 = new AnnouncementReadStatus(CUSTOMER_ID, ann1, readTime);

            when(readStatusService.getReadStatuses(eq(CUSTOMER_ID), eq(List.of(1, 2))))
                    .thenReturn(List.of(readStatus1));

            List<CusAnnouncementResponse> responses = cusAnnouncementService.getAnnouncements(CUSTOMER_ID);

            assertThat(responses).hasSize(2);

            // Ann 1 is READ
            CusAnnouncementResponse r1 = responses.get(0);
            assertThat(r1.announcementId()).isEqualTo(1);
            assertThat(r1.title()).isEqualTo("Maintenance Notice");
            assertThat(r1.message()).isEqualTo("Scheduled downtime.");
            assertThat(r1.audience()).isEqualTo(AnnouncementAudience.CUSTOMERS);
            assertThat(r1.isActive()).isTrue();
            assertThat(r1.isRead()).isTrue();
            assertThat(r1.readAt()).isEqualTo(readTime);

            // Ann 2 is UNREAD
            CusAnnouncementResponse r2 = responses.get(1);
            assertThat(r2.announcementId()).isEqualTo(2);
            assertThat(r2.title()).isEqualTo("New App Feature");
            assertThat(r2.audience()).isEqualTo(AnnouncementAudience.ALL);
            assertThat(r2.isRead()).isFalse();
            assertThat(r2.readAt()).isNull();

            verify(announcementsRepository).findVisibleAnnouncements(
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            );
            verify(readStatusService).getReadStatuses(eq(CUSTOMER_ID), eq(List.of(1, 2)));
        }
    }

    // -------------------------------------------------------------------------
    // markAsRead() Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("markAsRead() Tests")
    class MarkAsReadTests {

        @Test
        @DisplayName("Throws IllegalArgumentException when customerId is null")
        void markAsRead_ThrowsException_WhenCustomerIdNull() {
            assertThatThrownBy(() -> cusAnnouncementService.markAsRead(null, 1))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Customer ID is required.");

            verifyNoInteractions(announcementsRepository, readStatusService);
        }

        @Test
        @DisplayName("Throws IllegalArgumentException when announcementId is null")
        void markAsRead_ThrowsException_WhenAnnouncementIdNull() {
            assertThatThrownBy(() -> cusAnnouncementService.markAsRead(CUSTOMER_ID, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Announcement ID is required.");

            verifyNoInteractions(announcementsRepository, readStatusService);
        }

        @Test
        @DisplayName("Throws IllegalArgumentException when announcement is not found or not visible")
        void markAsRead_ThrowsException_WhenAnnouncementNotVisible() {
            when(announcementsRepository.findVisibleAnnouncementById(
                    eq(99),
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            )).thenReturn(Optional.empty());

            assertThatThrownBy(() -> cusAnnouncementService.markAsRead(CUSTOMER_ID, 99))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Announcement not found or not available to this customer.");

            verify(readStatusService, never()).markAsRead(any(), any());
        }

        @Test
        @DisplayName("Successfully marks announcement as read when visible")
        void markAsRead_Success() {
            Announcements ann = createAnnouncement(1, "Title", "Message",
                    AnnouncementAudience.ALL, true, LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(1));

            when(announcementsRepository.findVisibleAnnouncementById(
                    eq(1),
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            )).thenReturn(Optional.of(ann));

            cusAnnouncementService.markAsRead(CUSTOMER_ID, 1);

            verify(readStatusService).markAsRead(CUSTOMER_ID, 1);
        }
    }

    // -------------------------------------------------------------------------
    // markAsUnread() Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("markAsUnread() Tests")
    class MarkAsUnreadTests {

        @Test
        @DisplayName("Throws IllegalArgumentException when customerId is null")
        void markAsUnread_ThrowsException_WhenCustomerIdNull() {
            assertThatThrownBy(() -> cusAnnouncementService.markAsUnread(null, 1))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Customer ID is required.");

            verifyNoInteractions(announcementsRepository, readStatusService);
        }

        @Test
        @DisplayName("Throws IllegalArgumentException when announcementId is null")
        void markAsUnread_ThrowsException_WhenAnnouncementIdNull() {
            assertThatThrownBy(() -> cusAnnouncementService.markAsUnread(CUSTOMER_ID, null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Announcement ID is required.");

            verifyNoInteractions(announcementsRepository, readStatusService);
        }

        @Test
        @DisplayName("Throws IllegalArgumentException when announcement is not found or not visible")
        void markAsUnread_ThrowsException_WhenAnnouncementNotVisible() {
            when(announcementsRepository.findVisibleAnnouncementById(
                    eq(50),
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            )).thenReturn(Optional.empty());

            assertThatThrownBy(() -> cusAnnouncementService.markAsUnread(CUSTOMER_ID, 50))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Announcement not found or not available to this customer.");

            verify(readStatusService, never()).markAsUnread(any(), any());
        }

        @Test
        @DisplayName("Successfully marks announcement as unread when visible")
        void markAsUnread_Success() {
            Announcements ann = createAnnouncement(1, "Title", "Message",
                    AnnouncementAudience.CUSTOMERS, true, LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(1));

            when(announcementsRepository.findVisibleAnnouncementById(
                    eq(1),
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            )).thenReturn(Optional.of(ann));

            cusAnnouncementService.markAsUnread(CUSTOMER_ID, 1);

            verify(readStatusService).markAsUnread(CUSTOMER_ID, 1);
        }
    }

    // -------------------------------------------------------------------------
    // markAllAsRead() Tests
    // -------------------------------------------------------------------------

    @Nested
    @DisplayName("markAllAsRead() Tests")
    class MarkAllAsReadTests {

        @Test
        @DisplayName("Throws IllegalArgumentException when customerId is null")
        void markAllAsRead_ThrowsException_WhenCustomerIdNull() {
            assertThatThrownBy(() -> cusAnnouncementService.markAllAsRead(null))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessage("Customer ID is required.");

            verifyNoInteractions(announcementsRepository, readStatusService);
        }

        @Test
        @DisplayName("Returns early without invoking readStatusService when no visible announcements exist")
        void markAllAsRead_DoesNothing_WhenNoVisibleAnnouncements() {
            when(announcementsRepository.findVisibleAnnouncements(
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            )).thenReturn(Collections.emptyList());

            cusAnnouncementService.markAllAsRead(CUSTOMER_ID);

            verify(announcementsRepository).findVisibleAnnouncements(
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            );
            verify(readStatusService, never()).markAllAsRead(any(), any());
        }

        @Test
        @DisplayName("Successfully marks all visible announcements as read")
        void markAllAsRead_Success_WhenVisibleAnnouncementsExist() {
            Announcements ann1 = createAnnouncement(1, "Ann 1", "Msg 1",
                    AnnouncementAudience.CUSTOMERS, true, LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(1));
            Announcements ann2 = createAnnouncement(2, "Ann 2", "Msg 2",
                    AnnouncementAudience.ALL, true, LocalDateTime.now().minusDays(1), LocalDateTime.now().plusDays(2));

            List<Announcements> visible = List.of(ann1, ann2);

            when(announcementsRepository.findVisibleAnnouncements(
                    eq(AnnouncementAudience.CUSTOMERS),
                    eq(AnnouncementAudience.ALL),
                    any(LocalDateTime.class)
            )).thenReturn(visible);

            cusAnnouncementService.markAllAsRead(CUSTOMER_ID);

            verify(readStatusService).markAllAsRead(CUSTOMER_ID, visible);
        }
    }
}
