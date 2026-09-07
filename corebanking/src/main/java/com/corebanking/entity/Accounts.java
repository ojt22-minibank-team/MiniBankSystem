package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "accounts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Accounts {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long account_id;

    @Column(nullable = false)
    private Long customer_id;

    @Column(nullable = false)
    // Enum values: 
    private String account_category;

    @Column(nullable = false)
    // Enum values: 
    private String account_type;

    @Column(nullable = false)
    private String account_number;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    private BigDecimal current_balance;

    @Column(nullable = false)
    private BigDecimal available_balance;

    @Column(nullable = false)
    private BigDecimal minimum_balance;

    @Column
    private BigDecimal daily_transfer_limit;

    @Column(nullable = false)
    // Enum values: 'ACTIVE'
    private String status;

    @Column(nullable = false)
    private LocalDateTime opened_at;

    @Column
    private LocalDateTime closed_at;

    @Column(nullable = false)
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

    @Column
    private LocalDateTime deleted_at;

}