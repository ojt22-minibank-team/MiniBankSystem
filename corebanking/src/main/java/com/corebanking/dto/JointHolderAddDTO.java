package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class JointHolderAddDTO {
    // ပူးတွဲပိုင်ရှင်အဖြစ် ထည့်သွင်းမည့် Customer ၏ Code (ဥပမာ- CUST-20260919-8406)
    private String jointCustomerCode;

    // ဆက်ဆံရေး သို့မဟုတ် ပူးတွဲပိုင်ဆိုင်မှု အမျိုးအစား (ဥပမာ- PARTNER, SPOUSE)
    private String relationshipType;
}