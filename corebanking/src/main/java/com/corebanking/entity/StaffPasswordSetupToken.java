
package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(
    name = "staff_password_setup_tokens",
    indexes = {
        @Index(
            name = "idx_setup_token_staff",
            columnList = "staff_id"
        )
    }
)
@Getter
@Setter
@NoArgsConstructor
public class StaffPasswordSetupToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "staff_id",
        nullable = false,
        foreignKey = @ForeignKey(name = "fk_setup_token_staff")
    )
    private StaffUsers staff;

    @Column(
        name = "token_hash",
        nullable = false,
        unique = true,
        length = 64
    )
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    @Column(name = "used_at")
    private LocalDateTime usedAt;

    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}