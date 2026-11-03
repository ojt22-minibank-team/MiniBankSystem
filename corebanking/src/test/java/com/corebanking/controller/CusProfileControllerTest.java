package com.corebanking.controller;

import com.corebanking.dto.CusProfileResponseDTO;
import com.corebanking.dto.CusProfileUpdateDTO;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.CusProfileService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;

import static org.hamcrest.Matchers.is;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("CusProfileController Unit Tests")
class CusProfileControllerTest {

    private static final String PROFILE_URL = "/api/customer/profile";
    private static final String PROFILE_IMAGE_URL = "/api/customer/profile/image";

    @Mock
    private CusProfileService customerProfileService;

    @InjectMocks
    private CusProfileController profileController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(profileController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper();
    }

    private CusProfileResponseDTO buildSampleProfileResponse() {
        return CusProfileResponseDTO.builder()
                .customerCode("CUS-2026-0002")
                .customerType("INDIVIDUAL")
                .status("ACTIVE")
                .firstName("Thiri")
                .lastName("Win")
                .dateOfBirth(LocalDate.of(1995, 5, 20))
                .gender("FEMALE")
                .nrc("12/DAGAMA(N)123456")
                .passportNumber("MM1234567")
                .email("thiri@example.com")
                .phone("09123456789")
                .occupation("Software Engineer")
                .address("No. 12, Strand Road")
                .city("Yangon")
                .stateRegion("Yangon Region")
                .country("Myanmar")
                .profileImageUrl("https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg")
                .build();
    }

    // -------------------------------------------------------------------------
    // GET /api/customer/profile
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("GET /api/customer/profile - Returns 200 OK with profile response DTO")
    void getMyProfile_Success_Returns200() throws Exception {
        CusProfileResponseDTO responseDTO = buildSampleProfileResponse();
        when(customerProfileService.getMyProfile()).thenReturn(responseDTO);

        mockMvc.perform(get(PROFILE_URL)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.customerCode", is("CUS-2026-0002")))
                .andExpect(jsonPath("$.customerType", is("INDIVIDUAL")))
                .andExpect(jsonPath("$.status", is("ACTIVE")))
                .andExpect(jsonPath("$.firstName", is("Thiri")))
                .andExpect(jsonPath("$.lastName", is("Win")))
                .andExpect(jsonPath("$.email", is("thiri@example.com")))
                .andExpect(jsonPath("$.phone", is("09123456789")))
                .andExpect(jsonPath("$.city", is("Yangon")))
                .andExpect(jsonPath("$.country", is("Myanmar")))
                .andExpect(jsonPath("$.profileImageUrl", is("https://res.cloudinary.com/demo/image/upload/v1/avatar.jpg")));

        verify(customerProfileService, times(1)).getMyProfile();
    }

    @Test
    @DisplayName("GET /api/customer/profile - Returns 500 when customer service throws RuntimeException")
    void getMyProfile_CustomerNotFound_Returns500() throws Exception {
        when(customerProfileService.getMyProfile())
                .thenThrow(new RuntimeException("Customer not found."));

        mockMvc.perform(get(PROFILE_URL)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code", is("INTERNAL_SERVER_ERROR")))
                .andExpect(jsonPath("$.message", is("Customer not found.")));

        verify(customerProfileService, times(1)).getMyProfile();
    }

    // -------------------------------------------------------------------------
    // PUT /api/customer/profile
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("PUT /api/customer/profile - Returns 200 OK with updated profile DTO")
    void updateMyProfile_Success_Returns200() throws Exception {
        CusProfileUpdateDTO updateDTO = new CusProfileUpdateDTO();
        updateDTO.setAddress("No. 99, Pyay Road");
        updateDTO.setCity("Mandalay");
        updateDTO.setStateRegion("Mandalay Region");
        updateDTO.setCountry("Myanmar");

        CusProfileResponseDTO responseDTO = buildSampleProfileResponse();
        responseDTO.setAddress("No. 99, Pyay Road");
        responseDTO.setCity("Mandalay");
        responseDTO.setStateRegion("Mandalay Region");

        when(customerProfileService.updateMyProfile(any(CusProfileUpdateDTO.class))).thenReturn(responseDTO);

        mockMvc.perform(put(PROFILE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDTO)))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.address", is("No. 99, Pyay Road")))
                .andExpect(jsonPath("$.city", is("Mandalay")))
                .andExpect(jsonPath("$.stateRegion", is("Mandalay Region")));

        verify(customerProfileService, times(1)).updateMyProfile(any(CusProfileUpdateDTO.class));
    }

    @Test
    @DisplayName("PUT /api/customer/profile - Returns 500 when service fails during update")
    void updateMyProfile_ThrowsException_Returns500() throws Exception {
        CusProfileUpdateDTO updateDTO = new CusProfileUpdateDTO();
        updateDTO.setCity("Mandalay");

        when(customerProfileService.updateMyProfile(any(CusProfileUpdateDTO.class)))
                .thenThrow(new RuntimeException("Customer authentication is required."));

        mockMvc.perform(put(PROFILE_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDTO)))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code", is("INTERNAL_SERVER_ERROR")))
                .andExpect(jsonPath("$.message", is("Customer authentication is required.")));

        verify(customerProfileService, times(1)).updateMyProfile(any(CusProfileUpdateDTO.class));
    }

    // -------------------------------------------------------------------------
    // POST /api/customer/profile/image
    // -------------------------------------------------------------------------

    @Test
    @DisplayName("POST /api/customer/profile/image - Returns 200 OK with updated profileImageUrl")
    void uploadProfileImage_Success_Returns200() throws Exception {
        MockMultipartFile mockFile = new MockMultipartFile(
                "file",
                "profile.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-image-bytes".getBytes()
        );

        CusProfileResponseDTO responseDTO = buildSampleProfileResponse();
        responseDTO.setProfileImageUrl("https://res.cloudinary.com/demo/image/upload/v2/new-avatar.jpg");

        when(customerProfileService.updateProfileImage(any(MultipartFile.class))).thenReturn(responseDTO);

        mockMvc.perform(multipart(PROFILE_IMAGE_URL)
                        .file(mockFile))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.profileImageUrl", is("https://res.cloudinary.com/demo/image/upload/v2/new-avatar.jpg")));

        verify(customerProfileService, times(1)).updateProfileImage(any(MultipartFile.class));
    }

    @Test
    @DisplayName("POST /api/customer/profile/image - Returns 500 when Cloudinary upload throws RuntimeException")
    void uploadProfileImage_Error_Returns500() throws Exception {
        MockMultipartFile mockFile = new MockMultipartFile(
                "file",
                "profile.jpg",
                MediaType.IMAGE_JPEG_VALUE,
                "fake-image-bytes".getBytes()
        );

        when(customerProfileService.updateProfileImage(any(MultipartFile.class)))
                .thenThrow(new RuntimeException("Failed to upload profile image."));

        mockMvc.perform(multipart(PROFILE_IMAGE_URL)
                        .file(mockFile))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code", is("INTERNAL_SERVER_ERROR")))
                .andExpect(jsonPath("$.message", is("Failed to upload profile image.")));

        verify(customerProfileService, times(1)).updateProfileImage(any(MultipartFile.class));
    }
}
