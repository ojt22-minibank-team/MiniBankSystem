package com.corebanking.service;

import com.corebanking.dto.FeeScheduleCreateRequest;
import com.corebanking.dto.FeeScheduleResponse;
import com.corebanking.dto.FeeScheduleUpdateRequest;
import com.corebanking.entity.FeeSchedules;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.FeeType;
import com.corebanking.entity.enums.TransactionType;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Fee Schedules Unit Tests - Service Layer")
class FeeScheduleServiceTest {

    @Mock
    private SystemParametersRepository systemParametersRepository;

    @Mock
    private FeeSchedulesRepository feeSchedulesRepository;

    @Mock
    private StaffUsersRepository staffUsersRepository;

    @InjectMocks
    private SystemRulesConfigService systemRulesConfigService;

    private StaffUsers adminStaff;
    private FeeScheduleCreateRequest createRequest;

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

        createRequest = new FeeScheduleCreateRequest();
        createRequest.setFeeCode("FEE-P2P-PERCENT");
        createRequest.setTransactionType(TransactionType.INTERNAL_TRANSFER);
        createRequest.setFeeType(FeeType.PERCENTAGE);
        createRequest.setFeeValue(new BigDecimal("0.0150")); // 1.5%
        createRequest.setMinimumFee(new BigDecimal("500.0000"));
        createRequest.setMaximumFee(new BigDecimal("10000.0000"));
        createRequest.setCurrency("mmk");
        createRequest.setActiveFrom(LocalDateTime.now().minusDays(1));
        createRequest.setActiveUntil(LocalDateTime.now().plusMonths(6));
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Should successfully create a new Fee Schedule")
    void createFee_Success() {
        when(feeSchedulesRepository.existsByFeeCodeIgnoreCase("FEE-P2P-PERCENT")).thenReturn(false);
        when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));

        FeeSchedules savedFee = FeeSchedules.builder()
                .feeScheduleId(1)
                .feeCode("FEE-P2P-PERCENT")
                .transactionType(TransactionType.INTERNAL_TRANSFER)
                .feeType(FeeType.PERCENTAGE)
                .feeValue(new BigDecimal("0.0150"))
                .minimumFee(new BigDecimal("500.0000"))
                .maximumFee(new BigDecimal("10000.0000"))
                .currency("MMK")
                .activeFrom(createRequest.getActiveFrom())
                .activeUntil(createRequest.getActiveUntil())
                .isActive(true)
                .createdByStaff(adminStaff)
                .updatedById(STAFF_UUID)
                .updatedByType(UpdatedByType.STAFF)
                .build();

        when(feeSchedulesRepository.save(any(FeeSchedules.class))).thenReturn(savedFee);

        FeeScheduleResponse response = systemRulesConfigService.createFee(createRequest);

        assertNotNull(response);
        assertEquals("FEE-P2P-PERCENT", response.getFeeCode());
        assertEquals(TransactionType.INTERNAL_TRANSFER, response.getTransactionType());
        assertEquals(FeeType.PERCENTAGE, response.getFeeType());
        assertEquals(new BigDecimal("0.0150"), response.getFeeValue());
        assertEquals("MMK", response.getCurrency());
        assertTrue(response.isActive());
        assertEquals(STAFF_UUID, response.getCreatedByStaffId());
        verify(feeSchedulesRepository).save(any(FeeSchedules.class));
    }

    @Test
    @DisplayName("Should throw RuntimeException if fee code already exists")
    void createFee_ThrowsException_WhenCodeExists() {
        when(feeSchedulesRepository.existsByFeeCodeIgnoreCase("FEE-P2P-PERCENT")).thenReturn(true);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> systemRulesConfigService.createFee(createRequest));
        assertTrue(ex.getMessage().contains("Fee code already exists: FEE-P2P-PERCENT"));
        verify(feeSchedulesRepository, never()).save(any());
    }

    @Test
    @DisplayName("Should throw RuntimeException if fee value is negative")
    void createFee_ThrowsException_WhenFeeValueNegative() {
        createRequest.setFeeValue(new BigDecimal("-1.0"));
        when(feeSchedulesRepository.existsByFeeCodeIgnoreCase(anyString())).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> systemRulesConfigService.createFee(createRequest));
        assertEquals("Fee value cannot be negative", ex.getMessage());
    }

    @Test
    @DisplayName("Should throw RuntimeException if minimum fee is negative")
    void createFee_ThrowsException_WhenMinFeeNegative() {
        createRequest.setMinimumFee(new BigDecimal("-100.0"));
        when(feeSchedulesRepository.existsByFeeCodeIgnoreCase(anyString())).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> systemRulesConfigService.createFee(createRequest));
        assertEquals("Minimum fee cannot be negative", ex.getMessage());
    }

    @Test
    @DisplayName("Should throw RuntimeException if maximum fee is negative")
    void createFee_ThrowsException_WhenMaxFeeNegative() {
        createRequest.setMaximumFee(new BigDecimal("-100.0"));
        when(feeSchedulesRepository.existsByFeeCodeIgnoreCase(anyString())).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> systemRulesConfigService.createFee(createRequest));
        assertEquals("Maximum fee cannot be negative", ex.getMessage());
    }

    @Test
    @DisplayName("Should throw RuntimeException if minimum fee is greater than maximum fee")
    void createFee_ThrowsException_WhenMinGreaterThanMax() {
        createRequest.setMinimumFee(new BigDecimal("10000.0"));
        createRequest.setMaximumFee(new BigDecimal("500.0"));
        when(feeSchedulesRepository.existsByFeeCodeIgnoreCase(anyString())).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> systemRulesConfigService.createFee(createRequest));
        assertEquals("Minimum fee cannot be greater than maximum fee", ex.getMessage());
    }

    @Test
    @DisplayName("Should throw RuntimeException if activeUntil is before activeFrom")
    void createFee_ThrowsException_WhenActiveUntilBeforeActiveFrom() {
        createRequest.setActiveFrom(LocalDateTime.now().plusDays(5));
        createRequest.setActiveUntil(LocalDateTime.now().plusDays(2));
        when(feeSchedulesRepository.existsByFeeCodeIgnoreCase(anyString())).thenReturn(false);

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> systemRulesConfigService.createFee(createRequest));
        assertEquals("Active until cannot be before active from", ex.getMessage());
    }

    @Test
    @DisplayName("Should return all fee schedules")
    void getAllFees_ReturnsList() {
        FeeSchedules fee = FeeSchedules.builder()
                .feeScheduleId(1)
                .feeCode("FEE-OTC-FLAT")
                .transactionType(TransactionType.OTC_DEPOSIT)
                .feeType(FeeType.FLAT)
                .feeValue(new BigDecimal("1000.0000"))
                .currency("MMK")
                .isActive(true)
                .build();

        when(feeSchedulesRepository.findAll()).thenReturn(List.of(fee));

        List<FeeScheduleResponse> responses = systemRulesConfigService.getAllFees();

        assertEquals(1, responses.size());
        assertEquals("FEE-OTC-FLAT", responses.get(0).getFeeCode());
    }

    @Test
    @DisplayName("Should return fee schedule by ID when found")
    void getFeeById_Success() {
        FeeSchedules fee = FeeSchedules.builder()
                .feeScheduleId(10)
                .feeCode("FEE-WITHDRAWAL")
                .transactionType(TransactionType.OTC_WITHDRAWAL)
                .feeType(FeeType.FLAT)
                .feeValue(new BigDecimal("500.0000"))
                .currency("MMK")
                .isActive(true)
                .build();

        when(feeSchedulesRepository.findById(10)).thenReturn(Optional.of(fee));

        FeeScheduleResponse response = systemRulesConfigService.getFeeById(10);

        assertNotNull(response);
        assertEquals(10, response.getFeeScheduleId());
        assertEquals("FEE-WITHDRAWAL", response.getFeeCode());
    }

    @Test
    @DisplayName("Should throw RuntimeException when fee schedule not found by ID")
    void getFeeById_ThrowsException_WhenNotFound() {
        when(feeSchedulesRepository.findById(99)).thenReturn(Optional.empty());

        RuntimeException ex = assertThrows(RuntimeException.class,
                () -> systemRulesConfigService.getFeeById(99));
        assertTrue(ex.getMessage().contains("Fee schedule not found: 99"));
    }

    @Test
    @DisplayName("Should update fee schedule details successfully")
    void updateFee_Success() {
        FeeScheduleUpdateRequest updateRequest = new FeeScheduleUpdateRequest();
        updateRequest.setTransactionType(TransactionType.OTC_WITHDRAWAL);
        updateRequest.setFeeType(FeeType.FLAT);
        updateRequest.setFeeValue(new BigDecimal("1500.0000"));
        updateRequest.setCurrency("usd");
        updateRequest.setActiveFrom(LocalDateTime.now().minusDays(1));

        FeeSchedules existingFee = FeeSchedules.builder()
                .feeScheduleId(1)
                .feeCode("FEE-WITHDRAWAL")
                .transactionType(TransactionType.OTC_WITHDRAWAL)
                .feeType(FeeType.FLAT)
                .feeValue(new BigDecimal("1000.0000"))
                .currency("MMK")
                .isActive(true)
                .build();

        when(feeSchedulesRepository.findById(1)).thenReturn(Optional.of(existingFee));
        when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));
        when(feeSchedulesRepository.save(any(FeeSchedules.class))).thenAnswer(inv -> inv.getArgument(0));

        FeeScheduleResponse response = systemRulesConfigService.updateFee(1, updateRequest);

        assertNotNull(response);
        assertEquals(new BigDecimal("1500.0000"), response.getFeeValue());
        assertEquals("USD", response.getCurrency());
        assertEquals(STAFF_UUID, response.getUpdatedById());
        verify(feeSchedulesRepository).save(existingFee);
    }

    @Test
    @DisplayName("Should activate a fee schedule")
    void activateFee_Success() {
        FeeSchedules existingFee = FeeSchedules.builder()
                .feeScheduleId(1)
                .feeCode("FEE-INACTIVE")
                .isActive(false)
                .build();

        when(feeSchedulesRepository.findById(1)).thenReturn(Optional.of(existingFee));
        when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));
        when(feeSchedulesRepository.save(any(FeeSchedules.class))).thenAnswer(inv -> inv.getArgument(0));

        FeeScheduleResponse response = systemRulesConfigService.activateFee(1);

        assertNotNull(response);
        assertTrue(response.isActive());
        assertTrue(existingFee.isActive());
        verify(feeSchedulesRepository).save(existingFee);
    }

    @Test
    @DisplayName("Should deactivate a fee schedule")
    void deactivateFee_Success() {
        FeeSchedules existingFee = FeeSchedules.builder()
                .feeScheduleId(1)
                .feeCode("FEE-ACTIVE")
                .isActive(true)
                .build();

        when(feeSchedulesRepository.findById(1)).thenReturn(Optional.of(existingFee));
        when(staffUsersRepository.findByUsername(ADMIN_USERNAME)).thenReturn(Optional.of(adminStaff));
        when(feeSchedulesRepository.save(any(FeeSchedules.class))).thenAnswer(inv -> inv.getArgument(0));

        FeeScheduleResponse response = systemRulesConfigService.deactivateFee(1);

        assertNotNull(response);
        assertFalse(response.isActive());
        assertFalse(existingFee.isActive());
        verify(feeSchedulesRepository).save(existingFee);
    }
}
