package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity tracking staff-initiated transaction review, suspicious activity flagging,
 * and managerial overrides (release/reject).
 */
@Entity
@Table(name = "transaction_review_actions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TransactionReviewActions {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "review_id", columnDefinition = "BINARY(16)", nullable = false)
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID reviewId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "transaction_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_review_transaction"))
    private BankTransactions transaction;

    @Column(name = "action", nullable = false, length = 32)
    private String action; // FLAG, RELEASE, REJECT

    @Column(name = "old_status", length = 32)
    private String oldStatus;

    @Column(name = "new_status", length = 32, nullable = false)
    private String newStatus;

    @Column(name = "risk_level", length = 32)
    private String riskLevel; // LOW, MEDIUM, HIGH, CRITICAL

    @Column(name = "reason", length = 255, nullable = false)
    private String reason;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by_staff_id",
            foreignKey = @ForeignKey(name = "fk_review_staff"))
    private StaffUsers performedByStaff;

    @Column(name = "performed_at", nullable = false, updatable = false)
    private LocalDateTime performedAt;

    @PrePersist
    protected void onCreate() {
        if (performedAt == null) {
            performedAt = LocalDateTime.now();
        }
    }
}
