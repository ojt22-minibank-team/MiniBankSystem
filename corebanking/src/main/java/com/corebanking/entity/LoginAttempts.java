package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "login_attempts")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class LoginAttempts {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long login_attempt_id;

    @Column(nullable = false)
    // Enum values: 
    private String actor_type;

    @Column(nullable = false)
    private String login_identifier;

    @Column
    private Long customer_id;

    @Column
    private Long staff_id;

    @Column(nullable = false)
    private Boolean success;

    @Column
    private String failure_reason;

    @Column
    private String ip_address;

    @Column
    private String user_agent;

    @Column(nullable = false)
    private LocalDateTime attempted_at;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}