package com.corebanking.entity;

import com.corebanking.entity.enums.ApprovalStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "transaction_approvals",
        uniqueConstraints = @UniqueConstraint(name = "uq_tx_approver",
                columnNames = {"transaction_id", "approver_customer_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionApprovals {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "approval_id", columnDefinition = "BINARY(16)", nullable = false)
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID approvalId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_appr_tx"))
    private BankTransactions transaction;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approver_customer_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_appr_customer"))
    private Customers approverCustomer;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 10)
    private ApprovalStatus approvalStatus = ApprovalStatus.PENDING;

    @Column(name = "pin_verified", nullable = false)
    private boolean pinVerified = false;

    @Column(name = "decision_reason", length = 255)
    private String decisionReason;

    @Column(name = "decided_at")
    private LocalDateTime decidedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
