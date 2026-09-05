package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "role_permissions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class RolePermissions {
	
	@Id
    @Column(nullable = false)
    private Integer role_id;

    @Column(nullable = false)
    private Integer permission_id;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}