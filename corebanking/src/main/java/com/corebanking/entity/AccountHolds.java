package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "account_holds")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AccountHolds {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long hold_id;

    @Column(nullable = false)
    private String hold_ref;

    @Column(nullable = false)
    private Long account_id;

    @Column
    private Long transaction_id;

    @Column(nullable = false)
    // Enum values: 
    private String hold_type;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    // Enum values: 'ACTIVE'
    private String status;

    @Column
    private String reason;

    @Column(nullable = false)
    private LocalDateTime created_at;

    @Column
    private LocalDateTime expires_at;

    @Column
    private LocalDateTime released_at;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}