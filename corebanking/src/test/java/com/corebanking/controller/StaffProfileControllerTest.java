package com.corebanking.controller;

import com.corebanking.dto.StaffChangePasswordRequest;
import com.corebanking.dto.StaffResponse;
import com.corebanking.dto.StaffUpdateRequest;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.StaffManagementService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.UUID;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("StaffProfileController Unit Tests")
class StaffProfileControllerTest {

    @Mock
    private StaffManagementService staffManagementService;

    @InjectMocks
    private StaffProfileController staffProfileController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private static final String BASE_URL = "/api/staff/profile";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(staffProfileController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    @Nested
    @DisplayName("GET /api/staff/profile")
    class GetMyProfileTests {

        @Test
        @DisplayName("Should return 200 OK with authenticated staff profile")
        void getMyProfile_success_returnsOk() throws Exception {
            // Arrange
            UUID staffId = UUID.randomUUID();
            StaffResponse response = new StaffResponse();
            response.setStaffId(staffId);
            response.setStaffNo("STF-2026-001");
            response.setUsername("mgmg");
            response.setFullName("Mg Mg");
            response.setEmail("mgmg@bank.com");
            response.setPhone("09123456789");
            response.setStatus(StaffUserStatus.ACTIVE);
            response.setRoleName("TELLER");

            when(staffManagementService.getMyProfile()).thenReturn(response);

            // Act & Assert
            mockMvc.perform(get(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.staffNo", is("STF-2026-001")))
                    .andExpect(jsonPath("$.username", is("mgmg")))
                    .andExpect(jsonPath("$.fullName", is("Mg Mg")))
                    .andExpect(jsonPath("$.email", is("mgmg@bank.com")))
                    .andExpect(jsonPath("$.phone", is("09123456789")))
                    .andExpect(jsonPath("$.roleName", is("TELLER")));

            verify(staffManagementService).getMyProfile();
        }
    }

    @Nested
    @DisplayName("PUT /api/staff/profile")
    class UpdateMyProfileTests {

        @Test
        @DisplayName("Should return 200 OK when updating profile with valid request")
        void updateMyProfile_success_returnsOk() throws Exception {
            // Arrange
            StaffUpdateRequest request = new StaffUpdateRequest();
            request.setFullName("Mg Mg Updated");
            request.setEmail("mgmg_new@bank.com");
            request.setPhone("09987654321");

            StaffResponse updatedResponse = new StaffResponse();
            updatedResponse.setStaffNo("STF-2026-001");
            updatedResponse.setUsername("mgmg");
            updatedResponse.setFullName("Mg Mg Updated");
            updatedResponse.setEmail("mgmg_new@bank.com");
            updatedResponse.setPhone("09987654321");
            updatedResponse.setStatus(StaffUserStatus.ACTIVE);

            when(staffManagementService.updateMyProfile(any(StaffUpdateRequest.class))).thenReturn(updatedResponse);

            // Act & Assert
            mockMvc.perform(put(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.fullName", is("Mg Mg Updated")))
                    .andExpect(jsonPath("$.email", is("mgmg_new@bank.com")))
                    .andExpect(jsonPath("$.phone", is("09987654321")));

            verify(staffManagementService).updateMyProfile(any(StaffUpdateRequest.class));
        }
    }

    @Nested
    @DisplayName("POST /api/staff/profile/change-password")
    class ChangePasswordTests {

        @Test
        @DisplayName("Should return 200 OK with success message when password change is valid")
        void changePassword_success_returnsOk() throws Exception {
            // Arrange
            StaffChangePasswordRequest request = new StaffChangePasswordRequest(
                    "CurrentPass123!",
                    "NewPass1234!",
                    "NewPass1234!"
            );

            doNothing().when(staffManagementService).changeMyPassword(any(StaffChangePasswordRequest.class));

            // Act & Assert
            mockMvc.perform(post(BASE_URL + "/change-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.message", is("Password changed successfully.")));

            verify(staffManagementService).changeMyPassword(any(StaffChangePasswordRequest.class));
        }

        @Test
        @DisplayName("Should return 400 Bad Request when required fields are blank")
        void changePassword_blankFields_returnsBadRequest() throws Exception {
            // Arrange
            StaffChangePasswordRequest request = new StaffChangePasswordRequest("", "", "");

            // Act & Assert
            mockMvc.perform(post(BASE_URL + "/change-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(staffManagementService);
        }

        @Test
        @DisplayName("Should return 400 Bad Request when new password is too short")
        void changePassword_shortNewPassword_returnsBadRequest() throws Exception {
            // Arrange
            StaffChangePasswordRequest request = new StaffChangePasswordRequest("ValidOldPass1!", "short", "short");

            // Act & Assert
            mockMvc.perform(post(BASE_URL + "/change-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest());

            verifyNoInteractions(staffManagementService);
        }

        @Test
        @DisplayName("Should return 400 Bad Request when service throws IllegalArgumentException")
        void changePassword_serviceThrowsIllegalArgument_returnsBadRequest() throws Exception {
            // Arrange
            StaffChangePasswordRequest request = new StaffChangePasswordRequest(
                    "WrongPass123!",
                    "NewPass1234!",
                    "NewPass1234!"
            );

            doThrow(new IllegalArgumentException("Current password is incorrect"))
                    .when(staffManagementService).changeMyPassword(any(StaffChangePasswordRequest.class));

            // Act & Assert
            mockMvc.perform(post(BASE_URL + "/change-password")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message", is("Current password is incorrect")));

            verify(staffManagementService).changeMyPassword(any(StaffChangePasswordRequest.class));
        }
    }
}
