package com.corebanking.entity;

import com.corebanking.entity.enums.CorporateRole;
import com.corebanking.entity.enums.CorporateUserStatus;
import com.corebanking.entity.enums.UpdatedByType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
        name = "corporate_users",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uq_corporate_user_code_per_company",
                        columnNames = {"company_customer_id", "corporate_user_code"}
                )
        },
        indexes = {
                @Index(name = "idx_corporate_users_company", columnList = "company_customer_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorporateUser {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "corporate_user_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID corporateUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "company_customer_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_corporate_users_company")
    )
    private CompanyInfo companyInfo;

    @Column(name = "corporate_user_code", length = 64, nullable = false)
    private String corporateUserCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "corporate_role", length = 20, nullable = false)
    private CorporateRole corporateRole;

    @Column(name = "full_name", length = 150, nullable = false)
    private String fullName;

    @Column(name = "email", length = 191, nullable = false)
    private String email;

    @Column(name = "phone", length = 32)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    private CorporateUserStatus status = CorporateUserStatus.ACTIVE;

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
