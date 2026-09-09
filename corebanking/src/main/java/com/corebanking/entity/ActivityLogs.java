package com.corebanking.entity;

import com.corebanking.entity.enums.ActorType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "activity_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityLogs {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activity_id", nullable = false)
    private Long activityId;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_type", nullable = false, length = 10)
    private ActorType actorType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_customer_id",
            foreignKey = @ForeignKey(name = "fk_activity_customer"))
    private Customers actorCustomer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_staff_id",
            foreignKey = @ForeignKey(name = "fk_activity_staff"))
    private StaffUsers actorStaff;

    @Column(name = "action_category", length = 50, nullable = false)
    private String actionCategory;

    @Column(name = "action_name", length = 100, nullable = false)
    private String actionName;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "request_url", length = 255)
    private String requestUrl;

    @Column(name = "ip_address", length = 45, nullable = false)
    private String ipAddress;

    @Column(name = "user_agent", length = 255)
    private String userAgent;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
    }
}
