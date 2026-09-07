package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "bank_transactions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class BankTransactions {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long transaction_id;

    @Column(nullable = false)
    private String transaction_ref;

    @Column(nullable = false)
    // Enum values: 
    private String transaction_type;

    @Column(nullable = false)
    // Enum values: 'INITIATED'
    private String status;

    @Column
    private Long source_account_id;

    @Column
    private Long destination_account_id;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private BigDecimal service_fee;

    @Column(nullable = false)
    private String currency;

    @Column(nullable = false)
    // Enum values: 
    private String initiated_by_type;

    @Column
    private Long initiated_by_customer_id;

    @Column
    private Long initiated_by_staff_id;

    @Column(nullable = false)
    // Enum values: 
    private String channel;

    @Column
    private String external_reference;

    @Column
    private String idempotency_key;

    @Column
    private String description;

    @Column
    private String audit_note;

    @Column
    private String failure_code;

    @Column
    private String failure_message;

    @Column(nullable = false)
    private LocalDateTime initiated_at;

    @Column
    private LocalDateTime authorized_at;

    @Column
    private LocalDateTime completed_at;

    @Column
    private String version;

    @Column
    private LocalDateTime expires_at;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}