package com.corebanking.entity;

import com.corebanking.entity.enums.CorporateAccessStatus;
import com.corebanking.entity.enums.UpdatedByType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "corporate_account_access",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_corporate_user_account",
                        columnNames = {"corporate_user_id", "account_id"}
                )
        },
        indexes = {
                @Index(name = "fk_corporate_access_user", columnList = "corporate_user_id"),
                @Index(name = "fk_corporate_access_account", columnList = "account_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorporateAccountAccess {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "access_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID accessId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "corporate_user_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_corporate_access_user")
    )
    private CorporateUser corporateUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "account_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_corporate_access_account")
    )
    private Accounts account;

    @Column(name = "can_view", nullable = false)
    @Builder.Default
    private boolean canView = true;

    @Column(name = "can_initiate", nullable = false)
    @Builder.Default
    private boolean canInitiate = false;

    @Column(name = "can_approve", nullable = false)
    @Builder.Default
    private boolean canApprove = false;

    @Column(name = "approval_limit", precision = 18, scale = 4)
    private BigDecimal approvalLimit;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    private CorporateAccessStatus status = CorporateAccessStatus.ACTIVE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "updated_by_id", columnDefinition = "BINARY(16)")
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID updatedById;

    @Enumerated(EnumType.STRING)
    @Column(name = "updated_by_type", length = 20)
    private UpdatedByType updatedByType;

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
