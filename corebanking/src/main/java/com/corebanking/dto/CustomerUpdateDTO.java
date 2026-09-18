package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CustomerUpdateDTO {
    // Personal နှင့် Company နှစ်ခုလုံးအတွက် ပြင်ဆင်ခွင့်ရှိသော fields များ
    private String email;
    private String phone;
    private String address;

    // Personal Customer သီးသန့် ပြင်ဆင်နိုင်သော fields
    private String occupation;

    // Company Customer သီးသန့် ပြင်ဆင်နိုင်သော fields
    private String businessType;
}