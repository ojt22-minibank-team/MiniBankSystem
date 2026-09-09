package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "customers")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Customers {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long customer_id;

    @Column(nullable = false)
    // Enum values: 
    private String customer_type;

    @Column(nullable = false)
    // Enum values: 'ACTIVE'
    private String status;

    @Column
    private Long created_by;

    @Column(nullable = false)
    private LocalDateTime created_at;

    @Column
    private Long updated_by;

    @Column(nullable = false)
    private LocalDateTime updated_at;

    @Column
    private LocalDateTime deleted_at;

}