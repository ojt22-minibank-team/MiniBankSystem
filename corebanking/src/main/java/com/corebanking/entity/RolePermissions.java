package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "role_permissions")
@Getter 
@Setter 
@NoArgsConstructor 
@AllArgsConstructor
public class RolePermissions {
	
    @EmbeddedId
    private RolePermissionId id;

    @Column(name = "updated_by_type")
    private String updatedByType;

    @Column(name = "updated_by_id")
    private Long updatedById;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

}