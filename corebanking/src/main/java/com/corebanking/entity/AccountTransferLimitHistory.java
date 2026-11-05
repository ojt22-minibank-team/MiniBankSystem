package com.corebanking.entity;

import com.corebanking.entity.enums.LimitChangeAction;
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
@Table(name = "account_transfer_limit_history", indexes = {
    @Index(name = "idx_limit_history_account", columnList = "account_id, changed_at"),
    @Index(name = "idx_limit_history_customer", columnList = "customer_id, changed_at"),
    @Index(name = "idx_limit_history_actor", columnList = "changed_by_type, changed_by_id, changed_at")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountTransferLimitHistory {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "history_id", columnDefinition = "BINARY(16)", nullable = false, updatable = false)
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID historyId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "account_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_limit_history_account"))
    private Accounts account;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_limit_history_customer"))
    private Customers customer;

    @Column(name = "previous_one_time_limit", precision = 18, scale = 4)
    private BigDecimal previousOneTimeLimit;

    @Column(name = "previous_daily_limit", precision = 18, scale = 4)
    private BigDecimal previousDailyLimit;

    @Column(name = "new_one_time_limit", precision = 18, scale = 4)
    private BigDecimal newOneTimeLimit;

    @Column(name = "new_daily_limit", precision = 18, scale = 4)
    private BigDecimal newDailyLimit;

    @Enumerated(EnumType.STRING)
    @Column(name = "change_action", length = 30, nullable = false)
    private LimitChangeAction changeAction;

    @Enumerated(EnumType.STRING)
    @Column(name = "changed_by_type", length = 15, nullable = false)
    private UpdatedByType changedByType;

    @Column(name = "changed_by_id", columnDefinition = "BINARY(16)")
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID changedById;

    @Column(name = "changed_at", nullable = false)
    private LocalDateTime changedAt;

    @Column(name = "reason", length = 255)
    private String reason;

    @PrePersist
    protected void onCreate() {
        if (changedAt == null) {
            changedAt = LocalDateTime.now();
        }
    }
}
