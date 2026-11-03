package com.corebanking.service;

import com.corebanking.dto.AuditSearchCriteria;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.Customers;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.repository.AuditLogsRepository;
import com.corebanking.repository.AuditSearchSpecification;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.security.JwtService;
import com.corebanking.util.AuditContextUtil;
import jakarta.servlet.http.HttpServletRequest;
import tools.jackson.databind.json.JsonMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
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
public class AuditTrailServiceImpl implements AuditTrailService {

    private final AuditLogsRepository auditLogsRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final CustomerRepository customerRepository;
    private final JsonMapper objectMapper;
    private final JwtService jwtService;

    @Autowired
    public AuditTrailServiceImpl(
            AuditLogsRepository auditLogsRepository,
            StaffUsersRepository staffUsersRepository,
            CustomerRepository customerRepository,
            JsonMapper objectMapper,
            @Autowired(required = false) JwtService jwtService) {
        this.auditLogsRepository = auditLogsRepository;
        this.staffUsersRepository = staffUsersRepository;
        this.customerRepository = customerRepository;
        this.objectMapper = objectMapper;
        this.jwtService = jwtService;
    }

    public AuditTrailServiceImpl(
            AuditLogsRepository auditLogsRepository,
            StaffUsersRepository staffUsersRepository,
            CustomerRepository customerRepository,
            JsonMapper objectMapper) {
        this(auditLogsRepository, staffUsersRepository, customerRepository, objectMapper, null);
    }

    /**
     * {@inheritDoc}
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logDataChange(String actionCategory, String actionType, String entityType, String entityId, Object oldEntity, Object newEntity, String description) {
        try {
            ActorType actorType = AuditContextUtil.resolveActorType();
            StaffUsers staff = resolveStaffActor(actorType);
            Customers customer = resolveCustomerActor(actorType);

            String resolvedCategory = (actionCategory != null && !actionCategory.isBlank())
                    ? actionCategory
                    : inferActionCategory(actionType, entityType);

            AuditLogs auditLog = AuditLogs.builder()
                    .actorType(actorType)
                    .actorStaff(staff)
                    .actorCustomer(customer)
                    .actionCategory(resolvedCategory)
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

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void logDataChange(String actionType, String entityType, String entityId, Object oldEntity, Object newEntity, String description) {
        logDataChange(null, actionType, entityType, entityId, oldEntity, newEntity, description);
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
            if (usernameOpt.isPresent() && !usernameOpt.get().isBlank()) {
                Optional<StaffUsers> staffOpt = staffUsersRepository.findByUsername(usernameOpt.get());
                if (staffOpt.isPresent()) {
                    return staffOpt.get();
                }
                try {
                    UUID uuid = UUID.fromString(usernameOpt.get());
                    Optional<StaffUsers> staffById = staffUsersRepository.findById(uuid);
                    if (staffById.isPresent()) {
                        return staffById.get();
                    }
                } catch (Exception ignored) {
                }
            }

            // Fallback: If not in SecurityContext, check the active HTTP request Authorization header
            if (jwtService != null) {
                Optional<HttpServletRequest> requestOpt = AuditContextUtil.getCurrentHttpRequest();
                if (requestOpt.isPresent()) {
                    HttpServletRequest req = requestOpt.get();
                    String authHeader = req.getHeader("Authorization");
                    if (authHeader != null && authHeader.startsWith("Bearer ")) {
                        String token = authHeader.substring(7).trim();
                        if (!token.isBlank() && jwtService.isTokenValid(token)) {
                            var claims = jwtService.extractAllClaims(token);
                            String staffIdStr = claims.get("staff_id", String.class);
                            if (staffIdStr != null && !staffIdStr.isBlank()) {
                                try {
                                    UUID staffId = UUID.fromString(staffIdStr);
                                    Optional<StaffUsers> staffById = staffUsersRepository.findById(staffId);
                                    if (staffById.isPresent()) {
                                        return staffById.get();
                                    }
                                } catch (Exception ignored) {}
                            }
                            String sub = claims.getSubject();
                            if (sub != null && !sub.isBlank()) {
                                Optional<StaffUsers> staffBySub = staffUsersRepository.findByUsername(sub);
                                if (staffBySub.isPresent()) {
                                    return staffBySub.get();
                                }
                            }
                        }
                    }
                }
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
            if (upper.contains("LOGIN") || upper.contains("AUTH") || upper.contains("PASSWORD") || upper.contains("ROLE") || upper.contains("PERMISSION") || upper.contains("STAFF")) {
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
            if (upper.contains("PARAM") || upper.contains("FEE") || upper.contains("RULE") || upper.contains("ANNOUNCEMENT")) {
                return "SYSTEM";
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
            if (upper.contains("CUSTOMER")) {
                return "CUSTOMER";
            }
            if (upper.contains("ANNOUNCEMENT") || upper.contains("PARAM") || upper.contains("FEE") || upper.contains("SYSTEM")) {
                return "SYSTEM";
            }
        }
        return "GENERAL";
    }
}
