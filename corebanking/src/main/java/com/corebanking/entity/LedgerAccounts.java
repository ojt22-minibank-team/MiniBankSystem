package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "ledger_accounts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class LedgerAccounts {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long ledger_account_id;

    @Column(nullable = false)
    private String ledger_code;

    @Column(nullable = false)
    private String ledger_name;

    @Column(nullable = false)
    // Enum values: 
    private String ledger_scope;

    @Column(nullable = false)
    // Enum values: 
    private String account_class;

    @Column(nullable = false)
    private String currency;

    @Column
    private Long customer_account_id;

    @Column
    private String system_key;

    @Column(nullable = false)
    // Enum values: 'ACTIVE'
    private String status;

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