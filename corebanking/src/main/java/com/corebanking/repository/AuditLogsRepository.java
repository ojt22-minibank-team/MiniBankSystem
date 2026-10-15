package com.corebanking.repository;

import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.enums.ActorType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * High-performance Repository for {@link AuditLogs}.
 * <p>
 * Provides type-safe querying, dynamic specification execution,
 * and paginated access for the Immutable Banking Audit Trail Engine.
 * </p>
 */
@Repository
public interface AuditLogsRepository extends JpaRepository<AuditLogs, Long>, JpaSpecificationExecutor<AuditLogs> {

    /**
     * Retrieve paginated audit logs matching specification with eager loading of actors.
     *
     * @param spec     search specification
     * @param pageable pagination parameters
     * @return paginated audit entries
     */
    @Override
    @EntityGraph(attributePaths = {"actorStaff", "actorCustomer", "actorCorporateUser"})
    Page<AuditLogs> findAll(Specification<AuditLogs> spec, Pageable pageable);

    /**
     * Retrieve paginated audit logs for a specific staff user ID.
     *
     * @param staffId  UUID of the staff user
     * @param pageable pagination parameters
     * @return paginated audit entries
     */
    Page<AuditLogs> findByActorStaff_StaffId(UUID staffId, Pageable pageable);

    /**
     * Retrieve paginated audit logs for a specific customer ID.
     *
     * @param customerId UUID of the customer
     * @param pageable   pagination parameters
     * @return paginated audit entries
     */
    Page<AuditLogs> findByActorCustomer_CustomerId(UUID customerId, Pageable pageable);

    /**
     * Retrieve paginated audit logs for a specific corporate user ID.
     *
     * @param corporateUserId UUID of the corporate user
     * @param pageable        pagination parameters
     * @return paginated audit entries
     */
    Page<AuditLogs> findByActorCorporateUser_CorporateUserId(UUID corporateUserId, Pageable pageable);

    /**
     * Retrieve paginated audit logs for a specific entity type and entity ID.
     *
     * @param entityType domain entity type (e.g., ACCOUNT, TRANSACTION)
     * @param entityId   target entity identifier
     * @param pageable   pagination parameters
     * @return paginated audit entries
     */
    Page<AuditLogs> findByEntityTypeAndEntityId(String entityType, String entityId, Pageable pageable);

    /**
     * Retrieve paginated audit logs by action category.
     *
     * @param actionCategory category of action (e.g., SECURITY, ACCOUNT, TRANSACTION, SYSTEM)
     * @param pageable       pagination parameters
     * @return paginated audit entries
     */
    Page<AuditLogs> findByActionCategory(String actionCategory, Pageable pageable);

    /**
     * Retrieve paginated audit logs by action type.
     *
     * @param actionType action type code (e.g., CREATE_ACCOUNT, TRANSFER_FUNDS)
     * @param pageable   pagination parameters
     * @return paginated audit entries
     */
    Page<AuditLogs> findByActionType(String actionType, Pageable pageable);

    /**
     * Retrieve paginated audit logs filtered by actor classification.
     *
     * @param actorType actor category (STAFF, CUSTOMER, SYSTEM, GUEST)
     * @param pageable  pagination parameters
     * @return paginated audit entries
     */
    Page<AuditLogs> findByActorType(ActorType actorType, Pageable pageable);

    /**
     * Retrieve paginated audit logs recorded within a designated timestamp interval.
     *
     * @param start    beginning timestamp
     * @param end      ending timestamp
     * @param pageable pagination parameters
     * @return paginated audit entries
     */
    Page<AuditLogs> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);

    /**
     * Retrieve paginated audit logs by staff username or staff number.
     *
     * @param staffIdentifier username or staff number
     * @param pageable        pagination parameters
     * @return paginated audit entries
     */
    @Query("""
            SELECT a FROM AuditLogs a
            LEFT JOIN a.actorStaff s
            WHERE s.username = :staffIdentifier OR s.staffNo = :staffIdentifier
            ORDER BY a.createdAt DESC
            """)
    Page<AuditLogs> findByStaffIdentifier(@Param("staffIdentifier") String staffIdentifier, Pageable pageable);
}
