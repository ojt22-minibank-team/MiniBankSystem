package com.corebanking.service;

import com.corebanking.dto.SystemParameterCreateRequest;
import com.corebanking.dto.SystemParameterResponse;
import com.corebanking.dto.SystemParameterUpdateRequest;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.SystemParameters;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.repository.FeeSchedulesRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.repository.SystemParametersRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("System Parameters Unit Tests - Service Layer")
class SystemParameterServiceTest {

    @Mock
    private SystemParametersRepository systemParametersRepository;

    @Mock
    private FeeSchedulesRepository feeSchedulesRepository;

    @Mock
    private StaffUsersRepository staffUsersRepository;

    @InjectMocks
    private SystemRulesConfigService systemRulesConfigService;

    private StaffUsers adminStaff;
    private static final UUID STAFF_UUID = UUID.fromString("11111111-2222-3333-4444-555555555555");
    private static final String ADMIN_USERNAME = "admin_user";

    @BeforeEach
    void setUp() {
        adminStaff = StaffUsers.builder()
                .staffId(STAFF_UUID)
                .username(ADMIN_USERNAME)
                .fullName("System Administrator")
                .build();

        Authentication auth = mock(Authentication.class);
        lenient().when(auth.getName()).thenReturn(ADMIN_USERNAME);

        SecurityContext securityContext = mock(SecurityContext.class);
        lenient().when(securityContext.getAuthentication()).thenReturn(auth);
        SecurityContextHolder.setContext(securityContext);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Should successfully create a new system parameter")
    void createParameter_Success() {
        SystemParameterCreateRequest request = new SystemParameterCreateRequest();
        request.setParameterKey("MAX_DAILY_TRANSFER_LIMIT");
        request.setParameterValue("50000000");
        request.setDescription("Daily transfer limit for standard accounts");

        when(systemParametersRepository.existsByParameterKeyIgnoreCase("MAX_DAILY_TRANSFER_LIMIT")).thenReturn(false);
        when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));

        SystemParameters savedEntity = SystemParameters.builder()
                .parameterId(1)
                .parameterKey("MAX_DAILY_TRANSFER_LIMIT")
                .parameterValue("50000000")
                .description("Daily transfer limit for standard accounts")
                .updatedByStaff(adminStaff)
                .updatedById(STAFF_UUID)
                .updatedByType(UpdatedByType.STAFF)
                .updatedAt(LocalDateTime.now())
                .build();

        when(systemParametersRepository.save(any(SystemParameters.class))).thenReturn(savedEntity);

        SystemParameterResponse response = systemRulesConfigService.createParameter(request);

        assertNotNull(response);
        assertEquals("MAX_DAILY_TRANSFER_LIMIT", response.getParameterKey());
        assertEquals("50000000", response.getParameterValue());
        assertEquals("Daily transfer limit for standard accounts", response.getDescription());
        assertEquals(STAFF_UUID, response.getUpdatedById());
        assertEquals("STAFF", response.getUpdatedByType());
        verify(systemParametersRepository).save(any(SystemParameters.class));
    }

    @Test
    @DisplayName("Should throw RuntimeException if system parameter key already exists")
    void createParameter_ThrowsException_WhenKeyExists() {
        SystemParameterCreateRequest request = new SystemParameterCreateRequest();
        request.setParameterKey("EXISTING_KEY");
        request.setParameterValue("123");

        when(systemParametersRepository.existsByParameterKeyIgnoreCase("EXISTING_KEY")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> systemRulesConfigService.createParameter(request));
        assertTrue(ex.getMessage().contains("System parameter already exists: EXISTING_KEY"));
        verify(systemParametersRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should return all system parameters")
    void getAllParameters_ReturnsList() {
        SystemParameters param1 = SystemParameters.builder()
                .parameterId(1)
                .parameterKey("KEY_ONE")
                .parameterValue("VAL1")
                .build();
        SystemParameters param2 = SystemParameters.builder()
                .parameterId(2)
                .parameterKey("KEY_TWO")
                .parameterValue("VAL2")
                .build();

        when(systemParametersRepository.findAll()).thenReturn(List.of(param1, param2));

        List<SystemParameterResponse> responses = systemRulesConfigService.getAllParameters();

        assertEquals(2, responses.size());
        assertEquals("KEY_ONE", responses.get(0).getParameterKey());
        assertEquals("KEY_TWO", responses.get(1).getParameterKey());
    }

    @Test
    @DisplayName("Should return system parameter by key when found")
    void getParameterByKey_Success() {
        SystemParameters param = SystemParameters.builder()
                .parameterId(1)
                .parameterKey("AUTH_LOCKOUT_TIME")
                .parameterValue("15")
                .description("Lockout duration in minutes")
                .build();

        when(systemParametersRepository.findByParameterKeyIgnoreCase("AUTH_LOCKOUT_TIME"))
                .thenReturn(Optional.of(param));

        SystemParameterResponse response = systemRulesConfigService.getParameterByKey("AUTH_LOCKOUT_TIME");

        assertNotNull(response);
        assertEquals("AUTH_LOCKOUT_TIME", response.getParameterKey());
        assertEquals("15", response.getParameterValue());
    }

    @Test
    @DisplayName("Should throw RuntimeException when system parameter key not found")
    void getParameterByKey_ThrowsException_WhenNotFound() {
        when(systemParametersRepository.findByParameterKeyIgnoreCase("UNKNOWN_KEY"))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> systemRulesConfigService.getParameterByKey("UNKNOWN_KEY"));
        assertTrue(ex.getMessage().contains("System parameter not found: UNKNOWN_KEY"));
    }

    @Test
    @DisplayName("Should update system parameter value and description successfully")
    void updateParameter_Success() {
        SystemParameterUpdateRequest request = new SystemParameterUpdateRequest();
        request.setParameterValue("30");
        request.setDescription("Updated lockout duration to 30 mins");

        SystemParameters existingParam = SystemParameters.builder()
                .parameterId(1)
                .parameterKey("AUTH_LOCKOUT_TIME")
                .parameterValue("15")
                .description("Old description")
                .build();

        when(systemParametersRepository.findByParameterKeyIgnoreCase("AUTH_LOCKOUT_TIME"))
                .thenReturn(Optional.of(existingParam));
        when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));
        when(systemParametersRepository.save(any(SystemParameters.class))).thenAnswer(inv -> inv.getArgument(0));

        SystemParameterResponse response = systemRulesConfigService.updateParameter("AUTH_LOCKOUT_TIME", request);

        assertNotNull(response);
        assertEquals("30", response.getParameterValue());
        assertEquals("Updated lockout duration to 30 mins", response.getDescription());
        assertEquals(STAFF_UUID, response.getUpdatedById());
        verify(systemParametersRepository).save(existingParam);
    }

    @Test
    @DisplayName("Should throw RuntimeException when updating non-existent parameter")
    void updateParameter_ThrowsException_WhenNotFound() {
        SystemParameterUpdateRequest request = new SystemParameterUpdateRequest();
        request.setParameterValue("100");

        when(systemParametersRepository.findByParameterKeyIgnoreCase("NOT_FOUND"))
                .thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> systemRulesConfigService.updateParameter("NOT_FOUND", request));
        assertTrue(ex.getMessage().contains("System parameter not found: NOT_FOUND"));
        verify(systemParametersRepository, never()).save(any());
    }
}
