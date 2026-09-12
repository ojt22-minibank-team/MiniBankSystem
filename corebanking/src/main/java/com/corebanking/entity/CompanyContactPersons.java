package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "company_contact_persons")
@IdClass(CompanyContactPersons.CompanyContactId.class)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyContactPersons {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CompanyContactId implements Serializable {
        private UUID customerId;
        private Integer contactId;
    }

    @Id
    @Column(name = "customer_id", columnDefinition = "BINARY(16)", nullable = false)
    private UUID customerId;

    @Id
    @Column(name = "contact_id", nullable = false)
    private Integer contactId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", insertable = false, updatable = false,
            foreignKey = @ForeignKey(name = "fk_company_contact_customer"))
    private CompanyInfo companyInfo;

    @Column(name = "full_name", length = 150, nullable = false)
    private String fullName;

    @Column(name = "position", length = 100)
    private String position;

    @Column(name = "phone", length = 32, nullable = false)
    private String phone;

    @Column(name = "email", length = 191)
    private String email;

    @Column(name = "is_primary", nullable = false)
    private boolean isPrimary = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
