package com.corebanking.entity;

import com.corebanking.entity.enums.*;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "bank_transactions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BankTransactions {

    @Id
    @Column(name = "transaction_id", columnDefinition = "BINARY(16)", nullable = false)
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID transactionId;

    @Column(name = "transaction_ref", length = 64, nullable = false, unique = true)
    private String transactionRef;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 25)
    private TransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 25)
    private TransactionStatus status = TransactionStatus.INITIATED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_account_id",
            foreignKey = @ForeignKey(name = "fk_transactions_source"))
    private Accounts sourceAccount;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_account_id",
            foreignKey = @ForeignKey(name = "fk_transactions_destination"))
    private Accounts destinationAccount;

    @Column(name = "amount", precision = 18, scale = 4, nullable = false)
    private BigDecimal amount;

    @Column(name = "service_fee", precision = 18, scale = 4, nullable = false)
    private BigDecimal serviceFee = BigDecimal.ZERO;

    @Column(name = "currency", length = 3, nullable = false)
    private String currency = "MMK";

    @Enumerated(EnumType.STRING)
    @Column(name = "initiated_by_type", nullable = false, length = 10)
    private InitiatedByType initiatedByType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "initiated_by_customer_id",
            foreignKey = @ForeignKey(name = "fk_transactions_customer_actor"))
    private Customers initiatedByCustomer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "initiated_by_staff_id",
            foreignKey = @ForeignKey(name = "fk_transactions_staff_actor"))
    private StaffUsers initiatedByStaff;

    @Enumerated(EnumType.STRING)
    @Column(name = "channel", nullable = false, length = 20)
    private TransactionChannel channel;

    @Column(name = "external_reference", length = 128)
    private String externalReference;

    @Column(name = "idempotency_key", length = 64, unique = true)
    private String idempotencyKey;

    @Column(name = "description", length = 255)
    private String description;

    @Column(name = "audit_note", length = 255)
    private String auditNote;

    @Column(name = "failure_code", length = 32)
    private String failureCode;

    @Column(name = "failure_message", length = 255)
    private String failureMessage;

    @Column(name = "initiated_at", nullable = false, updatable = false)
    private LocalDateTime initiatedAt;

    @Column(name = "authorized_at")
    private LocalDateTime authorizedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "updated_by_type", length = 10)
    private UpdatedByType updatedByType;

    @Column(name = "updated_by_id", columnDefinition = "BINARY(16)")
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID updatedById;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (transactionId == null) transactionId = UUID.randomUUID();
        if (initiatedAt == null) initiatedAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
