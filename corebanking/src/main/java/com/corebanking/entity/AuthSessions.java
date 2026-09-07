package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "auth_sessions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class AuthSessions {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long session_id;

    @Column(nullable = false)
    private String session_uuid;

    @Column(nullable = false)
    // Enum values: 
    private String subject_type;

    @Column
    private Long customer_id;

    @Column
    private Long staff_id;

    @Column(nullable = false)
    private String refresh_token_hash;

    @Column(nullable = false)
    private Integer token_version_at_issue;

    @Column(nullable = false)
    private LocalDateTime issued_at;

    @Column(nullable = false)
    private LocalDateTime last_seen_at;

    @Column(nullable = false)
    private LocalDateTime refresh_expires_at;

    @Column(nullable = false)
    private Integer idle_timeout_minutes;

    @Column
    private LocalDateTime revoked_at;

    @Column
    private String revoke_reason;

    @Column
    private String ip_address;

    @Column
    private String user_agent;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}