
package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(
    name = "announcement_read_status",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_announcement_read_customer",
        columnNames = {"customer_id", "announcement_id"}
    ),
    indexes = @Index(
        name = "idx_announcement_read_customer",
        columnList = "customer_id"
    )
)
@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AnnouncementReadStatus {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(
        name = "customer_id",
        nullable = false,
        updatable = false,
        columnDefinition = "BINARY(16)"
    )
    private UUID customerId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
        name = "announcement_id",
        nullable = false,
        updatable = false,
        foreignKey = @ForeignKey(
            name = "fk_announcement_read_announcement"
        )
    )
    private Announcements announcement;

    @Column(name = "read_at", nullable = false, updatable = false)
    private LocalDateTime readAt;

    public AnnouncementReadStatus(
            UUID customerId,
            Announcements announcement,
            LocalDateTime readAt
    ) {
        this.customerId = customerId;
        this.announcement = announcement;
        this.readAt = readAt;
    }
}
