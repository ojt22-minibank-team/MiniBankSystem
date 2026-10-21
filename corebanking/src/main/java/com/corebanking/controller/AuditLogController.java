package com.corebanking.controller;

import com.corebanking.dto.AuditLogResponseDto;
import com.corebanking.dto.AuditSearchCriteria;
import com.corebanking.entity.AuditLogs;
import com.corebanking.repository.AuditLogsRepository;
import com.corebanking.service.AuditTrailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for querying and inspecting immutable system audit trail logs.
 * <p>
 * Provides administrative search, multi-criteria filtering, and detailed entity diff inspection.
 * Protected by Spring Security role-based access control (Admin and Auditor only).
 * </p>
 */
@Slf4j
@Validated
@RestController
@RequestMapping("/api/v1/staff/audit-logs")
@RequiredArgsConstructor
public class AuditLogController {

    private final AuditTrailService auditTrailService;
    private final AuditLogsRepository auditLogsRepository;

    /**
     * Search and filter audit logs with dynamic criteria and pagination.
     *
     * @param criteria dynamic filter criteria (staffId, customerId, actionType, category, dates, etc.)
     * @param pageable pagination parameters (defaults to page size 20 sorted by createdAt descending)
     * @return paginated list of audit log response DTOs
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<Page<AuditLogResponseDto>> searchAuditLogs(
            @ModelAttribute AuditSearchCriteria criteria,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        log.debug("Executing audit logs search with criteria: {}", criteria);
        Page<AuditLogs> page = auditTrailService.searchAuditLogs(criteria, pageable);
        Page<AuditLogResponseDto> responsePage = page.map(AuditLogResponseDto::fromEntity);
        return ResponseEntity.ok(responsePage);
    }

    /**
     * Retrieve a single audit log entry by its primary key ID for detailed state diff inspection.
     *
     * @param auditId the primary key identifier of the audit log record
     * @return the audit log response DTO, or 404 Not Found if absent
     */
    @GetMapping("/{auditId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'AUDITOR')")
    public ResponseEntity<AuditLogResponseDto> getAuditLogById(@PathVariable Long auditId) {
        log.debug("Retrieving audit log entry by ID: {}", auditId);
        return auditLogsRepository.findById(auditId)
                .map(AuditLogResponseDto::fromEntity)
                .map(ResponseEntity::ok)
                .orElseGet(() -> {
                    log.warn("Audit log entry not found for ID: {}", auditId);
                    return ResponseEntity.notFound().build();
                });
    }
}
