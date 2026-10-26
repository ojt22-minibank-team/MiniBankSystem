package com.corebanking.controller;

import com.corebanking.dto.ChangeStaffRoleRequest;
import com.corebanking.dto.StaffCreateRequest;
import com.corebanking.dto.StaffResponse;
import com.corebanking.dto.StaffUpdateRequest;
import com.corebanking.entity.Roles;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.StaffManagementService;
import com.corebanking.service.StaffPasswordSetupService;
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
@DisplayName("Staff Management Controller Unit Tests")
class StaffManagementControllerTest {

    @Mock
    private StaffManagementService staffManagementService;

    @Mock
    private StaffPasswordSetupService staffPasswordSetupService;

    @InjectMocks
    private StaffManagementController staffManagementController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private static final UUID SAMPLE_STAFF_ID = UUID.fromString("11111111-2222-3333-4444-555555555555");
    private static final String BASE_URL = "/api/admin/staff";

    private StaffResponse sampleResponse;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(staffManagementController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();

        sampleResponse = new StaffResponse(
                SAMPLE_STAFF_ID,
                "STF-TLR-0001",
                "staff_alex",
                "Alex Teller",
                "alex@minibank.com",
                "0911223344",
                true,
                StaffUserStatus.ACTIVE,
                null,
                LocalDateTime.now(),
                LocalDateTime.now()
        );
        sampleResponse.setRoleId(2);
        sampleResponse.setRoleCode("TELLER");
        sampleResponse.setRoleName("Teller");
    }

    // =========================================================================
    // POST /api/admin/staff (CREATE STAFF)
    // =========================================================================
    @Nested
    @DisplayName("POST /api/admin/staff")
    class CreateStaffEndpointTests {

        @Test
        @DisplayName("Should return 201 Created and invoke password setup link on valid request")
        void createStaff_Success() throws Exception {
            StaffCreateRequest request = new StaffCreateRequest();
            request.setUsername("staff_alex");
            request.setFullName("Alex Teller");
            request.setEmail("alex@minibank.com");
            request.setPhone("0911223344");
            request.setRoleId(2);

            when(staffManagementService.createStaff(any(StaffCreateRequest.class))).thenReturn(sampleResponse);
            doNothing().when(staffPasswordSetupService).createSetupLink(SAMPLE_STAFF_ID);

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.staffId", is(SAMPLE_STAFF_ID.toString())))
                    .andExpect(jsonPath("$.staffNo", is("STF-TLR-0001")))
                    .andExpect(jsonPath("$.username", is("staff_alex")))
                    .andExpect(jsonPath("$.roleCode", is("TELLER")));

            verify(staffManagementService).createStaff(any(StaffCreateRequest.class));
            verify(staffPasswordSetupService).createSetupLink(SAMPLE_STAFF_ID);
        }

        @Test
        @DisplayName("Should return 400 Bad Request when request body has missing or blank fields")
        void createStaff_ValidationErrors() throws Exception {
            StaffCreateRequest invalidRequest = new StaffCreateRequest();
            // All required fields empty

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(invalidRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));

            verify(staffManagementService, never()).createStaff(any());
        }

        @Test
        @DisplayName("Should return 400 Bad Request when service throws IllegalArgumentException")
        void createStaff_DuplicateEmailOrInvalidRole() throws Exception {
            StaffCreateRequest request = new StaffCreateRequest();
            request.setUsername("staff_alex");
            request.setFullName("Alex Teller");
            request.setEmail("alex@minibank.com");
            request.setRoleId(1); // Admin role rejected

            when(staffManagementService.createStaff(any(StaffCreateRequest.class)))
                    .thenThrow(new IllegalArgumentException("Email is already registered"));

            mockMvc.perform(post(BASE_URL)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("BAD_REQUEST")))
                    .andExpect(jsonPath("$.message", is("Email is already registered")));
        }
    }

    // =========================================================================
    // GET /api/admin/staff & GET /api/admin/staff/roles & GET /{staffId}
    // =========================================================================
    @Nested
    @DisplayName("GET Staff Endpoints")
    class ReadStaffEndpointsTests {

        @Test
        @DisplayName("GET /api/admin/staff should return 200 OK and list of staff")
        void getAllStaff_ReturnsList() throws Exception {
            when(staffManagementService.getAllStaff()).thenReturn(List.of(sampleResponse));

            mockMvc.perform(get(BASE_URL))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].username", is("staff_alex")));
        }

        @Test
        @DisplayName("GET /api/admin/staff/roles should return 200 OK and list of roles")
        void getAllRoles_ReturnsList() throws Exception {
            Roles role = Roles.builder().roleId(1).roleCode("ADMIN").roleName("Administrator").build();
            when(staffManagementService.getAllRoles()).thenReturn(List.of(role));

            mockMvc.perform(get(BASE_URL + "/roles"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$", hasSize(1)))
                    .andExpect(jsonPath("$[0].roleCode", is("ADMIN")));
        }

        @Test
        @DisplayName("GET /api/admin/staff/{staffId} should return 200 OK with staff details")
        void getStaffById_Success() throws Exception {
            when(staffManagementService.getStaffById(SAMPLE_STAFF_ID)).thenReturn(sampleResponse);

            mockMvc.perform(get(BASE_URL + "/" + SAMPLE_STAFF_ID))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.staffId", is(SAMPLE_STAFF_ID.toString())))
                    .andExpect(jsonPath("$.fullName", is("Alex Teller")));
        }
    }

    // =========================================================================
    // PUT /api/admin/staff/{staffId} (UPDATE STAFF)
    // =========================================================================
    @Nested
    @DisplayName("PUT /api/admin/staff/{staffId}")
    class UpdateStaffEndpointTests {

        @Test
        @DisplayName("Should return 200 OK with updated staff details")
        void updateStaff_Success() throws Exception {
            StaffUpdateRequest updateRequest = new StaffUpdateRequest();
            updateRequest.setFullName("Alex Updated");
            updateRequest.setEmail("alex.updated@minibank.com");
            updateRequest.setPhone("0999999999");

            sampleResponse.setFullName("Alex Updated");
            when(staffManagementService.updateStaff(eq(SAMPLE_STAFF_ID), any(StaffUpdateRequest.class)))
                    .thenReturn(sampleResponse);

            mockMvc.perform(put(BASE_URL + "/" + SAMPLE_STAFF_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateRequest)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.fullName", is("Alex Updated")));
        }

        @Test
        @DisplayName("Should return 400 Bad Request when updating another admin's info")
        void updateStaff_RejectsOtherAdmin() throws Exception {
            StaffUpdateRequest updateRequest = new StaffUpdateRequest();
            updateRequest.setFullName("Another Admin");

            when(staffManagementService.updateStaff(eq(SAMPLE_STAFF_ID), any(StaffUpdateRequest.class)))
                    .thenThrow(new IllegalArgumentException("Administrators cannot edit the information of other administrators."));

            mockMvc.perform(put(BASE_URL + "/" + SAMPLE_STAFF_ID)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(updateRequest)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("BAD_REQUEST")))
                    .andExpect(jsonPath("$.message", containsString("Administrators cannot edit the information of other administrators.")));
        }
    }

    // =========================================================================
    // PUT /api/admin/staff/{staffId}/role (CHANGE ROLE)
    // =========================================================================
    @Nested
    @DisplayName("PUT /api/admin/staff/{staffId}/role")
    class ChangeRoleEndpointTests {

        @Test
        @DisplayName("Should return 200 OK when changing staff role successfully")
        void changeRole_Success() throws Exception {
            ChangeStaffRoleRequest request = new ChangeStaffRoleRequest();
            request.setRoleId(3);

            sampleResponse.setRoleCode("AUDITOR");
            sampleResponse.setStaffNo("STF-AUD-0001");
            when(staffManagementService.changeRole(eq(SAMPLE_STAFF_ID), any(ChangeStaffRoleRequest.class)))
                    .thenReturn(sampleResponse);

            mockMvc.perform(put(BASE_URL + "/" + SAMPLE_STAFF_ID + "/role")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.roleCode", is("AUDITOR")))
                    .andExpect(jsonPath("$.staffNo", is("STF-AUD-0001")));
        }

        @Test
        @DisplayName("Should return 400 Bad Request when changing own role or another admin's role")
        void changeRole_RejectsAdminRoleChange() throws Exception {
            ChangeStaffRoleRequest request = new ChangeStaffRoleRequest();
            request.setRoleId(2);

            when(staffManagementService.changeRole(eq(SAMPLE_STAFF_ID), any(ChangeStaffRoleRequest.class)))
                    .thenThrow(new IllegalArgumentException("Administrators cannot change their own role."));

            mockMvc.perform(put(BASE_URL + "/" + SAMPLE_STAFF_ID + "/role")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("BAD_REQUEST")))
                    .andExpect(jsonPath("$.message", is("Administrators cannot change their own role.")));
        }
    }

    // =========================================================================
    // PATCH /api/admin/staff/{staffId}/deactivate (DEACTIVATE STAFF)
    // =========================================================================
    @Nested
    @DisplayName("PATCH /api/admin/staff/{staffId}/deactivate")
    class DeactivateStaffEndpointTests {

        @Test
        @DisplayName("Should return 200 OK with deactivated status")
        void deactivateStaff_Success() throws Exception {
            sampleResponse.setStatus(StaffUserStatus.DEACTIVATED);
            when(staffManagementService.deactivateStaff(SAMPLE_STAFF_ID)).thenReturn(sampleResponse);

            mockMvc.perform(patch(BASE_URL + "/" + SAMPLE_STAFF_ID + "/deactivate"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status", is("DEACTIVATED")));
        }

        @Test
        @DisplayName("Should return 400 Bad Request when attempting to deactivate self or another admin")
        void deactivateStaff_RejectsAdminDeactivation() throws Exception {
            when(staffManagementService.deactivateStaff(SAMPLE_STAFF_ID))
                    .thenThrow(new IllegalArgumentException("Administrators cannot deactivate their own account."));

            mockMvc.perform(patch(BASE_URL + "/" + SAMPLE_STAFF_ID + "/deactivate"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("BAD_REQUEST")))
                    .andExpect(jsonPath("$.message", is("Administrators cannot deactivate their own account.")));
        }
    }

    // =========================================================================
    // POST /api/admin/staff/{staffId}/reset-password (RESET PASSWORD)
    // =========================================================================
    @Nested
    @DisplayName("POST /api/admin/staff/{staffId}/reset-password")
    class ResetPasswordEndpointTests {

        @Test
        @DisplayName("Should return 200 OK and initiate setup link when valid")
        void resetPassword_Success() throws Exception {
            doNothing().when(staffManagementService).validateAdminCanResetPassword(SAMPLE_STAFF_ID);
            doNothing().when(staffPasswordSetupService).createSetupLink(SAMPLE_STAFF_ID);

            mockMvc.perform(post(BASE_URL + "/" + SAMPLE_STAFF_ID + "/reset-password"))
                    .andExpect(status().isOk())
                    .andExpect(content().string(containsString("Password setup link has been sent")));

            verify(staffManagementService).validateAdminCanResetPassword(SAMPLE_STAFF_ID);
            verify(staffPasswordSetupService).createSetupLink(SAMPLE_STAFF_ID);
        }

        @Test
        @DisplayName("Should return 400 Bad Request when admin attempts to reset another admin's password")
        void resetPassword_RejectsOtherAdmin() throws Exception {
            doThrow(new IllegalArgumentException("Administrators cannot reset the password of other administrators."))
                    .when(staffManagementService).validateAdminCanResetPassword(SAMPLE_STAFF_ID);

            mockMvc.perform(post(BASE_URL + "/" + SAMPLE_STAFF_ID + "/reset-password"))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.code", is("BAD_REQUEST")))
                    .andExpect(jsonPath("$.message", containsString("Administrators cannot reset the password of other administrators.")));

            verify(staffPasswordSetupService, never()).createSetupLink(any());
        }
    }
}
