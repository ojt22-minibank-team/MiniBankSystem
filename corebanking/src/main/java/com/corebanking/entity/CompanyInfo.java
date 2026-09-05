package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.*;

@Entity
@Table(name = "company_info")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class CompanyInfo {

    @Id
    @Column(nullable = false)
    private Long customer_id; // Primary Key အဖြစ် သတ်မှတ်လိုက်ပါပြီ

    @Column(nullable = false)
    private String company_name;

    @Column(nullable = false)
    private String registration_number;

    // အောက်ဘက်တွင် ကျန်ရှိသော Variable များ အတိုင်း ဆက်ထားပါ...
    @Column
    private String tax_id;

    @Column
    private String business_type;

    @Column
    private LocalDate incorporation_date;

    @Column
    private String company_phone;

    @Column
    private String company_email;

    @Column
    private String address;

    @Column
    private String city;

    @Column
    private String state_region;

    @Column(nullable = false)
    private String country;

    @Column
    private String contact_person_name;

    @Column
    private String contact_person_phone;

    @Column
    private String contact_person_position;

    @Column(nullable = false)
    private LocalDateTime created_at;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}