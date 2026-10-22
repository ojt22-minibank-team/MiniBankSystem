package com.corebanking.service;

import com.corebanking.dto.AuditSearchCriteria;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.repository.AuditLogsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.util.AuditContextUtil;
import tools.jackson.databind.json.JsonMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * High-performance Unit and Functional Test suite for {@link AuditTrailServiceImpl}.
 * Validates immutable logging, JSON serialization, defensive error boundaries,
 * and dynamic search criteria execution.
 */
@ExtendWith(MockitoExtension.class)
class AuditTrailServiceTest {

    @Mock
    private AuditLogsRepository auditLogsRepository;

    @Mock
    private StaffUsersRepository staffUsersRepository;

    @Mock
    private CustomerRepository customerRepository;

    private JsonMapper objectMapper;

    private AuditTrailServiceImpl auditTrailService;

    @org.junit.jupiter.api.BeforeEach
    void setUp() {
        objectMapper = JsonMapper.builder().build();
        auditTrailService = new AuditTrailServiceImpl(
                auditLogsRepository,
                staffUsersRepository,
                customerRepository,
                objectMapper
        );
    }

    @Test
    @DisplayName("Should successfully record data change event with JSON state serialization")
    void logDataChange_Success() {
        Map<String, Object> oldValues = Map.of("status", "ACTIVE", "tier", "SILVER");
        Map<String, Object> newValues = Map.of("status", "FROZEN", "tier", "SILVER");

        auditTrailService.logDataChange(
                "FREEZE_ACCOUNT",
                "ACCOUNT",
                "ACC-100293",
                oldValues,
                newValues,
                "Suspected AML velocity violation"
        );

        ArgumentCaptor<AuditLogs> captor = ArgumentCaptor.forClass(AuditLogs.class);
        verify(auditLogsRepository, times(1)).save(captor.capture());

        AuditLogs captured = captor.getValue();
        assertThat(captured).isNotNull();
        assertThat(captured.getActionCategory()).isEqualTo("ACCOUNT");
        assertThat(captured.getActionType()).isEqualTo("FREEZE_ACCOUNT");
        assertThat(captured.getEntityType()).isEqualTo("ACCOUNT");
        assertThat(captured.getEntityId()).isEqualTo("ACC-100293");
        assertThat(captured.getDescription()).isEqualTo("Suspected AML velocity violation");
        assertThat(captured.getOldValues()).contains("\"status\":\"ACTIVE\"");
        assertThat(captured.getNewValues()).contains("\"status\":\"FROZEN\"");
        assertThat(captured.getCreatedAt()).isNotNull();
    }

    @Test
    @DisplayName("Should gracefully handle and isolate database errors without throwing exceptions")
    void logDataChange_DefensiveBoundary_NoExceptionThrown() {
        when(auditLogsRepository.save(any(AuditLogs.class)))
                .thenThrow(new RuntimeException("Simulated Database Outage / Connection Pool Exhaustion"));

        assertThatCode(() -> auditTrailService.logDataChange(
                "TRANSFER_FUNDS",
                "TRANSACTION",
                "TX-998811",
                Map.of("amount", 5000),
                Map.of("amount", 0),
                "Customer P2P Transfer"
        )).doesNotThrowAnyException();

        verify(auditLogsRepository, times(1)).save(any(AuditLogs.class));
    }

    @Test
    @DisplayName("Should log general activity event with inferred category")
    void logActivity_Success() {
        auditTrailService.logActivity(
                "SECURITY",
                "PASSWORD_RESET_SUCCESS",
                "Customer completed self-service credential reset"
        );

        ArgumentCaptor<AuditLogs> captor = ArgumentCaptor.forClass(AuditLogs.class);
        verify(auditLogsRepository, times(1)).save(captor.capture());

        AuditLogs captured = captor.getValue();
        assertThat(captured).isNotNull();
        assertThat(captured.getActionCategory()).isEqualTo("SECURITY");
        assertThat(captured.getActionType()).isEqualTo("PASSWORD_RESET_SUCCESS");
        assertThat(captured.getDescription()).contains("credential reset");
        assertThat(captured.getOldValues()).isNull();
        assertThat(captured.getNewValues()).isNull();
    }

    @Test
    @DisplayName("Should directly persist pre-constructed audit log instance")
    void logDirect_Success() {
        AuditLogs directLog = AuditLogs.builder()
                .actionCategory("SYSTEM")
                .actionType("MAINTENANCE_WINDOW_START")
                .description("Automated EOD batch processing initiated")
                .actorType(ActorType.SYSTEM)
                .createdAt(LocalDateTime.now())
                .build();

        auditTrailService.logDirect(directLog);

        verify(auditLogsRepository, times(1)).save(directLog);
    }

    @Test
    @DisplayName("Should correctly delegate dynamic search specification to repository")
    @SuppressWarnings("unchecked")
    void searchAuditLogs_DelegatesToRepository() {
        AuditSearchCriteria criteria = AuditSearchCriteria.builder()
                .actionCategory("SECURITY")
                .actionType("ROLE_CHANGE")
                .build();
        Pageable pageable = PageRequest.of(0, 10);

        AuditLogs sampleLog = AuditLogs.builder()
                .auditId(101L)
                .actionCategory("SECURITY")
                .actionType("ROLE_CHANGE")
                .build();
        Page<AuditLogs> expectedPage = new PageImpl<>(List.of(sampleLog), pageable, 1);

        when(auditLogsRepository.findAll(any(Specification.class), eq(pageable))).thenReturn(expectedPage);

        Page<AuditLogs> result = auditTrailService.searchAuditLogs(criteria, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getTotalElements()).isEqualTo(1);
        assertThat(result.getContent().get(0).getAuditId()).isEqualTo(101L);
        verify(auditLogsRepository, times(1)).findAll(any(Specification.class), eq(pageable));
    }

    @Test
    @DisplayName("Should safely handle null inputs in data change logging")
    void logDataChange_NullInputsHandledSafely() {
        assertThatCode(() -> auditTrailService.logDataChange(
                null,
                null,
                null,
                null,
                null,
                null
        )).doesNotThrowAnyException();

        ArgumentCaptor<AuditLogs> captor = ArgumentCaptor.forClass(AuditLogs.class);
        verify(auditLogsRepository, times(1)).save(captor.capture());

        AuditLogs captured = captor.getValue();
        assertThat(captured.getActionType()).isEqualTo("UNKNOWN_ACTION");
        assertThat(captured.getEntityType()).isEqualTo("UNKNOWN_ENTITY");
        assertThat(captured.getActionCategory()).isEqualTo("GENERAL");
    }
}
