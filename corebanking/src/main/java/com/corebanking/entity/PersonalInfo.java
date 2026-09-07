package com.corebanking.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.*;

@Entity
@Table(name = "personal_info")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
public class PersonalInfo {
	@Id
    @Column(nullable = false)
    private Long customer_id;

    @Column(nullable = false)
    private String first_name;

    @Column(nullable = false)
    private String last_name;

    @Column
    private LocalDate date_of_birth;

    @Column
    // Enum values: NULL
    private String gender;

    @Column
    private String nrc;

    @Column
    private String passport_number;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column
    private String occupation;

    @Column
    private String address;

    @Column
    private String city;

    @Column
    private String state_region;

    @Column(nullable = false)
    private String country;

    @Column(nullable = false)
    private LocalDateTime created_at;

    @Column(nullable = false)
    private LocalDateTime updated_at;

}