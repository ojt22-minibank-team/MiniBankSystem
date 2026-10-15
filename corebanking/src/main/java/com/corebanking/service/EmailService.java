
package com.corebanking.service;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

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
}