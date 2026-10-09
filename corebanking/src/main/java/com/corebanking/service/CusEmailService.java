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

    // LOGIN OTP EMAIL
   
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
                        + "\n\nThis OTP will expire in 5 min."
                        + "\n\nDo not share this OTP with anyone."
        );

        mailSender.send(
                message
        );
    }
}