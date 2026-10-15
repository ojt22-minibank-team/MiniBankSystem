package com.corebanking.entity;

import com.corebanking.entity.enums.ActorType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

/**
 * Immutable System Audit Log Entity.
 * <p>
 * Represents an insert-only, immutable audit trail record capturing security events,
 * business state transitions, and administrative actions across the Core Banking platform.
 * Unifies capabilities from legacy activity logging into a standardized audit engine.
 * </p>
 */
@Entity
@Table(
        name = "audit_logs",
        indexes = {
                @Index(name = "idx_audit_actor_staff", columnList = "actor_staff_id"),
                @Index(name = "idx_audit_actor_customer", columnList = "actor_customer_id"),
                @Index(name = "idx_audit_actor_corporate_user", columnList = "actor_corporate_user_id"),
                @Index(name = "idx_audit_action_type", columnList = "action_type"),
                @Index(name = "idx_audit_action_category", columnList = "action_category"),
                @Index(name = "idx_audit_entity_type", columnList = "entity_type"),
                @Index(name = "idx_audit_entity_id", columnList = "entity_id"),
                @Index(name = "idx_audit_created_at", columnList = "created_at"),
                @Index(name = "idx_audit_composite_search", columnList = "action_type, entity_type, created_at")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder(toBuilder = true)
public class AuditLogs {

    /**
     * Unique identifier for the audit entry (Identity Autoincrement).
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "audit_id", nullable = false, updatable = false)
    private Long auditId;

    /**
     * Classification of the actor performing the operation.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 20, updatable = false)
    private ActorType actorType;

    /**
     * Customer actor associated with the event, if initiated by a customer.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_customer_id",
            foreignKey = @ForeignKey(name = "fk_audit_customer"),
            updatable = false)
    private Customers actorCustomer;

    /**
     * Corporate user actor associated with the event, if initiated by a corporate user.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_corporate_user_id",
            foreignKey = @ForeignKey(name = "fk_audit_corporate_user"),
            updatable = false)
    private CorporateUser actorCorporateUser;

    /**
     * Staff user associated with the event, if initiated by an employee/teller/admin.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_staff_id",
            foreignKey = @ForeignKey(name = "fk_audit_staff"),
            updatable = false)
    private StaffUsers actorStaff;

    /**
     * High-level functional domain category (e.g. SECURITY, ACCOUNT, TRANSACTION, SYSTEM).
     * Unified from ActivityLogs.
     */
    @Column(name = "action_category", length = 50, updatable = false)
    private String actionCategory;

    /**
     * Specific action identifier (e.g., CREATE_ACCOUNT, LOGIN_SUCCESS, TRANSFER_FUNDS).
     */
    @Column(name = "action_type", length = 100, nullable = false, updatable = false)
    private String actionType;

    /**
     * Entity type affected by the action (e.g., ACCOUNT, CUSTOMER, TRANSACTION, AUTH_SESSION).
     */
    @Column(name = "entity_type", length = 64, nullable = false, updatable = false)
    private String entityType;

    /**
     * Identifier of the affected entity (e.g., account number, customer code, transaction ref).
     */
    @Column(name = "entity_id", length = 64, updatable = false)
    private String entityId;

    /**
     * Human-readable description summarizing the operation or context.
     * Unified from ActivityLogs.
     */
    @Column(name = "description", length = 255, updatable = false)
    private String description;

    /**
     * HTTP request URL or endpoint triggering the action.
     * Unified from ActivityLogs.
     */
    @Column(name = "request_url", length = 255, updatable = false)
    private String requestUrl;

    /**
     * Snapshot of the entity state before the modification occurred (JSON format).
     */
    @Column(name = "old_values", columnDefinition = "JSON", updatable = false)
    private String oldValues;

    /**
     * Snapshot of the entity state after the modification occurred (JSON format).
     */
    @Column(name = "new_values", columnDefinition = "JSON", updatable = false)
    private String newValues;

    /**
     * Optional transaction reference if this audit record directly links to a financial transfer.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id",
            foreignKey = @ForeignKey(name = "fk_audit_transaction"),
            updatable = false)
    private BankTransactions transaction;

    /**
     * Client IPv4/IPv6 address initiating the operation.
     */
    @Column(name = "ip_address", length = 45, updatable = false)
    private String ipAddress;

    /**
     * Client User-Agent string from the HTTP request headers.
     */
    @Column(name = "user_agent", length = 255, updatable = false)
    private String userAgent;

    /**
     * Unique correlation or request ID for end-to-end tracing across distributed components.
     */
    @Column(name = "request_id", length = 64, updatable = false)
    private String requestId;

    /**
     * Timestamp when the audit entry was recorded (system-assigned, immutable).
     */
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
