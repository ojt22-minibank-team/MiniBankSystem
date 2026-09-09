package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "account_status_history")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AccountStatusHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long history_id;

    @Column(nullable = false)
    private Long account_id;

    @Column
    // Enum values: NULL
    private String old_status;

    @Column(nullable = false)
    // Enum values: 
    private String new_status;

    @Column
    private String reason;

    @Column
    private Long changed_by_staff_id;

    @Column(nullable = false)
    private LocalDateTime changed_at;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}