package com.corebanking.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CusEmailService {
//khin cusemailservice
	
    private final JavaMailSender mailSender;


    /**
     * ၂။ ဘဏ်အကောင့် (Current / Savings) ဖွင့်လှစ်ပြီးတိုင်း Account နံပါတ်နှင့် Type သာ ပို့သော Email (Password မပါပါ)
     */
    public void sendAccountOpeningDetailsEmail(
            String toEmail,
            String otp) {

        SimpleMailMessage message =
                new SimpleMailMessage();

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