package com.corebanking.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendPasswordSetupEmail(
            String recipientEmail,
            String setupLink,
            int expirationMinutes
    ) {
        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromEmail);
        message.setTo(recipientEmail);
        message.setSubject("Core Banking - Set Your Staff Password");

        message.setText(
            "Hello,\n\n"
            + "A Core Banking staff account has been created for you.\n\n"
            + "Use the link below to set your password:\n"
            + setupLink
            + "\n\n"
            + "This link expires in "
            + expirationMinutes
            + " minutes and can only be used once.\n\n"
            + "If you did not expect this email, contact your system administrator.\n\n"
            + "Core Banking System"
        );

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            ex.printStackTrace(); 
            throw new IllegalStateException("Unable to send password setup email", ex);
        }
    }

    public void sendStaffLoginOtpEmail(
            String recipientEmail,
            String otpCode,
            int expirationMinutes
    ) {
        System.out.println("========================================");
        System.out.println("[DEV ONLY] STAFF LOGIN OTP");
        System.out.println("Email : " + recipientEmail);
        System.out.println("OTP   : " + otpCode);
        System.out.println("Expires in : " + expirationMinutes + " minutes");
        System.out.println("========================================");

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromEmail);
        message.setTo(recipientEmail);
        message.setSubject("Core Banking - Staff Login OTP");

        message.setText(
            "Hello,\n\n"
            + "Your one-time password (OTP) for staff login is: "
            + otpCode
            + "\n\nThis OTP will expire in "
            + expirationMinutes
            + " minutes.\n\n"
            + "Do not share this OTP with anyone.\n\n"
            + "If you did not request this OTP, please contact your system administrator immediately.\n\n"
            + "Core Banking System"
        );

        try {
            mailSender.send(message);
        } catch (MailException ex) {
            log.error("Failed to send staff login OTP email to {}", recipientEmail, ex);
            throw new IllegalStateException("Unable to send staff login OTP email", ex);
        }
    }
}
