package com.corebanking.security.audit.service;

import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.Customers;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.repository.AuditLogsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.security.audit.dto.AuditSearchCriteria;
import com.corebanking.security.audit.specification.AuditSearchSpecification;
import com.corebanking.security.audit.util.AuditContextUtil;
//import com.fasterxml.jackson.databind.ObjectMapper;
import tools.jackson.databind.json.JsonMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Production implementation of {@link AuditTrailService}.
 * <p>
 * Ensures immutable, insert-only audit persistence with isolated transactions
 * (Propagation.REQUIRES_NEW) and defensive error handling so banking operations
 * never fail due to internal auditing logging issues.
 * </p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuditTrailServiceImpl implements AuditTrailService {

    private final AuditLogsRepository auditLogsRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final CustomerRepository customerRepository;
    //private final ObjectMapper objectMapper;
    private final JsonMapper objectMapper;

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logDataChange(String actionType, String entityType, String entityId, Object oldEntity, Object newEntity, String description) {
        try {
            ActorType actorType = AuditContextUtil.resolveActorType();
            StaffUsers staff = resolveStaffActor(actorType);
            Customers customer = resolveCustomerActor(actorType);

            AuditLogs auditLog = AuditLogs.builder()
                    .actorType(actorType)
                    .actorStaff(staff)
                    .actorCustomer(customer)
                    .actionCategory(inferActionCategory(actionType, entityType))
                    .actionType(actionType != null ? actionType : "UNKNOWN_ACTION")
                    .entityType(entityType != null ? entityType : "UNKNOWN_ENTITY")
                    .entityId(entityId)
                    .description(description)
                    .requestUrl(AuditContextUtil.getRequestUrl())
                    .oldValues(serializeToJson(oldEntity))
                    .newValues(serializeToJson(newEntity))
                    .ipAddress(AuditContextUtil.getClientIpAddress())
                    .userAgent(AuditContextUtil.getUserAgent())
                    .requestId(AuditContextUtil.getRequestId())
                    .createdAt(LocalDateTime.now())
                    .build();

            auditLogsRepository.save(auditLog);
            log.debug("Audit data change logged successfully: action={}, entity={}:{}", actionType, entityType, entityId);
        } catch (Throwable t) {
            log.error("DEFENSIVE AUDIT FAILURE: Could not persist data change audit log for entity [{}:{}]: {}",
                    entityType, entityId, t.getMessage(), t);
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logActivity(String actionCategory, String actionType, String description) {
        logActivity(actionCategory, actionType, null, null, description);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logActivity(String actionCategory, String actionType, String entityType, String entityId, String description) {
        try {
            ActorType actorType = AuditContextUtil.resolveActorType();
            StaffUsers staff = resolveStaffActor(actorType);
            Customers customer = resolveCustomerActor(actorType);

            AuditLogs auditLog = AuditLogs.builder()
                    .actorType(actorType)
                    .actorStaff(staff)
                    .actorCustomer(customer)
                    .actionCategory(actionCategory != null ? actionCategory : "GENERAL")
                    .actionType(actionType != null ? actionType : "ACTIVITY")
                    .entityType(entityType != null ? entityType : "SYSTEM")
                    .entityId(entityId)
                    .description(description)
                    .requestUrl(AuditContextUtil.getRequestUrl())
                    .ipAddress(AuditContextUtil.getClientIpAddress())
                    .userAgent(AuditContextUtil.getUserAgent())
                    .requestId(AuditContextUtil.getRequestId())
                    .createdAt(LocalDateTime.now())
                    .build();

            auditLogsRepository.save(auditLog);
            log.debug("Audit activity logged successfully: category={}, action={}", actionCategory, actionType);
        } catch (Throwable t) {
            log.error("DEFENSIVE AUDIT FAILURE: Could not persist activity audit log [{}:{}]: {}",
                    actionCategory, actionType, t.getMessage(), t);
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logDirect(AuditLogs auditLog) {
        if (auditLog == null) {
            return;
        }
        try {
            auditLogsRepository.save(auditLog);
            log.debug("Direct audit log entry saved: ID={}", auditLog.getAuditId());
        } catch (Throwable t) {
            log.error("DEFENSIVE AUDIT FAILURE: Could not persist direct audit log entry: {}", t.getMessage(), t);
        }
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(readOnly = true)
    public Page<AuditLogs> searchAuditLogs(AuditSearchCriteria criteria, Pageable pageable) {
        Specification<AuditLogs> spec = AuditSearchSpecification.build(criteria);
        return auditLogsRepository.findAll(spec, pageable);
    }

    private StaffUsers resolveStaffActor(ActorType actorType) {
        if (actorType != ActorType.STAFF) {
            return null;
        }
        try {
            Optional<String> usernameOpt = AuditContextUtil.getCurrentStaffUsername();
            if (usernameOpt.isPresent()) {
                return staffUsersRepository.findByUsername(usernameOpt.get()).orElse(null);
            }
        } catch (Exception e) {
            log.trace("Error resolving StaffUsers actor: {}", e.getMessage());
        }
        return null;
    }

    private Customers resolveCustomerActor(ActorType actorType) {
        if (actorType != ActorType.CUSTOMER) {
            return null;
        }
        try {
            Optional<UUID> customerUuidOpt = AuditContextUtil.getCurrentCustomerUuid();
            if (customerUuidOpt.isPresent()) {
                return customerRepository.findById(customerUuidOpt.get()).orElse(null);
            }
        } catch (Exception e) {
            log.trace("Error resolving Customers actor: {}", e.getMessage());
        }
        return null;
    }

    private String serializeToJson(Object obj) {
        if (obj == null) {
            return null;
        }
        if (obj instanceof String str) {
            return str;
        }
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            log.warn("Audit serialization warning for object type {}: {}", obj.getClass().getName(), e.getMessage());
            return "{\"raw\":\"" + String.valueOf(obj).replace("\"", "\\\"") + "\"}";
        }
    }

    private String inferActionCategory(String actionType, String entityType) {
        if (actionType != null) {
            String upper = actionType.toUpperCase();
            if (upper.contains("LOGIN") || upper.contains("AUTH") || upper.contains("PASSWORD") || upper.contains("ROLE") || upper.contains("PERMISSION")) {
                return "SECURITY";
            }
            if (upper.contains("TRANSFER") || upper.contains("PAYMENT") || upper.contains("DEPOSIT") || upper.contains("WITHDRAW")) {
                return "TRANSACTION";
            }
            if (upper.contains("ACCOUNT") || upper.contains("HOLD") || upper.contains("SIGNATORY")) {
                return "ACCOUNT";
            }
            if (upper.contains("CUSTOMER") || upper.contains("PROFILE") || upper.contains("KYC")) {
                return "CUSTOMER";
            }
        }
        if (entityType != null) {
            String upper = entityType.toUpperCase();
            if (upper.contains("AUTH") || upper.contains("STAFF") || upper.contains("ROLE")) {
                return "SECURITY";
            }
            if (upper.contains("ACCOUNT")) {
                return "ACCOUNT";
            }
            if (upper.contains("TRANSACTION")) {
                return "TRANSACTION";
            }
        }
        return "GENERAL";
    }
}
