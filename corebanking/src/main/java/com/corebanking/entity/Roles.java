package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "roles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Roles {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Integer role_id;

    @Column(nullable = false)
    private String role_code;

    @Column(nullable = false)
    private String role_name;

    @Column
    private String description;

    @Column(nullable = false)
    private Boolean is_system_role;

    @Column(nullable = false)
    private LocalDateTime created_at;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}