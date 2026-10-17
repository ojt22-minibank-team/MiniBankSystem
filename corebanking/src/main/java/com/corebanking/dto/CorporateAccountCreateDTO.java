package com.corebanking.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CorporateAccountCreateDTO {

    // ကုမ္ပဏီ Customer Code (ဥပမာ: CUST-20260925-7834)
    @NotBlank(message = "Company customer code is required")
    private String companyCustomerCode;

    // အကောင့်အမျိုးအစား (CURRENT သို့မဟုတ် SAVINGS)
    @NotBlank(message = "Account type is required (CURRENT or SAVINGS)")
    private String accountType;

    // Approver ဖြစ်မည့် CEO ၏ Customer Code
    private String ceoCustomerCode;

    // Initiator ဖြစ်မည့် ငွေကိုင် (Accountant) ၏ Customer Code
    private String accountantCustomerCode;

    // Initiator ဖြစ်မည့် Maker ၏ Customer Code (Alias)
    private String makerCustomerCode;

    // CEO ၏ အချက်အလက်များ တိုက်ရိုက်ထည့်သွင်းနိုင်ရန် (Optional)
    private String ceoFullName;
    private String ceoEmail;
    private String ceoPhone;

    // Maker ၏ အချက်အလက်များ တိုက်ရိုက်ထည့်သွင်းနိုင်ရန် (Optional)
    private String makerFullName;
    private String makerEmail;
    private String makerPhone;

    // စတင်ထည့်သွင်းမည့် အပ်ငွေ (အနည်းဆုံး 0 သို့မဟုတ် ထို့ထက်ပိုရမည်)
    @DecimalMin(value = "0.0", inclusive = true, message = "Initial deposit must be greater than or equal to 0")
    private BigDecimal initialDeposit;

    // ငွေကြေးအမျိုးအစား (မထည့်ပါက Default "MMK" အဖြစ် သတ်မှတ်နိုင်သည်)
    private String currency;

    // အကောင့်စကားဝှက်
    private String accountPassword;

    public String getResolvedMakerCustomerCode() {
        if (makerCustomerCode != null && !makerCustomerCode.isBlank()) {
            return makerCustomerCode;
        }
        return accountantCustomerCode;
    }
}