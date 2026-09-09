package com.corebanking.entity;

import com.corebanking.entity.enums.AccountClass;
import com.corebanking.entity.enums.LedgerAccountStatus;
import com.corebanking.entity.enums.LedgerScope;
import com.corebanking.entity.enums.UpdatedByType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "ledger_accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class LedgerAccounts {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ledger_account_id", nullable = false)
    private Integer ledgerAccountId;

    @Column(name = "ledger_code", length = 32, nullable = false, unique = true)
    private String ledgerCode;

    @Column(name = "ledger_name", length = 150, nullable = false)
    private String ledgerName;

    @Enumerated(EnumType.STRING)
    @Column(name = "ledger_scope", nullable = false, length = 15)
    private LedgerScope ledgerScope = LedgerScope.INTERNAL;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_class", nullable = false, length = 15)
    private AccountClass accountClass;

    @Column(name = "currency", length = 3, nullable = false)
    private String currency = "MMK";

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_account_id", unique = true,
            foreignKey = @ForeignKey(name = "fk_ledger_customer_account"))
    private Accounts customerAccount;

    @Column(name = "system_key", length = 64, unique = true)
    private String systemKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 15)
    private LedgerAccountStatus status = LedgerAccountStatus.ACTIVE;

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
