package com.corebanking.entity;

import com.corebanking.entity.enums.FeeType;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.entity.enums.UpdatedByType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "fee_schedules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FeeSchedules {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "fee_schedule_id", nullable = false)
    private Integer feeScheduleId;

    @Column(name = "fee_code", length = 32, nullable = false, unique = true)
    private String feeCode;

    @Enumerated(EnumType.STRING)
    @Column(name = "transaction_type", nullable = false, length = 25)
    private TransactionType transactionType;

    @Enumerated(EnumType.STRING)
    @Column(name = "fee_type", nullable = false, length = 15)
    private FeeType feeType;

    @Column(name = "fee_value", precision = 18, scale = 4, nullable = false)
    private BigDecimal feeValue;

    @Column(name = "minimum_fee", precision = 18, scale = 4)
    private BigDecimal minimumFee;

    @Column(name = "maximum_fee", precision = 18, scale = 4)
    private BigDecimal maximumFee;

    @Column(name = "currency", length = 3, nullable = false)
    private String currency = "MMK";

    @Column(name = "active_from", nullable = false)
    private LocalDateTime activeFrom;

    @Column(name = "active_until")
    private LocalDateTime activeUntil;

    @Column(name = "is_active", nullable = false)
    private boolean isActive = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_staff_id",
            foreignKey = @ForeignKey(name = "fk_fee_created_staff"))
    private StaffUsers createdByStaff;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

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
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
