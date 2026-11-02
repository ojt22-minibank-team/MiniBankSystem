package com.corebanking.dto;

import com.corebanking.entity.AuditLogs;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.regex.Pattern;

/**
 * Secure Response Data Transfer Object representing an immutable audit log entry.
 * <p>
 * Masks sensitive authentication credentials (passwords, PINs, secret tokens)
 * and safely projects entity associations for auditor and admin dashboards.
 * </p>
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditLogResponseDto {

    private Long auditId;
    private String actorType;
    private String actorStaffId;
    private String actorStaffUsername;
    private String actorCustomerId;
    private String actionCategory;
    private String actionType;
    private String entityType;
    private String entityId;
    private String description;
    private String requestUrl;
    private String oldValues;
    private String newValues;
    private String ipAddress;
    private String userAgent;
    private String requestId;
    private LocalDateTime createdAt;

    private static final Pattern SENSITIVE_PATTERN = Pattern.compile(
            "\"(password|passwordHash|pin|transactionPin|secret|token|refreshToken)\"\\s*:\\s*\"[^\"]*\"",
            Pattern.CASE_INSENSITIVE
    );

    /**
     * Factory method mapping an {@link AuditLogs} persistent entity to a secure response DTO.
     *
     * @param entity the source audit log entity
     * @return populated and sanitized AuditLogResponseDto
     */
    public static AuditLogResponseDto fromEntity(AuditLogs entity) {
        if (entity == null) {
            return null;
        }

        String staffId = null;
        String staffUsername = null;
        if (entity.getActorStaff() != null) {
            staffId = entity.getActorStaff().getStaffId() != null
                    ? entity.getActorStaff().getStaffId().toString()
                    : null;
            staffUsername = entity.getActorStaff().getUsername();
        }

        String customerId = null;
        if (entity.getActorCustomer() != null) {
            customerId = entity.getActorCustomer().getCustomerId() != null
                    ? entity.getActorCustomer().getCustomerId().toString()
                    : null;
        }

        return AuditLogResponseDto.builder()
                .auditId(entity.getAuditId())
                .actorType(entity.getActorType() != null ? entity.getActorType().name() : null)
                .actorStaffId(staffId)
                .actorStaffUsername(staffUsername)
                .actorCustomerId(customerId)
                .actionCategory(entity.getActionCategory())
                .actionType(entity.getActionType())
                .entityType(entity.getEntityType())
                .entityId(entity.getEntityId())
                .description(entity.getDescription())
                .requestUrl(entity.getRequestUrl())
                .oldValues(maskSensitiveData(entity.getOldValues()))
                .newValues(maskSensitiveData(entity.getNewValues()))
                .ipAddress(entity.getIpAddress())
                .userAgent(entity.getUserAgent())
                .requestId(entity.getRequestId())
                .createdAt(entity.getCreatedAt())
                .build();
    }

    private static String maskSensitiveData(String json) {
        if (json == null || json.isBlank()) {
            return json;
        }
        return SENSITIVE_PATTERN.matcher(json).replaceAll("\"$1\":\"***\"");
    }
}
