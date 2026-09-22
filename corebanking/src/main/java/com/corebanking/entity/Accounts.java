package com.corebanking.entity;

import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
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
@Table(name = "accounts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Accounts {

    @Id
    @UuidGenerator(style = UuidGenerator.Style.TIME)
    @Column(name = "account_id", columnDefinition = "BINARY(16)", nullable = false)
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID accountId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_accounts_customer"))
    private Customers customer;

    @Column(name = "account_number", length = 34, nullable = false, unique = true)
    private String accountNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_category", nullable = false, length = 15)
    private AccountCategory accountCategory = AccountCategory.RETAIL;

    @Enumerated(EnumType.STRING)
    @Column(name = "account_type", nullable = false, length = 15)
    private AccountType accountType = AccountType.SAVINGS;
    
 // Group 1 မှ တောင်းဆိုထားသော Account-Level Password / Transaction PIN (BCrypt Hashed)
    @Column(name = "account_password_hash", length = 100, nullable = false)
    private String accountPasswordHash;

    @Column(name = "is_joint_account", nullable = false)
    private boolean isJointAccount = false;

    @Column(name = "required_approvals", nullable = false)
    private short requiredApprovals = 1;

    @Column(name = "currency", length = 3, nullable = false)
    private String currency = "MMK";

    @Column(name = "current_balance", precision = 18, scale = 4, nullable = false)
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Column(name = "available_balance", precision = 18, scale = 4, nullable = false)
    private BigDecimal availableBalance = BigDecimal.ZERO;

    @Column(name = "minimum_balance", precision = 18, scale = 4, nullable = false)
    private BigDecimal minimumBalance = BigDecimal.ZERO;

    @Column(name = "daily_transfer_limit", precision = 18, scale = 4)
    private BigDecimal dailyTransferLimit;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 10)
    private AccountStatus status = AccountStatus.ACTIVE;

    @Column(name = "opened_at", nullable = false)
    private LocalDateTime openedAt;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_staff_id", nullable = false,
            foreignKey = @ForeignKey(name = "fk_accounts_created_by_staff"))
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

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (openedAt == null) openedAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
