package com.corebanking.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class CusEmailService {

    private final JavaMailSender mailSender;


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
}