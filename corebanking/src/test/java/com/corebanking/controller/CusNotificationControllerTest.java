package com.corebanking.controller;

import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.entity.enums.NotificationType;
import com.corebanking.service.CusNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.is;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
class CusNotificationControllerTest {

    private static final String BASE_URL = "/api/customer/notifications";
    private static final String CUSTOMER_ID = UUID.randomUUID().toString();

    @Mock
    private CusNotificationService cusNotificationService;

    @InjectMocks
    private CusNotificationController cusNotificationController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(cusNotificationController)
                .setCustomArgumentResolvers(new HandlerMethodArgumentResolver() {
                    @Override
                    public boolean supportsParameter(MethodParameter parameter) {
                        return parameter.hasParameterAnnotation(AuthenticationPrincipal.class);
                    }

                    @Override
                    public Object resolveArgument(MethodParameter parameter,
                                                  ModelAndViewContainer mavContainer,
                                                  NativeWebRequest webRequest,
                                                  WebDataBinderFactory binderFactory) {
                        return CUSTOMER_ID;
                    }
                })
                .build();
    }

    @Test
    @DisplayName("GET /api/customer/notifications - Returns 200 with notification list")
    void testGetMyNotifications_Success() throws Exception {
        NotificationResponseDto noti1 = NotificationResponseDto.builder()
                .notificationId(1L)
                .notificationType(NotificationType.TRANSFER)
                .title("Transfer Sent")
                .message("You have transferred 50000 MMK to Daw Mya")
                .amount(new BigDecimal("50000.0000"))
                .currency("MMK")
                .transferDirection("SENT")
                .counterpartyName("Daw Mya")
                .isRead(false)
                .createdAt(LocalDateTime.now())
                .build();

        NotificationResponseDto noti2 = NotificationResponseDto.builder()
                .notificationId(2L)
                .notificationType(NotificationType.TRANSFER)
                .title("Funds Received")
                .message("You received 30000 MMK from U Ba")
                .amount(new BigDecimal("30000.0000"))
                .currency("MMK")
                .transferDirection("RECEIVED")
                .counterpartyName("U Ba")
                .isRead(true)
                .createdAt(LocalDateTime.now().minusHours(1))
                .build();

        when(cusNotificationService.getMyNotifications(CUSTOMER_ID)).thenReturn(List.of(noti1, noti2));

        mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].notificationId", is(1)))
                .andExpect(jsonPath("$[0].title", is("Transfer Sent")))
                .andExpect(jsonPath("$[0].transferDirection", is("SENT")))
                .andExpect(jsonPath("$[0].counterpartyName", is("Daw Mya")))
                .andExpect(jsonPath("$[1].notificationId", is(2)))
                .andExpect(jsonPath("$[1].title", is("Funds Received")))
                .andExpect(jsonPath("$[1].transferDirection", is("RECEIVED")))
                .andExpect(jsonPath("$[1].counterpartyName", is("U Ba")));

        verify(cusNotificationService, times(1)).getMyNotifications(CUSTOMER_ID);
    }

    @Test
    @DisplayName("GET /api/customer/notifications - Returns 200 with empty list when no notifications")
    void testGetMyNotifications_Empty() throws Exception {
        when(cusNotificationService.getMyNotifications(CUSTOMER_ID)).thenReturn(List.of());

        mockMvc.perform(get(BASE_URL).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(0)));

        verify(cusNotificationService, times(1)).getMyNotifications(CUSTOMER_ID);
    }

    @Test
    @DisplayName("GET /api/customer/notifications/unread-count - Returns 200 with unread count")
    void testGetUnreadCount_Success() throws Exception {
        when(cusNotificationService.getUnreadCount(CUSTOMER_ID)).thenReturn(5L);

        mockMvc.perform(get(BASE_URL + "/unread-count").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount", is(5)));

        verify(cusNotificationService, times(1)).getUnreadCount(CUSTOMER_ID);
    }

    @Test
    @DisplayName("GET /api/customer/notifications/unread-count - Returns 0 when all read")
    void testGetUnreadCount_Zero() throws Exception {
        when(cusNotificationService.getUnreadCount(CUSTOMER_ID)).thenReturn(0L);

        mockMvc.perform(get(BASE_URL + "/unread-count").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.unreadCount", is(0)));

        verify(cusNotificationService, times(1)).getUnreadCount(CUSTOMER_ID);
    }

    @Test
    @DisplayName("PATCH /api/customer/notifications/{notificationId}/read - Returns success true when found")
    void testMarkAsRead_Success() throws Exception {
        when(cusNotificationService.markAsRead(CUSTOMER_ID, 101L)).thenReturn(true);

        mockMvc.perform(patch(BASE_URL + "/101/read").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)));

        verify(cusNotificationService, times(1)).markAsRead(CUSTOMER_ID, 101L);
    }

    @Test
    @DisplayName("PATCH /api/customer/notifications/{notificationId}/read - Returns success false when not found")
    void testMarkAsRead_NotFound() throws Exception {
        when(cusNotificationService.markAsRead(CUSTOMER_ID, 999L)).thenReturn(false);

        mockMvc.perform(patch(BASE_URL + "/999/read").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(false)));

        verify(cusNotificationService, times(1)).markAsRead(CUSTOMER_ID, 999L);
    }

    @Test
    @DisplayName("PUT /api/customer/notifications/read-all - Returns success true and updated count")
    void testMarkAllAsRead_Success() throws Exception {
        when(cusNotificationService.markAllAsRead(CUSTOMER_ID)).thenReturn(4);

        mockMvc.perform(put(BASE_URL + "/read-all").contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success", is(true)))
                .andExpect(jsonPath("$.updatedCount", is(4)));

        verify(cusNotificationService, times(1)).markAllAsRead(CUSTOMER_ID);
    }

    @Test
    @DisplayName("Direct method calls - Verify Controller returns expected ResponseEntity")
    void testDirectControllerMethods() {
        NotificationResponseDto sample = NotificationResponseDto.builder()
                .notificationId(50L)
                .title("Test")
                .build();
        when(cusNotificationService.getMyNotifications(CUSTOMER_ID)).thenReturn(List.of(sample));
        when(cusNotificationService.getUnreadCount(CUSTOMER_ID)).thenReturn(2L);
        when(cusNotificationService.markAsRead(CUSTOMER_ID, 50L)).thenReturn(true);
        when(cusNotificationService.markAllAsRead(CUSTOMER_ID)).thenReturn(2);

        ResponseEntity<List<NotificationResponseDto>> listResp = cusNotificationController.getMyNotifications(CUSTOMER_ID);
        assertEquals(200, listResp.getStatusCode().value());
        assertEquals(1, listResp.getBody().size());

        ResponseEntity<Map<String, Object>> countResp = cusNotificationController.getUnreadCount(CUSTOMER_ID);
        assertEquals(200, countResp.getStatusCode().value());
        assertEquals(2L, countResp.getBody().get("unreadCount"));

        ResponseEntity<Map<String, Object>> readResp = cusNotificationController.markAsRead(CUSTOMER_ID, 50L);
        assertEquals(200, readResp.getStatusCode().value());
        assertEquals(true, readResp.getBody().get("success"));

        ResponseEntity<Map<String, Object>> readAllResp = cusNotificationController.markAllAsRead(CUSTOMER_ID);
        assertEquals(200, readAllResp.getStatusCode().value());
        assertEquals(true, readAllResp.getBody().get("success"));
        assertEquals(2, readAllResp.getBody().get("updatedCount"));
    }
}
