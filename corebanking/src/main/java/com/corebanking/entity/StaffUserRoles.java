package com.corebanking.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "staff_user_roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StaffUserRoles {

    @Id
    @Column(name = "staff_id", nullable = false)
    private Long staff_id;

    @Column(name = "role_id", nullable = false)
    private Integer role_id;

    @Column(name = "assigned_by_staff_id")
    private Long assigned_by_staff_id;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assigned_at;

    @Column(name = "updated_by_type")
    private String updated_by_type;

    @Column(name = "updated_by_id")
    private Long updated_by_id;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updated_at;
}