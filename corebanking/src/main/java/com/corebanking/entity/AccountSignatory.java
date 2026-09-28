package com.corebanking.entity;

import com.corebanking.entity.enums.SignatoryRole;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "account_signatories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AccountSignatory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // အကောင့်နံပါတ် (Corporate Account သို့မဟုတ် Joint Account Number)
    @Column(name = "account_number", nullable = false, length = 32)
    private String accountNumber;

    // သက်ဆိုင်ရာ ပုဂ္ဂိုလ်၏ Customer Code (CEO, Accountant သို့မဟုတ် Joint Holder)
    @Column(name = "customer_code", nullable = false, length = 32)
    private String customerCode;

    // အထက်တွင် ပြင်ဆင်ခဲ့သော SignatoryRole Enum
    @Enumerated(EnumType.STRING)
    @Column(name = "role", nullable = false, length = 20)
    private SignatoryRole role;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}