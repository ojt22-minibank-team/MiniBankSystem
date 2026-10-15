package com.corebanking.entity;

import com.corebanking.entity.enums.SignatoryRole;
import com.corebanking.entity.enums.SignatoryStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "account_signatories",
        uniqueConstraints = @UniqueConstraint(name = "uq_acc_signatory",
                columnNames = {"account_id", "customer_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountSignatories {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "signatory_id", columnDefinition = "BINARY(16)", nullable = false)
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID signatoryId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_signatory_account"))
    private Accounts account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_signatory_customer"))
    private Customers customer;

    @Enumerated(EnumType.STRING)
    @Column(name = "signatory_role", nullable = false, length = 20)
    private SignatoryRole signatoryRole = SignatoryRole.JOINT_HOLDER;

    @Column(name = "can_initiate", nullable = false)
    private boolean canInitiate = true;

    @Column(name = "can_approve", nullable = false)
    private boolean canApprove = true;

    @Column(name = "approval_limit", precision = 18, scale = 4)
    private BigDecimal approvalLimit;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private SignatoryStatus status = SignatoryStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
