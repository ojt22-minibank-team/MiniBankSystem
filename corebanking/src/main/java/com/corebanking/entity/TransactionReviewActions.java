package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "transaction_review_actions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class TransactionReviewActions {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long review_action_id;

    @Column(nullable = false)
    private Long transaction_id;

    @Column(nullable = false)
    // Enum values: 
    private String action;

    @Column
    // Enum values: NULL
    private String risk_level;

    @Column
    private String old_status;

    @Column
    private String new_status;

    @Column(nullable = false)
    private String reason;

    @Column
    private String resolution_note;

    @Column(nullable = false)
    private Long performed_by_staff_id;

    @Column(nullable = false)
    private LocalDateTime performed_at;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}