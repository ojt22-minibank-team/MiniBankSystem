package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "staff_users")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class StaffUsers {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Long staff_id;

    @Column(nullable = false)
    private String staff_no;

    @Column(nullable = false)
    private String username;

    @Column(nullable = false)
    private String full_name;

    @Column
    private String email;

    @Column
    private String phone;

    @Column(nullable = false)
    private String password_hash;

    @Column(nullable = false)
    private Boolean must_change_password;

    @Column
    private LocalDateTime password_changed_at;

    @Column(nullable = false)
    // Enum values: 'ACTIVE'
    private String status;

    @Column(nullable = false)
    private Integer failed_login_count;

    @Column
    private LocalDateTime locked_until;

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