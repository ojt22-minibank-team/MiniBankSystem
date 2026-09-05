package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "fee_schedules")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class FeeSchedules {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long fee_schedule_id;

    @Column(nullable = false)
    private String fee_code;

    @Column(nullable = false)
    // Enum values: 
    private String transaction_type;

    @Column(nullable = false)
    // Enum values: 
    private String fee_type;

    @Column(nullable = false)
    private BigDecimal fee_value;

    @Column
    private BigDecimal minimum_fee;

    @Column
    private BigDecimal maximum_fee;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private LocalDateTime active_from;

    @Column
    private LocalDateTime active_until;

    @Column(nullable = false)
    private Boolean is_active;

    @Column
    private Long created_by_staff_id;

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