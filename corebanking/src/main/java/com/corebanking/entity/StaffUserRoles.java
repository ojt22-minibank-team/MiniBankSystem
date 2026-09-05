package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "staff_user_roles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class StaffUserRoles {
	@Id
    @Column(nullable = false)
    private Long staff_id;

    @Column(nullable = false)
    private Integer role_id;

    @Column
    private Long assigned_by_staff_id;

    @Column(nullable = false)
    private LocalDateTime assigned_at;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}