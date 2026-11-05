package com.corebanking.controller;

import com.corebanking.dto.CusAnnouncementResponse;
import com.corebanking.entity.enums.AnnouncementAudience;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.CusAnnouncementService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.method.annotation.AuthenticationPrincipalArgumentResolver;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CusAnnouncementController Unit Tests")
class CusAnnouncementControllerTest {

    private static final String BASE_URL = "/api/customer/announcements";
    private static final UUID CUSTOMER_ID = UUID.fromString("44444444-4444-4444-8444-444444444444");

    @Mock
    private CusAnnouncementService cusAnnouncementService;

    @InjectMocks
    private CusAnnouncementController cusAnnouncementController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(cusAnnouncementController)
                .setCustomArgumentResolvers(new AuthenticationPrincipalArgumentResolver())
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    private void mockSecurityUser(String customerId) {
        if (customerId != null) {
            Authentication auth = new UsernamePasswordAuthenticationToken(customerId, "n/a");
            SecurityContext securityContext = SecurityContextHolder.createEmptyContext();
            securityContext.setAuthentication(auth);
            SecurityContextHolder.setContext(securityContext);
        } else {
            SecurityContextHolder.clearContext();
        }
    }

    // -------------------------------------------------------------------------
    // GET /api/customer/announcements
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/customer/announcements - Returns 200 OK with list of customer announcements")
    void getAnnouncements_Success_Returns200() throws Exception {
        mockSecurityUser(CUSTOMER_ID.toString());

        LocalDateTime now = LocalDateTime.now();
        CusAnnouncementResponse response1 = new CusAnnouncementResponse(
                1, "System Upgrade", "Scheduled maintenance this Sunday.",
                AnnouncementAudience.CUSTOMERS, true,
                now.minusDays(1), now.plusDays(3),
                now.minusDays(2), now.minusDays(1),
                true, now.minusHours(5)
        );

        CusAnnouncementResponse response2 = new CusAnnouncementResponse(
                2, "Holiday Branch Closure", "Branches closed on Monday.",
                AnnouncementAudience.ALL, true,
                now.minusDays(1), now.plusDays(2),
                now.minusDays(2), now.minusDays(1),
                false, null
        );

        when(cusAnnouncementService.getAnnouncements(CUSTOMER_ID)).thenReturn(List.of(response1, response2));

        mockMvc.perform(get(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].announcementId", is(1)))
                .andExpect(jsonPath("$[0].title", is("System Upgrade")))
                .andExpect(jsonPath("$[0].message", is("Scheduled maintenance this Sunday.")))
                .andExpect(jsonPath("$[0].isRead", is(true)))
                .andExpect(jsonPath("$[1].announcementId", is(2)))
                .andExpect(jsonPath("$[1].title", is("Holiday Branch Closure")))
                .andExpect(jsonPath("$[1].isRead", is(false)));

        verify(cusAnnouncementService, times(1)).getAnnouncements(CUSTOMER_ID);
    }

    @Test
    @DisplayName("GET /api/customer/announcements - Returns 400 when authenticated customer is missing")
    void getAnnouncements_MissingCustomer_Returns400() throws Exception {
        mockSecurityUser(null);

        mockMvc.perform(get(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")))
                .andExpect(jsonPath("$.message", is("Authenticated customer is required.")));

        verifyNoInteractions(cusAnnouncementService);
    }

    @Test
    @DisplayName("GET /api/customer/announcements - Returns 400 when authenticated customer is invalid UUID")
    void getAnnouncements_InvalidCustomerUuid_Returns400() throws Exception {
        mockSecurityUser("invalid-uuid");

        mockMvc.perform(get(BASE_URL)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")))
                .andExpect(jsonPath("$.message", is("Invalid authenticated customer identity.")));

        verifyNoInteractions(cusAnnouncementService);
    }

    // -------------------------------------------------------------------------
    // PUT /api/customer/announcements/{announcementId}/read
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("PUT /api/customer/announcements/{announcementId}/read - Returns 204 No Content on success")
    void markAsRead_Success_Returns204() throws Exception {
        mockSecurityUser(CUSTOMER_ID.toString());
        doNothing().when(cusAnnouncementService).markAsRead(CUSTOMER_ID, 1);

        mockMvc.perform(put(BASE_URL + "/{announcementId}/read", 1))
                .andExpect(status().isNoContent());

        verify(cusAnnouncementService, times(1)).markAsRead(CUSTOMER_ID, 1);
    }

    @Test
    @DisplayName("PUT /api/customer/announcements/{announcementId}/read - Returns 400 when announcement not found")
    void markAsRead_AnnouncementNotFound_Returns400() throws Exception {
        mockSecurityUser(CUSTOMER_ID.toString());
        doThrow(new IllegalArgumentException("Announcement not found or not available to this customer."))
                .when(cusAnnouncementService).markAsRead(CUSTOMER_ID, 99);

        mockMvc.perform(put(BASE_URL + "/{announcementId}/read", 99))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("BAD_REQUEST")))
                .andExpect(jsonPath("$.message", is("Announcement not found or not available to this customer.")));

        verify(cusAnnouncementService, times(1)).markAsRead(CUSTOMER_ID, 99);
    }

    // -------------------------------------------------------------------------
    // DELETE /api/customer/announcements/{announcementId}/read
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("DELETE /api/customer/announcements/{announcementId}/read - Returns 204 No Content on success")
    void markAsUnread_Success_Returns204() throws Exception {
        mockSecurityUser(CUSTOMER_ID.toString());
        doNothing().when(cusAnnouncementService).markAsUnread(CUSTOMER_ID, 1);

        mockMvc.perform(delete(BASE_URL + "/{announcementId}/read", 1))
                .andExpect(status().isNoContent());

        verify(cusAnnouncementService, times(1)).markAsUnread(CUSTOMER_ID, 1);
    }

    // -------------------------------------------------------------------------
    // PUT /api/customer/announcements/read-all
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("PUT /api/customer/announcements/read-all - Returns 204 No Content on success")
    void markAllAsRead_Success_Returns204() throws Exception {
        mockSecurityUser(CUSTOMER_ID.toString());
        doNothing().when(cusAnnouncementService).markAllAsRead(CUSTOMER_ID);

        mockMvc.perform(put(BASE_URL + "/read-all"))
                .andExpect(status().isNoContent());

        verify(cusAnnouncementService, times(1)).markAllAsRead(CUSTOMER_ID);
    }
}
