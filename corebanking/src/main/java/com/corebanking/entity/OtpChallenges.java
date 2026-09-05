package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "otp_challenges")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class OtpChallenges {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long otp_id;

    @Column(nullable = false)
    private String challenge_group_id;

    @Column(nullable = false)
    private Long customer_id;

    @Column
    private Long transaction_id;

    @Column(nullable = false)
    // Enum values: 
    private String purpose;

    @Column(nullable = false)
    private String otp_hash;

    @Column(nullable = false)
    // Enum values: 'EMAIL'
    private String delivery_channel;

    @Column
    private String destination_masked;

    @Column(nullable = false)
    private Integer attempt_count;

    @Column(nullable = false)
    private Integer max_attempts;

    @Column(nullable = false)
    private Integer resend_no;

    @Column(nullable = false)
    private Integer max_resend_attempts;

    @Column(nullable = false)
    private LocalDateTime expires_at;

    @Column
    private LocalDateTime consumed_at;

    @Column(nullable = false)
    // Enum values: 'PENDING'
    private String status;

    @Column(nullable = false)
    private LocalDateTime created_at;

    @Column
    private LocalDateTime last_sent_at;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}