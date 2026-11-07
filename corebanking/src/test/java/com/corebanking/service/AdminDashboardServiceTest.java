package com.corebanking.service;

import com.corebanking.dto.AdminDashboardResponseDTO;
import com.corebanking.dto.AnnouncementResponse;
import com.corebanking.dto.StaffResponse;
import com.corebanking.entity.Announcements;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AnnouncementAudience;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.AnnouncementsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.repository.SystemParametersRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminDashboardService Unit Tests")
class AdminDashboardServiceTest {

    @Mock
    private StaffUsersRepository staffUsersRepository;

    @Mock
    private CustomerRepository customerRepository;

    @Mock
    private AccountRepository accountRepository;

    @Mock
    private SystemParametersRepository systemParametersRepository;

    @Mock
    private AnnouncementsRepository announcementsRepository;

    @Mock
    private StaffManagementService staffManagementService;

    @Mock
    private AnnouncementService announcementService;

    @InjectMocks
    private AdminDashboardService adminDashboardService;

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockSecurityContext(String... roles) {
        var authorities = java.util.Arrays.stream(roles)
                .map(SimpleGrantedAuthority::new)
                .toList();
        var authentication = new UsernamePasswordAuthenticationToken("testUser", "password", authorities);
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
    }

    private void mockCommonStats() {
        when(customerRepository.count()).thenReturn(50L);
        when(accountRepository.count()).thenReturn(100L);
        when(accountRepository.countByStatus(AccountStatus.ACTIVE)).thenReturn(85L);
        when(systemParametersRepository.count()).thenReturn(12L);
        when(announcementsRepository.countByIsActiveTrue()).thenReturn(3L);
    }

    @Nested
    @DisplayName("Admin Role Tests")
    class AdminRoleTests {

        @Test
        @DisplayName("Should return full dashboard statistics and staff list for ADMIN")
        void getDashboardSummary_whenAdminRole_returnsFullStatisticsAndStaff() {
            // Arrange
            mockSecurityContext("ROLE_ADMIN");
            mockCommonStats();

            StaffUsers staff1 = StaffUsers.builder()
                    .staffId(UUID.randomUUID())
                    .staffNo("STF001")
                    .fullName("Admin One")
                    .status(StaffUserStatus.ACTIVE)
                    .build();

            StaffResponse staffResponse = new StaffResponse();
            staffResponse.setStaffId(staff1.getStaffId());
            staffResponse.setStaffNo("STF001");
            staffResponse.setFullName("Admin One");

            Announcements ann1 = Announcements.builder()
                    .announcementId(1)
                    .title("System Maintenance")
                    .audience(AnnouncementAudience.ALL)
                    .isActive(true)
                    .build();

            AnnouncementResponse annResponse = new AnnouncementResponse();
            annResponse.setAnnouncementId(1);
            annResponse.setTitle("System Maintenance");

            when(staffUsersRepository.count()).thenReturn(20L);
            when(staffUsersRepository.countByStatus(StaffUserStatus.ACTIVE)).thenReturn(18L);
            when(staffUsersRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of(staff1));
            when(staffManagementService.toResponse(staff1)).thenReturn(staffResponse);

            when(announcementsRepository.findTop4ByOrderByCreatedAtDesc()).thenReturn(List.of(ann1));
            when(announcementService.toResponse(ann1)).thenReturn(annResponse);

            // Act
            AdminDashboardResponseDTO result = adminDashboardService.getDashboardSummary();

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getTotalStaff()).isEqualTo(20L);
            assertThat(result.getActiveStaff()).isEqualTo(18L);
            assertThat(result.getTotalCustomers()).isEqualTo(50L);
            assertThat(result.getTotalAccounts()).isEqualTo(100L);
            assertThat(result.getActiveAccounts()).isEqualTo(85L);
            assertThat(result.getTotalParameters()).isEqualTo(12L);
            assertThat(result.getActiveAnnouncements()).isEqualTo(3L);

            assertThat(result.getRecentStaff()).hasSize(1);
            assertThat(result.getRecentStaff().get(0).getStaffNo()).isEqualTo("STF001");

            assertThat(result.getRecentAnnouncements()).hasSize(1);
            assertThat(result.getRecentAnnouncements().get(0).getTitle()).isEqualTo("System Maintenance");

            // Verify
            verify(staffUsersRepository).count();
            verify(staffUsersRepository).countByStatus(StaffUserStatus.ACTIVE);
            verify(staffUsersRepository).findTop5ByOrderByCreatedAtDesc();
            verify(staffManagementService).toResponse(staff1);
            verify(announcementsRepository).findTop4ByOrderByCreatedAtDesc();
            verify(announcementService, never()).getActiveAnnouncements();
        }
    }

    @Nested
    @DisplayName("Auditor Role Tests")
    class AuditorRoleTests {

        @Test
        @DisplayName("Should return staff details and recent announcements for AUDITOR")
        void getDashboardSummary_whenAuditorRole_allowsViewingStaff() {
            // Arrange
            mockSecurityContext("ROLE_AUDITOR");
            mockCommonStats();

            when(staffUsersRepository.count()).thenReturn(10L);
            when(staffUsersRepository.countByStatus(StaffUserStatus.ACTIVE)).thenReturn(9L);
            when(staffUsersRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of());
            when(announcementsRepository.findTop4ByOrderByCreatedAtDesc()).thenReturn(List.of());

            // Act
            AdminDashboardResponseDTO result = adminDashboardService.getDashboardSummary();

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getTotalStaff()).isEqualTo(10L);
            assertThat(result.getActiveStaff()).isEqualTo(9L);
            assertThat(result.getRecentStaff()).isEmpty();
            assertThat(result.getRecentAnnouncements()).isEmpty();

            verify(staffUsersRepository).count();
            verify(announcementsRepository).findTop4ByOrderByCreatedAtDesc();
        }
    }

    @Nested
    @DisplayName("Teller Role Tests")
    class TellerRoleTests {

        @Test
        @DisplayName("Should hide staff details and return up to 4 active announcements for TELLER")
        void getDashboardSummary_whenTellerRole_hidesStaffAndFetchesActiveAnnouncementsLimitedToFour() {
            // Arrange
            mockSecurityContext("ROLE_TELLER");
            mockCommonStats();

            AnnouncementResponse ann1 = new AnnouncementResponse();
            ann1.setAnnouncementId(1);
            AnnouncementResponse ann2 = new AnnouncementResponse();
            ann2.setAnnouncementId(2);
            AnnouncementResponse ann3 = new AnnouncementResponse();
            ann3.setAnnouncementId(3);
            AnnouncementResponse ann4 = new AnnouncementResponse();
            ann4.setAnnouncementId(4);
            AnnouncementResponse ann5 = new AnnouncementResponse();
            ann5.setAnnouncementId(5);

            when(announcementService.getActiveAnnouncements()).thenReturn(List.of(ann1, ann2, ann3, ann4, ann5));

            // Act
            AdminDashboardResponseDTO result = adminDashboardService.getDashboardSummary();

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getTotalStaff()).isEqualTo(0L);
            assertThat(result.getActiveStaff()).isEqualTo(0L);
            assertThat(result.getRecentStaff()).isEmpty();
            assertThat(result.getRecentAnnouncements()).hasSize(4);
            assertThat(result.getRecentAnnouncements().get(0).getAnnouncementId()).isEqualTo(1);
            assertThat(result.getRecentAnnouncements().get(3).getAnnouncementId()).isEqualTo(4);

            // Verify staff repo was never queried
            verifyNoInteractions(staffUsersRepository);
            verifyNoInteractions(staffManagementService);
            verify(announcementService).getActiveAnnouncements();
            verify(announcementsRepository, never()).findTop4ByOrderByCreatedAtDesc();
        }

        @Test
        @DisplayName("Should return staff and repository announcements when user is both TELLER and ADMIN")
        void getDashboardSummary_whenTellerAndAdmin_treatsAsCanViewStaff() {
            // Arrange
            mockSecurityContext("ROLE_TELLER", "ROLE_ADMIN");
            mockCommonStats();

            when(staffUsersRepository.count()).thenReturn(5L);
            when(staffUsersRepository.countByStatus(StaffUserStatus.ACTIVE)).thenReturn(4L);
            when(staffUsersRepository.findTop5ByOrderByCreatedAtDesc()).thenReturn(List.of());
            when(announcementsRepository.findTop4ByOrderByCreatedAtDesc()).thenReturn(List.of());

            // Act
            AdminDashboardResponseDTO result = adminDashboardService.getDashboardSummary();

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getTotalStaff()).isEqualTo(5L);
            assertThat(result.getActiveStaff()).isEqualTo(4L);

            verify(staffUsersRepository).count();
            verify(announcementsRepository).findTop4ByOrderByCreatedAtDesc();
            verify(announcementService, never()).getActiveAnnouncements();
        }
    }

    @Nested
    @DisplayName("Unauthenticated & Unauthorized Tests")
    class UnauthenticatedTests {

        @Test
        @DisplayName("Should hide staff details and return default announcements when authentication is null")
        void getDashboardSummary_whenAuthIsNull_hidesStaff() {
            // Arrange
            SecurityContextHolder.clearContext();
            mockCommonStats();

            when(announcementsRepository.findTop4ByOrderByCreatedAtDesc()).thenReturn(List.of());

            // Act
            AdminDashboardResponseDTO result = adminDashboardService.getDashboardSummary();

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getTotalStaff()).isEqualTo(0L);
            assertThat(result.getActiveStaff()).isEqualTo(0L);
            assertThat(result.getRecentStaff()).isEmpty();

            verifyNoInteractions(staffUsersRepository);
            verify(announcementsRepository).findTop4ByOrderByCreatedAtDesc();
            verify(announcementService, never()).getActiveAnnouncements();
        }

        @Test
        @DisplayName("Should hide staff and use repository announcements when user has no matching roles")
        void getDashboardSummary_whenRoleIsOther_hidesStaff() {
            // Arrange
            mockSecurityContext("ROLE_CUSTOMER");
            mockCommonStats();

            when(announcementsRepository.findTop4ByOrderByCreatedAtDesc()).thenReturn(List.of());

            // Act
            AdminDashboardResponseDTO result = adminDashboardService.getDashboardSummary();

            // Assert
            assertThat(result).isNotNull();
            assertThat(result.getTotalStaff()).isEqualTo(0L);
            assertThat(result.getActiveStaff()).isEqualTo(0L);
            assertThat(result.getRecentStaff()).isEmpty();

            verifyNoInteractions(staffUsersRepository);
            verify(announcementsRepository).findTop4ByOrderByCreatedAtDesc();
        }
    }
}
