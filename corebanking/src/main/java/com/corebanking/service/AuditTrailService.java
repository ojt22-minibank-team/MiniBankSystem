package com.corebanking.service;

import com.corebanking.dto.AuditSearchCriteria;
import com.corebanking.entity.AuditLogs;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * High-performance, immutable Audit Trail Service interface for the Core Banking platform.
 * <p>
 * Provides decoupled methods to capture security activities, state changes,
 * and paginated queries across the system. All audit recording operations are guaranteed
 * to be atomic, isolated, and insert-only.
 * </p>
 */
public interface AuditTrailService {

    /**
     * Records a transactional data mutation event with JSON serialization of before-and-after entity states.
     *
     * @param actionType  specific business action code (e.g. CREATE_ACCOUNT, UPDATE_STATUS, BALANCE_ADJUSTMENT)
     * @param entityType  affected domain entity type (e.g. ACCOUNT, CUSTOMER, TRANSACTION)
     * @param entityId    identifier of the affected domain entity
     * @param oldEntity   previous state object before modification (serialized to JSON, nullable)
     * @param newEntity   new state object after modification (serialized to JSON, nullable)
     * @param description human-readable summary of the modification
     */
    void logDataChange(String actionType, String entityType, String entityId, Object oldEntity, Object newEntity, String description);

    /**
     * Records a functional system or user activity event without entity state diffs.
     *
     * @param actionCategory high-level functional domain category (e.g. SECURITY, ACCOUNT, TRANSACTION, SYSTEM)
     * @param actionType     specific action code (e.g. LOGIN_SUCCESS, LOGOUT, PASSWORD_CHANGE_REQUEST)
     * @param description    human-readable summary of the activity
     */
    void logActivity(String actionCategory, String actionType, String description);

    /**
     * Records a functional activity event associated with a specific domain entity.
     *
     * @param actionCategory high-level functional domain category (e.g. SECURITY, ACCOUNT, TRANSACTION)
     * @param actionType     specific action code (e.g. VIEW_STATEMENT, EXPORT_REPORT)
     * @param entityType     affected domain entity type
     * @param entityId       affected domain entity identifier
     * @param description    human-readable summary of the activity
     */
    void logActivity(String actionCategory, String actionType, String entityType, String entityId, String description);

    /**
     * Directly persists an externally assembled {@link AuditLogs} entry in an isolated transaction.
     *
     * @param auditLog fully populated immutable audit log entity
     */
    void logDirect(AuditLogs auditLog);

    /**
     * Executes dynamic, paginated search queries over the immutable audit trail.
     *
     * @param criteria dynamic search filter criteria
     * @param pageable pagination and sorting parameters
     * @return paginated matching audit trail entries
     */
    Page<AuditLogs> searchAuditLogs(AuditSearchCriteria criteria, Pageable pageable);
}
