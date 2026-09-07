package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "beneficiaries")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class Beneficiaries {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long beneficiary_id;

    @Column(nullable = false)
    private Long owner_account_id;

    @Column(nullable = false)
    private Long beneficiary_account_id;

    @Column
    private String nickname;

    @Column(nullable = false)
    private Boolean is_active;

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