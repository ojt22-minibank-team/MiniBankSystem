package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "ledger_entries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class LedgerEntries {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long ledger_entry_id;

    @Column(nullable = false)
    private Long transaction_id;

    @Column(nullable = false)
    private Integer line_no;

    @Column(nullable = false)
    private Long ledger_account_id;

    @Column(nullable = false)
    // Enum values: 
    private String entry_type;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String currency;

    @Column
    private BigDecimal balance_before;

    @Column
    private BigDecimal balance_after;

    @Column
    private String narration;

    @Column(nullable = false)
    private LocalDateTime created_at;

}