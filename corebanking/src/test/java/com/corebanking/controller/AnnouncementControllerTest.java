package com.corebanking.controller;

import com.corebanking.dto.AnnouncementResponse;
import com.corebanking.entity.enums.AnnouncementAudience;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.AnnouncementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Announcement Public Controller Unit Tests")
class AnnouncementControllerTest {

    @Mock
    private AnnouncementService announcementService;

    @InjectMocks
    private AnnouncementController announcementController;

    private MockMvc mockMvc;

    private static final String BASE_URL = "/api/announcements";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(announcementController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/announcements should return 200 OK and list of active announcements")
    void getActiveAnnouncements_Success() throws Exception {
        AnnouncementResponse response = new AnnouncementResponse(
                1,
                "Public Holiday Notice",
                "Branches will be closed this Friday.",
                AnnouncementAudience.ALL,
                true,
                LocalDateTime.now().minusDays(1),
                LocalDateTime.now().plusDays(2),
                UUID.randomUUID(),
                LocalDateTime.now(),
                LocalDateTime.now()
        );

        when(announcementService.getActiveAnnouncements()).thenReturn(List.of(response));

        mockMvc.perform(get(BASE_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title", is("Public Holiday Notice")))
                .andExpect(jsonPath("$[0].active", is(true)));

        verify(announcementService).getActiveAnnouncements();
    }
}
