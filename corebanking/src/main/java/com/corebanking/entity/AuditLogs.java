package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "audit_logs")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AuditLogs {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long audit_id;

    @Column(nullable = false)
    // Enum values: 
    private String actor_type;

    @Column
    private Long actor_customer_id;

    @Column
    private Long actor_staff_id;

    @Column(nullable = false)
    private String action_type;

    @Column(nullable = false)
    private String entity_type;

    @Column
    private String entity_id;

    @Column
    private String old_values;

    @Column
    private String new_values;

    @Column
    private Long transaction_id;

    @Column
    private String ip_address;

    @Column
    private String user_agent;

    @Column
    private String request_id;

    @Column(nullable = false)
    private LocalDateTime created_at;

}