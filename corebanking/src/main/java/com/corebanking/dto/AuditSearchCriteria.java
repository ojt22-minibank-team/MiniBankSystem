package com.corebanking.dto;

import com.corebanking.entity.enums.ActorType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Criteria DTO for filtering and querying the Immutable Audit Trail.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditSearchCriteria {

    /**
     * Optional staff user UUID.
     */
    private UUID staffId;

    /**
     * Optional staff username or employee number.
     */
    private String staffUsername;

    /**
     * Optional customer UUID.
     */
    private UUID customerId;

    /**
     * Optional actor category (STAFF, CUSTOMER, SYSTEM, GUEST).
     */
    private ActorType actorType;

    /**
     * Functional domain category (e.g. SECURITY, ACCOUNT, TRANSACTION, SYSTEM).
     */
    private String actionCategory;

    /**
     * Specific action code (e.g. CREATE_ACCOUNT, TRANSFER_FUNDS).
     */
    private String actionType;

    /**
     * Affected entity type (e.g. ACCOUNT, TRANSACTION, CUSTOMER).
     */
    private String entityType;

    /**
     * Target entity identifier.
     */
    private String entityId;

    /**
     * Client IP address filter.
     */
    private String ipAddress;

    /**
     * Start of creation date/time window.
     */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime startDate;

    /**
     * End of creation date/time window.
     */
    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
    private LocalDateTime endDate;
}
