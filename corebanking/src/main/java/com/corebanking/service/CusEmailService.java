package com.corebanking.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;


@Service
@RequiredArgsConstructor
public class CusEmailService {

    private final JavaMailSender mailSender;


    // =========================================================
    // LOGIN OTP EMAIL
    // =========================================================

    public void sendLoginOtp(
            String toEmail,
            String otp) {

        SimpleMailMessage message =
                new SimpleMailMessage();


        message.setTo(
                toEmail
        );


        message.setSubject(
                "Online Banking Login OTP"
        );


        message.setText(
                "Your OTP code is: "
                        + otp
                        + "\n\nThis OTP will expire in 5 minutes."
                        + "\n\nDo not share this OTP with anyone."
        );


        mailSender.send(
                message
        );
    }


    // =========================================================
    // PASSWORD RESET OTP EMAIL
    // =========================================================

    public void sendPasswordResetOtp(
            String toEmail,
            String otp) {

        SimpleMailMessage message =
                new SimpleMailMessage();


        message.setTo(
                toEmail
        );


        message.setSubject(
                "Online Banking Password Reset OTP"
        );


        message.setText(
                "Your password reset OTP code is: "
                        + otp
                        + "\n\nThis OTP will expire in 5 minutes."
                        + "\n\nDo not share this OTP with anyone."
                        + "\n\nIf you did not request a password reset, "
                        + "please ignore this email."
        );


        mailSender.send(
                message
        );
    }
    
    public void sendPinResetOtp(
            String toEmail,
            String otp) {

        SimpleMailMessage message =
                new SimpleMailMessage();

        message.setTo(
                toEmail
        );

        message.setSubject(
                "Online Banking Transaction PIN Reset OTP"
        );

        message.setText(
                "Your Transaction PIN reset OTP code is: "
                        + otp
                        + "\n\nThis OTP will expire in 5 minutes."
                        + "\n\nDo not share this OTP with anyone."
        );

        mailSender.send(
                message
        );
    }
    
    /**
     * Group 2 (Account Module) အတွက်:
     * ဘဏ်အကောင့် အောင်မြင်စွာ ဖွင့်လှစ်ပြီးကြောင်း Customer ဆီသို့ အတည်ပြုချက် Email ပေးပို့ခြင်း
     */
    /**
     * Account Number နှင့် Temporary Password အား Customer Gmail သို့ ပေးပို့ခြင်း
     */
    public void sendAccountOpeningConfirmation(String toEmail, String customerName, String accountNumber, String accountType, String tempPassword) {
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