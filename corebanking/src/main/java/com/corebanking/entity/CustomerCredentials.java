package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "customer_credentials")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CustomerCredentials {
	@Id
    @Column(nullable = false)
    private Long customer_id;

    @Column(nullable = false)
    private String password_hash;

    @Column
    private String transaction_pin_hash;

    @Column(nullable = false)
    private Boolean mfa_enabled;

    @Column(nullable = false)
    // Enum values: 'EMAIL'
    private String mfa_method;

    @Column(nullable = false)
    private Boolean must_change_password;

    @Column
    private LocalDateTime password_changed_at;

    @Column
    private LocalDateTime pin_changed_at;

    @Column(nullable = false)
    private Integer failed_login_count;

    @Column
    private LocalDateTime locked_until;

    @Column(nullable = false)
    private Integer failed_pin_attempt_count;

    @Column
    private LocalDateTime pin_locked_until;

    @Column
    private LocalDateTime last_login_at;

    @Column(nullable = false)
    private Integer token_version;

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