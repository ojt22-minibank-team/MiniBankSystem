package com.corebanking.controller;

import com.corebanking.dto.SystemParameterCreateRequest;
import com.corebanking.dto.SystemParameterResponse;
import com.corebanking.dto.SystemParameterUpdateRequest;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.SystemRulesConfigService;
import com.fasterxml.jackson.databind.ObjectMapper;
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

import java.util.List;

import static org.hamcrest.Matchers.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("System Parameters Unit Tests - Controller Layer")
class SystemParameterControllerTest {

    @Mock
    private SystemRulesConfigService systemRulesConfigService;

    @InjectMocks
    private SystemRulesConfigController systemRulesConfigController;

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    private static final String PARAMETERS_URL = "/api/admin/system-rules/parameters";

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders
                .standaloneSetup(systemRulesConfigController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
    }

    @Test
    @DisplayName("POST /parameters should return 201 Created on valid request")
    void createParameter_Success() throws Exception {
        SystemParameterCreateRequest request = new SystemParameterCreateRequest();
        request.setParameterKey("SESSION_TIMEOUT");
        request.setParameterValue("30");
        request.setDescription("Inactivity session timeout in minutes");

        SystemParameterResponse response = SystemParameterResponse.builder()
                .parameterId(1)
                .parameterKey("SESSION_TIMEOUT")
                .parameterValue("30")
                .description("Inactivity session timeout in minutes")
                .build();

        when(systemRulesConfigService.createParameter(any(SystemParameterCreateRequest.class))).thenReturn(response);

        mockMvc.perform(post(PARAMETERS_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.parameterKey", is("SESSION_TIMEOUT")))
                .andExpect(jsonPath("$.parameterValue", is("30")));

        verify(systemRulesConfigService).createParameter(any(SystemParameterCreateRequest.class));
    }

    @Test
    @DisplayName("POST /parameters should return 400 Bad Request on blank parameterKey or parameterValue")
    void createParameter_ValidationErrors() throws Exception {
        SystemParameterCreateRequest invalid = new SystemParameterCreateRequest();
        invalid.setParameterKey("");
        invalid.setParameterValue("");

        mockMvc.perform(post(PARAMETERS_URL)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalid)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code", is("VALIDATION_ERROR")));

        verify(systemRulesConfigService, never()).createParameter(any());
    }

    @Test
    @DisplayName("GET /parameters should return 200 OK and list of parameters")
    void getAllParameters_ReturnsList() throws Exception {
        SystemParameterResponse param = SystemParameterResponse.builder()
                .parameterId(1)
                .parameterKey("APP_NAME")
                .parameterValue("MiniBank")
                .build();

        when(systemRulesConfigService.getAllParameters()).thenReturn(List.of(param));

        mockMvc.perform(get(PARAMETERS_URL))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].parameterKey", is("APP_NAME")));
    }

    @Test
    @DisplayName("GET /parameters/{key} should return 200 OK with parameter details")
    void getParameterByKey_Success() throws Exception {
        SystemParameterResponse param = SystemParameterResponse.builder()
                .parameterId(1)
                .parameterKey("APP_NAME")
                .parameterValue("MiniBank")
                .build();

        when(systemRulesConfigService.getParameterByKey("APP_NAME")).thenReturn(param);

        mockMvc.perform(get(PARAMETERS_URL + "/APP_NAME"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parameterKey", is("APP_NAME")))
                .andExpect(jsonPath("$.parameterValue", is("MiniBank")));
    }

    @Test
    @DisplayName("PUT /parameters/{key} should return 200 OK with updated parameter")
    void updateParameter_Success() throws Exception {
        SystemParameterUpdateRequest updateRequest = new SystemParameterUpdateRequest();
        updateRequest.setParameterValue("60");
        updateRequest.setDescription("Updated timeout");

        SystemParameterResponse response = SystemParameterResponse.builder()
                .parameterId(1)
                .parameterKey("SESSION_TIMEOUT")
                .parameterValue("60")
                .description("Updated timeout")
                .build();

        when(systemRulesConfigService.updateParameter(eq("SESSION_TIMEOUT"), any(SystemParameterUpdateRequest.class)))
                .thenReturn(response);

        mockMvc.perform(put(PARAMETERS_URL + "/SESSION_TIMEOUT")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.parameterValue", is("60")));
    }
}
