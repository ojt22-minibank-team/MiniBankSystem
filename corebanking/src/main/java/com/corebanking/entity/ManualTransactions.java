package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "manual_transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class ManualTransactions {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long manual_transaction_id;

    @Column(nullable = false)
    private Long transaction_id;

    @Column(nullable = false)
    private Long account_id;

    @Column(nullable = false)
    private Long staff_id;

    @Column(nullable = false)
    // Enum values: 
    private String operation_type;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String reference_id;

    @Column(nullable = false)
    private String audit_note;

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