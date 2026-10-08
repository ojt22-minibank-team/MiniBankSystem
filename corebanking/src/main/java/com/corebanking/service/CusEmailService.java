package com.corebanking.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CusEmailService {

    private final JavaMailSender mailSender;

    /**
     * Customer Login အတွက် OTP Code အား Email သို့ ပေးပို့ခြင်း
     */
    public void sendLoginOtp(String toEmail, String otp) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setTo(toEmail);
        message.setSubject("Online Banking Login OTP");
        message.setText(
                "Your OTP code is: " + otp
                        + "\n\nThis OTP will expire in 5 minutes."
                        + "\n\nDo not share this OTP with anyone."
        );
        mailSender.send(message);
    }

    /**
     * Customer အသစ် စာရင်းသွင်းပြီးချိန်တွင် Customer Code နှင့် Temporary Password အား 
     * Customer ၏ Email သို့ တစ်ခါတည်း ပေးပို့ခြင်း
     */
    public void sendCustomerRegistrationCredentials(
            String toEmail, 
            String customerName, 
            String customerCode, 
            String tempPassword) {
        
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("🏦 Core Banking - Customer Registration & Login Credentials");
            message.setText(
                    "မင်္ဂလာပါ " + customerName + " ခင်ဗျာ,\n\n"
                    + "Core Banking စနစ်တွင် သင်၏ Customer အကောင့်မှတ်ပုံတင်ခြင်း အောင်မြင်စွာ ပြီးမြောက်ပါပြီ။\n\n"
                    + "သင်၏ တရားဝင် စနစ်သုံး အချက်အလက်များမှာ အောက်ပါအတိုင်း ဖြစ်ပါသည်:\n"
                    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                    + "🔹 Customer Code      : " + customerCode + "\n"
                    + "🔹 Temporary Password : " + tempPassword + "\n"
                    + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                    + "Online/Mobile Banking စနစ်သို့ စတင်ဝင်ရောက်ရန် အထက်ပါ Customer Code နှင့် ယာယီစကားဝှက်ကို အသုံးပြုနိုင်ပါသည်။\n"
                    + "⚠ လုံခြုံရေးအရ ပထမဆုံးအကြိမ် ဝင်ရောက်ပြီးသည်နှင့် စကားဝှက်အား ချက်ချင်း အသစ်ပြောင်းလဲပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။\n\n"
                    + "လေးစားစွာဖြင့်,\n"
                    + "Core Banking Team"
            );

            mailSender.send(message);
            System.out.println("✅ [EmailService] Credentials email sent successfully to: " + toEmail + " (Code: " + customerCode + ")");
        } catch (Exception e) {
            System.err.println("❌ [EmailService] Failed to send credentials email to " + toEmail + ": " + e.getMessage());
        }
    }

    /**
     * Account Number နှင့် Temporary Password အား Customer Gmail သို့ ပေးပို့ခြင်း
     */
    public void sendAccountOpeningConfirmation(
            String toEmail, 
            String customerName, 
            String accountNumber, 
            String accountType, 
            String tempPassword) {
        
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("🏦 Core Banking - Account Credentials & Temporary Password");
            message.setText(
                    "မင်္ဂလာပါ " + customerName + " ခင်ဗျာ,\n\n"
                    + "သင့်၏ Core Banking ဘဏ်အကောင့်ကို အောင်မြင်စွာ ဖွင့်လှစ်ပြီး ဖြစ်ပါသည်။\n\n"
                    + "🔹 Account Number: " + accountNumber + "\n"
                    + "🔹 Account Type: " + accountType + "\n"
                    + "🔹 Temporary Password: " + tempPassword + "\n\n"
                    + "Online/Mobile Banking သို့ ဝင်ရောက်ရန် အထက်ပါ ယာယီစကားဝှက်ကို အသုံးပြုနိုင်ပါသည်။\n"
                    + "လုံခြုံရေးအရ ပထမဆုံးအကြိမ် ဝင်ရောက်ပြီးသည်နှင့် စကားဝှက်ကို ချက်ချင်း ပြောင်းလဲပေးပါရန် မေတ္တာရပ်ခံအပ်ပါသည်။\n\n"
                    + "လေးစားစွာဖြင့်,\nCore Banking Team"
            );

            mailSender.send(message);
            System.out.println("Credentials email sent to: " + toEmail);
        } catch (Exception e) {
            System.err.println("Failed to send credentials email to " + toEmail + ": " + e.getMessage());
        }
    }
}