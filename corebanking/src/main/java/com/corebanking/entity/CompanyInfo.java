package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "company_info")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CompanyInfo {

    @Id
    @Column(name = "customer_id", columnDefinition = "BINARY(16)", nullable = false)
    @JdbcTypeCode(SqlTypes.BINARY)
    private UUID customerId;

    @OneToOne(fetch = FetchType.LAZY)
    @MapsId
    @JoinColumn(name = "customer_id",
            foreignKey = @ForeignKey(name = "fk_company_info_customer"))
    private Customers customer;

    @Column(name = "company_name", length = 200, nullable = false)
    private String companyName;

    @Column(name = "registration_number", length = 100, nullable = false, unique = true)
    private String registrationNumber;

    @Column(name = "tax_id", length = 100, unique = true)
    private String taxId;

    @Column(name = "business_type", length = 100)
    private String businessType;

    @Column(name = "incorporation_date")
    private LocalDate incorporationDate;

    @Column(name = "company_phone", length = 32)
    private String companyPhone;

    @Column(name = "company_email", length = 191)
    private String companyEmail;

    @Column(name = "address", length = 255)
    private String address;
    
    @Column(name = "profile_image_url",length=500)
    private String profileImageUrl;

    @Column(name = "city", length = 100)
    private String city;

    @Column(name = "state_region", length = 100)
    private String stateRegion;

    @Column(name = "country", length = 64, nullable = false)
    private String country = "Myanmar";

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
