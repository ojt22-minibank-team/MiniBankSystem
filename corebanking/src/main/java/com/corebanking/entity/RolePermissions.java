package com.corebanking.entity;

import com.corebanking.entity.enums.UpdatedByType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "role_permissions")
@IdClass(RolePermissions.RolePermissionId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RolePermissions {

    @lombok.Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RolePermissionId implements Serializable {
        private Integer roleId;
        private Integer permissionId;
    }

    @Id
    @Column(name = "role_id", nullable = false)
    private Integer roleId;

    @Id
    @Column(name = "permission_id", nullable = false)
    private Integer permissionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_role_permissions_role"))
    private Roles role;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "permission_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_role_permissions_permission"))
    private Permissions permission;

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
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
