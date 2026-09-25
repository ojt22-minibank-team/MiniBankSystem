package com.corebanking.dto;

import com.corebanking.entity.enums.AccountStatus;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AccountStatusUpdateDTO {
    // ACTIVE, FROZEN, SUSPENDED, CLOSED စသည်
    private AccountStatus status;

    // အခြေအနေ ပြောင်းလဲရသည့် အကြောင်းအရင်း (Audit Note)
    private String reason;
}