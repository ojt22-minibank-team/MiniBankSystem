package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "system_parameters")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class SystemParameters {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long parameter_id;

    @Column(nullable = false)
    private String parameter_key;

    @Column(nullable = false)
    private String parameter_value;

    @Column
    private String description;

    @Column
    private Long updated_by_staff_id;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}