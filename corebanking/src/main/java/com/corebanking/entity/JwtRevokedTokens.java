package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "jwt_revoked_tokens")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class JwtRevokedTokens {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long revocation_id;

    @Column(nullable = false)
    private String jti;

    @Column(nullable = false)
    // Enum values: 
    private String subject_type;

    @Column
    private Long customer_id;

    @Column
    private Long staff_id;

    @Column(nullable = false)
    private LocalDateTime token_expires_at;

    @Column(nullable = false)
    private LocalDateTime revoked_at;

    @Column
    private String reason;

    @Column
    // Enum values: NULL
    private String updated_by_type;

    @Column
    private Long updated_by_id;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}