package com.corebanking.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CustomerEmailService {

    private final JavaMailSender mailSender;

    /***
     * ၁။ Customer Register ဖြစ်ချိန်တွင် Customer Code နှင့် Login Password ပို့သော Email
     */
    public void sendCustomerRegistrationEmail(String toEmail, String customerName, String customerCode, String tempPassword) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("🏦 Core Banking - Customer Registration & Login Credentials");
            message.setText(
                    "မင်္ဂလာပါ " + customerName + " ခင်ဗျာ,\n\n"
                    + "Core Banking စနစ်တွင် သင်၏ Customer အကောင့်မှတ်ပုံတင်ခြင်း အောင်မြင်စွာ ပြီးမြောက်ပါပြီ။\n\n"
                    + "Online/Mobile Banking သို့ ဝင်ရောက်ရန် သင်၏ သီးသန့် Login အချက်အလက်များမှာ အောက်ပါအတိုင်း ဖြစ်ပါသည်:\n"
                    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    + "🔹 Customer Code      : " + customerCode + "\n"
                    + "🔹 Temporary Password : " + tempPassword + "\n"
                    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                    + "⚠ လုံခြုံရေးအရ ပထမဆုံးအကြိမ် ဝင်ရောက်ပြီးသည်နှင့် စကားဝှက်ကို ချက်ချင်း ပြောင်းလဲပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။\n\n"
                    + "လေးစားစွာဖြင့်,\n"
                    + "Core Banking Team"
            );
            mailSender.send(message);
            System.out.println("✅ Customer Registration email sent to: " + toEmail);
        } catch (Exception e) {
            System.err.println("❌ Failed to send registration email: " + e.getMessage());
        }
    }

    /**
     * ၂။ ဘဏ်အကောင့် (Current / Savings) ဖွင့်လှစ်ပြီးတိုင်း Account နံပါတ်နှင့် Type သာ ပို့သော Email (Password မပါပါ)
     */
    public void sendAccountOpeningDetailsEmail(
            String toEmail,
            String customerName,
            String accountNumber,
            String accountType) {

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("🏦 Core Banking - New Bank Account Opened (" + accountType + ")");
            message.setText(
                    "မင်္ဂလာပါ " + customerName + " ခင်ဗျာ,\n\n"
                    + "သင့်အတွက် Core Banking ဘဏ်အကောင့်အသစ်ကို အောင်မြင်စွာ ဖွင့်လှစ်ပေးပြီး ဖြစ်ပါသည်။\n\n"
                    + "ဘဏ်စာရင်း အချက်အလက်များ:\n"
                    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    + "🔹 Account Number : " + accountNumber + "\n"
                    + "🔹 Account Type   : " + accountType + "\n"
                    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                    + "အထက်ပါ ဘဏ်အကောင့်ကို အသုံးပြုရန် သင်၏ မူလ Customer Code နှင့် Password ဖြင့် Online Banking သို့ Login ဝင်ရောက် စစ်ဆေးနိုင်ပါသည်။\n\n"
                    + "လေးစားစွာဖြင့်,\n"
                    + "Core Banking Team"
            );

            mailSender.send(message);
            System.out.println("✅ Account Details email sent to: " + toEmail + " (Account: " + accountNumber + ")");
        } catch (Exception e) {
            System.err.println("❌ Failed to send account details email to " + toEmail + ": " + e.getMessage());
        }
    }

    /**
     * ၃။ Corporate Account ဖွင့်လှစ်ပြီးချိန်တွင် ကုမ္ပဏီ၏ တရားဝင် Email သို့ အသိပေးစာ ပေးပို့ခြင်း
     */
    public void sendCorporateAccountOpeningToCompany(
            String companyEmail,
            String companyName,
            String companyCustomerCode,
            String accountNumber,
            String accountType) {

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(companyEmail);
            message.setSubject("🏦 Core Banking - Corporate Account Opening Confirmation (" + companyName + ")");
            message.setText(
                    "မင်္ဂလာပါ " + companyName + ",\n\n"
                    + "သင်တို့၏ ကုမ္ပဏီအတွက် Core Banking Corporate Account ကို အောင်မြင်စွာ ဖွင့်လှစ်ပြီး ဖြစ်ပါသည်။\n\n"
                    + "ကုမ္ပဏီ ဘဏ်စာရင်းဆိုင်ရာ အချက်အလက်များ:\n"
                    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    + "• Company Customer Code : " + companyCustomerCode + "\n"
                    + "• Account Number        : " + accountNumber + "\n"
                    + "• Account Type          : " + accountType + "\n"
                    + "• Currency              : MMK\n"
                    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                    + "အဆိုပါ အကောင့်အား အသုံးပြုရန် ခန့်အပ်ထားသော CEO (Approver) နှင့် Accountant (Maker) တို့ထံသို့ မိမိတို့၏ သီးသန့် Login Credentials များအား ပေးပို့ထားပြီး ဖြစ်ပါသည်။\n\n"
                    + "လေးစားစွာဖြင့်,\n"
                    + "Core Banking Team"
            );

            mailSender.send(message);
            System.out.println("✅ Official Corporate Account email sent to Company: " + companyEmail);
        } catch (Exception e) {
            System.err.println("❌ Failed to send email to Company " + companyEmail + ": " + e.getMessage());
        }
    }

    /**
     * ၄။ Corporate Signatory (CEO / Accountant) တစ်ဦးချင်းစီထံ သီးခြား Role & Password ပေးပို့ခြင်း
     */
    public void sendCorporateSignatoryWelcome(
            String toEmail,
            String signatoryName,
            String roleName,
            String companyName,
            String customerCode,
            String accountNumber,
            String accountType,
            String tempPassword) {

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("🏦 Core Banking - Corporate Account Credentials (" + companyName + ")");
            message.setText(
                    "မင်္ဂလာပါ " + signatoryName + " ခင်ဗျာ,\n\n"
                    + companyName + " အတွက် Core Banking Corporate Account ကို အောင်မြင်စွာ ဖွင့်လှစ်ပြီး ဖြစ်ပါသည်။\n"
                    + "သင့်အား ဤအကောင့်အတွက် တရားဝင် [" + roleName + "] အဖြစ် သတ်မှတ်ထားရှိပါသည်။\n\n"
                    + "သင်၏ တရားဝင် စနစ်သုံး အချက်အလက်များမှာ အောက်ပါအတိုင်း ဖြစ်ပါသည်:\n"
                    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    + "• Company Name       : " + companyName + "\n"
                    + "• Assigned Role      : " + roleName + "\n"
                    + "• Account Number     : " + accountNumber + " (" + accountType + ")\n"
                    + "• Your Customer Code : " + customerCode + "\n"
                    + "• Temporary Password : " + tempPassword + "\n"
                    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                    + "Online/Mobile Banking သို့ ဝင်ရောက်ရန် အထက်ပါ Customer Code နှင့် ယာယီစကားဝှက်ကို အသုံးပြုနိုင်ပါသည်။\n"
                    + "⚠ လုံခြုံရေးအရ ပထမဆုံးအကြိမ် ဝင်ရောက်ပြီးသည်နှင့် စကားဝှက်ကို ချက်ချင်း ပြောင်းလဲပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။\n\n"
                    + "လေးစားစွာဖြင့်,\n"
                    + "Core Banking Team"
            );

            mailSender.send(message);
            System.out.println("✅ Corporate Signatory Email sent to " + toEmail + " (" + roleName + ")");
        } catch (Exception e) {
            System.err.println("❌ Failed to send Corporate Signatory Email to " + toEmail + ": " + e.getMessage());
        }
    }
}