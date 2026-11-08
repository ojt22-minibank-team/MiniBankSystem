package com.corebanking.controller;

import com.corebanking.dto.AdminDashboardResponseDTO;
import com.corebanking.dto.AnnouncementResponse;
import com.corebanking.dto.StaffResponse;
import com.corebanking.entity.enums.AnnouncementAudience;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.AdminDashboardService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("AdminDashboardController Unit Tests")
class AdminDashboardControllerTest {

    @Mock
    private AdminDashboardService adminDashboardService;

    @InjectMocks
    private AdminDashboardController adminDashboardController;

    private MockMvc mockMvc;

    private static final String SUMMARY_URL = "/api/admin/dashboard/summary";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(adminDashboardController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/admin/dashboard/summary - Success returns 200 OK with dashboard response")
    void getDashboardSummary_success_returnsOk() throws Exception {
        // Arrange
        UUID staffId = UUID.randomUUID();
        StaffResponse staffResponse = new StaffResponse();
        staffResponse.setStaffId(staffId);
        staffResponse.setStaffNo("STF001");
        staffResponse.setUsername("admin");
        staffResponse.setFullName("Super Admin");
        staffResponse.setStatus(StaffUserStatus.ACTIVE);

        AnnouncementResponse announcementResponse = new AnnouncementResponse();
        announcementResponse.setAnnouncementId(101);
        announcementResponse.setTitle("System Upgrade");
        announcementResponse.setMessage("Scheduled maintenance tonight");
        announcementResponse.setAudience(AnnouncementAudience.ALL);
        announcementResponse.setActive(true);

        AdminDashboardResponseDTO responseDTO = AdminDashboardResponseDTO.builder()
                .totalStaff(10)
                .activeStaff(8)
                .totalCustomers(250)
                .totalAccounts(300)
                .activeAccounts(280)
                .totalParameters(15)
                .activeAnnouncements(2)
                .todayFeeRevenue(BigDecimal.valueOf(150.00))
                .allTimeFeeRevenue(BigDecimal.valueOf(5000.00))
                .recentStaff(List.of(staffResponse))
                .recentAnnouncements(List.of(announcementResponse))
                .build();

        when(adminDashboardService.getDashboardSummary()).thenReturn(responseDTO);

        // Act & Assert
        mockMvc.perform(get(SUMMARY_URL)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalStaff", is(10)))
                .andExpect(jsonPath("$.activeStaff", is(8)))
                .andExpect(jsonPath("$.totalCustomers", is(250)))
                .andExpect(jsonPath("$.totalAccounts", is(300)))
                .andExpect(jsonPath("$.activeAccounts", is(280)))
                .andExpect(jsonPath("$.totalParameters", is(15)))
                .andExpect(jsonPath("$.activeAnnouncements", is(2)))
                .andExpect(jsonPath("$.todayFeeRevenue", is(150.0)))
                .andExpect(jsonPath("$.allTimeFeeRevenue", is(5000.0)))
                .andExpect(jsonPath("$.recentStaff", hasSize(1)))
                .andExpect(jsonPath("$.recentStaff[0].staffNo", is("STF001")))
                .andExpect(jsonPath("$.recentStaff[0].fullName", is("Super Admin")))
                .andExpect(jsonPath("$.recentAnnouncements", hasSize(1)))
                .andExpect(jsonPath("$.recentAnnouncements[0].announcementId", is(101)))
                .andExpect(jsonPath("$.recentAnnouncements[0].title", is("System Upgrade")));

        verify(adminDashboardService).getDashboardSummary();
    }
}
