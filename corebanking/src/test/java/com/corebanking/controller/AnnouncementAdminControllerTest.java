package com.corebanking.controller;

import com.corebanking.dto.AnnouncementCreateRequest;
import com.corebanking.dto.AnnouncementResponse;
import com.corebanking.dto.AnnouncementUpdateRequest;
import com.corebanking.entity.enums.AnnouncementAudience;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.AnnouncementService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Announcement Admin Controller Unit Tests")
class AnnouncementAdminControllerTest {

    @Mock
    private AnnouncementService announcementService;

    @InjectMocks
    private AnnouncementAdminController announcementAdminController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;
    private Authentication mockAuth;

    private static final String BASE_URL = "/api/admin/announcements";
    private static final String ADMIN_USER = "admin_user";

    private AnnouncementResponse sampleResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(announcementAdminController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        mockAuth = mock(Authentication.class);
        lenient().when(mockAuth.getName()).thenReturn(ADMIN_USER);

        sampleResponse = new AnnouncementResponse(
                1,
                "System Upgrade",
                "Scheduled downtime tonight.",
                AnnouncementAudience.ALL,
                true,
                LocalDateTime.now().minusHours(1),
                LocalDateTime.now().plusDays(1),
                UUID.randomUUID(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );
    }

    @Test
    @DisplayName("POST /api/admin/announcements should return 200 OK on valid creation")
    void createAnnouncement_Success() throws Exception {
        AnnouncementCreateRequest request = new AnnouncementCreateRequest(
                "System Upgrade",
                "Scheduled downtime tonight.",
                AnnouncementAudience.ALL,
                LocalDateTime.now().plusHours(1),
                LocalDateTime.now().plusDays(2)
        );

        when(announcementService.createAnnouncement(any(AnnouncementCreateRequest.class), eq(ADMIN_USER)))
                .thenReturn(sampleResponse);

        mockMvc.perform(post(BASE_URL)
                        .principal(mockAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.announcementId", is(1)))
                .andExpect(jsonPath("$.title", is("System Upgrade")))
                .andExpect(jsonPath("$.active", is(true)));

        verify(announcementService).createAnnouncement(any(AnnouncementCreateRequest.class), eq(ADMIN_USER));
    }

    @Test
    @DisplayName("POST /api/admin/announcements should return 400 Bad Request on missing fields")
    void createAnnouncement_ValidationErrors() throws Exception {
        AnnouncementCreateRequest invalid = new AnnouncementCreateRequest();
        invalid.setTitle("");
        invalid.setMessage("");

        mockMvc.perform(post(BASE_URL)
                        .principal(mockAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));

        verify(announcementService, never()).createAnnouncement(any(), any());
    }

    @Test
    @DisplayName("GET /api/admin/announcements should return 200 OK and list of announcements")
    void getAllAnnouncements_ReturnsList() throws Exception {
        when(announcementService.getAllAnnouncements()).thenReturn(List.of(sampleResponse));

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", is("System Upgrade")));
    }

    @Test
    @DisplayName("GET /api/admin/announcements/{id} should return 200 OK with announcement details")
    void getAnnouncementById_Success() throws Exception {
        when(announcementService.getAnnouncementById(1)).thenReturn(sampleResponse);

        mockMvc.perform(get(BASE_URL + "/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.announcementId", is(1)))
                .andExpect(jsonPath("$.title", is("System Upgrade")));
    }

    @Test
    @DisplayName("PUT /api/admin/announcements/{id} should return 200 OK with updated announcement")
    void updateAnnouncement_Success() throws Exception {
        AnnouncementUpdateRequest updateRequest = new AnnouncementUpdateRequest(
                "Updated Title",
                "Updated Message",
                AnnouncementAudience.STAFF,
                LocalDateTime.now().plusHours(2),
                LocalDateTime.now().plusDays(3)
        );

        sampleResponse.setTitle("Updated Title");
        sampleResponse.setAudience(AnnouncementAudience.STAFF);

        when(announcementService.updateAnnouncement(eq(1), any(AnnouncementUpdateRequest.class), eq(ADMIN_USER)))
                .thenReturn(sampleResponse);

        mockMvc.perform(put(BASE_URL + "/1")
                        .principal(mockAuth)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title", is("Updated Title")))
                .andExpect(jsonPath("$.audience", is("STAFF")));
    }

    @Test
    @DisplayName("DELETE /api/admin/announcements/{id} should return 200 OK with confirmation message")
    void deleteAnnouncement_Success() throws Exception {
        doNothing().when(announcementService).deleteAnnouncement(1);

        mockMvc.perform(delete(BASE_URL + "/1"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Announcement deleted successfully")));

        verify(announcementService).deleteAnnouncement(1);
    }

    @Test
    @DisplayName("DELETE /api/admin/announcements/{id}/soft-delete should return 200 OK")
    void softDeleteAnnouncement_Success() throws Exception {
        doNothing().when(announcementService).deleteAnnouncement(1);

        mockMvc.perform(delete(BASE_URL + "/1/soft-delete"))
                .andExpect(status().isOk())
                .andExpect(content().string(containsString("Announcement deleted successfully")));

        verify(announcementService).deleteAnnouncement(1);
    }

    @Test
    @DisplayName("DELETE /api/admin/announcements/bulk-soft-delete-expired should return 204 No Content")
    void bulkDeleteExpiredAnnouncements_Success() throws Exception {
        doNothing().when(announcementService).bulkDeleteExpiredAnnouncements();

        mockMvc.perform(delete(BASE_URL + "/bulk-soft-delete-expired"))
                .andExpect(status().isNoContent());

        verify(announcementService).bulkDeleteExpiredAnnouncements();
    }

    @Test
    @DisplayName("PATCH /api/admin/announcements/{id}/deactivate should return 200 OK with active=false")
    void deactivateAnnouncement_Success() throws Exception {
        sampleResponse.setActive(false);
        when(announcementService.deactivateAnnouncement(1, ADMIN_USER)).thenReturn(sampleResponse);

        mockMvc.perform(patch(BASE_URL + "/1/deactivate")
                        .principal(mockAuth))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.active", is(false)));

        verify(announcementService).deactivateAnnouncement(1, ADMIN_USER);
    }
}
