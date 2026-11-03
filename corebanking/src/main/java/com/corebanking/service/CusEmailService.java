package com.corebanking.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;


@Slf4j
@Service
@RequiredArgsConstructor
public class CusEmailService {

    private final JavaMailSender mailSender;

    @Async("mailTaskExecutor")
    public void sendCorporateLoginOtp(String email, String otp) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(email);
            message.setSubject("Corporate Banking Login OTP");
            message.setText(
                    "Your Corporate Banking login OTP code is: "
                            + otp
                            + "\n\nThis OTP will expire in 5 minutes."
                            + "\n\nDo not share this OTP with anyone."
                            + "\n\nIf you did not request this login, please ignore this email."
            );
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send corporate login OTP to {}", email, ex);
        }
    }


    // =========================================================
    // LOGIN OTP EMAIL
    // =========================================================

    
    @Async("mailTaskExecutor")
    public void sendLoginOtp(
            String toEmail,
            String otp) {

        // ==========================================
        // DEV LOG
        // ==========================================

        System.out.println(
                "========================================"
        );

        System.out.println(
                "[DEV ONLY] LOGIN OTP"
        );

        System.out.println(
                "Email : " + toEmail
        );

        System.out.println(
                "OTP   : " + otp
        );

        System.out.println(
                "Expires in : 5 minutes"
        );

        System.out.println(
                "========================================"
        );


        // ==========================================
        // SEND OTP EMAIL
        // ==========================================

        try {
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
        } catch (Exception ex) {
            log.error("Failed to send login OTP to {}", toEmail, ex);
        }
    }


    // =========================================================
    // PASSWORD RESET OTP EMAIL
    // =========================================================

    @Async("mailTaskExecutor")
    public void sendPasswordResetOtp(
            String toEmail,
            String otp) {

        try {
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
        } catch (Exception ex) {
            log.error("Failed to send password reset OTP to {}", toEmail, ex);
        }
    }
    
    @Async("mailTaskExecutor")
    public void sendPinResetOtp(
            String toEmail,
            String otp) {

        try {
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
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send PIN reset OTP to {}", toEmail, ex);
        }
    }

    
    public void sendCustomerRegistrationCredentials(
            String toEmail, 
            String customerName, 
            String customerCode, 
            String tempPassword) {
        
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(toEmail);
                message.setSubject("🏦 Core Banking - Customer Registration & Login Credentials");
                message.setText(
                		"Dear " + customerName + ",\n\n"
                                + "Your customer account has been successfully registered in the Core Banking system.\n\n"
                                + "Your official credentials are as follows:\n"
                                + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                                + "🔹 Customer Code      : " + customerCode + "\n"
                                + "🔹 Temporary Password : " + tempPassword + "\n"
                                + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                                + "You can use the Customer Code and temporary password above to log in to Online/Mobile Banking.\n"
                                + "⚠ For security reasons, please change your password immediately after your first login.\n\n"
                                + "Best regards,\n"
                                + "Core Banking Team"
                );

                mailSender.send(message);
                System.out.println("✅ [EmailService] Credentials email sent successfully to: " + toEmail + " (Code: " + customerCode + ")");
            } catch (Exception e) {
                System.err.println("❌ [EmailService] Failed to send credentials email to " + toEmail + ": " + e.getMessage());
            }
        });
    }

  
    public void sendAccountOpeningConfirmation(
            String toEmail, 
            String customerName, 
            String accountNumber, 
            String accountType, 
            String tempPassword) {
        sendAccountOpeningConfirmation(toEmail, customerName, null, accountNumber, accountType, tempPassword);
    }

    
    public void sendAccountOpeningConfirmation(
            String toEmail, 
            String customerName, 
            String customerCode,
            String accountNumber, 
            String accountType, 
            String tempPassword) {
        
        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(toEmail);
                message.setSubject("🏦 Core Banking - Account Credentials & Temporary Password");
                
                StringBuilder text = new StringBuilder();
                text.append("Dear ").append(customerName).append(",\n\n")
                    .append("Your Core Banking account has been successfully opened.\n\n");
                if (customerCode != null && !customerCode.isBlank()) {
                    text.append("🔹 Customer Code      : ").append(customerCode).append("\n");
                }
                text.append("🔹 Account Number      : ").append(accountNumber).append("\n")
                    .append("🔹 Account Type        : ").append(accountType).append("\n")
                    .append("🔹 Temporary Password  : ").append(tempPassword).append("\n\n")
                    .append("You can use the temporary password above to log in to Online/Mobile Banking.\n")
                    .append("For security reasons, please change your password immediately after your first login.\n\n")
                    .append("Best regards,\nCore Banking Team");

                message.setText(text.toString());
                mailSender.send(message);
                System.out.println("Credentials email sent to: " + toEmail);
            } catch (Exception e) {
                System.err.println("Failed to send credentials email to " + toEmail + ": " + e.getMessage());
            }
        });
    }

   
    public void sendCorporateAccountCredentials(
            String toEmail,
            String recipientName,
            String companyName,
            String companyCustomerCode,
            String corporateUserCode,
            String roleName,
            String accountNumber,
            String accountType,
            String tempPassword) {

        java.util.concurrent.CompletableFuture.runAsync(() -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setTo(toEmail);
                message.setSubject("Core Banking - Corporate Account Credentials (" + companyName + ")");
                message.setText(
                        "Dear " + recipientName + ",\n\n"
                        + "The Corporate Banking account registration for " + companyName + " has been successfully completed in the Core Banking system.\n\n"
                        + "Your official credentials are as follows:\n"
                        + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                        + "🔹 Company Name          : " + companyName + "\n"
                        + "🔹 Company Customer Code : " + companyCustomerCode + "\n"
                        + "🔹 Corporate User Code   : " + corporateUserCode + "\n"
                        + "🔹 Assigned Role         : " + roleName + "\n"
                        + "🔹 Account Number        : " + accountNumber + "\n"
                        + "🔹 Account Type          : " + accountType + "\n"
                        + "🔹 Temporary Password    : " + tempPassword + "\n"
                        + "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                        + "You can use the Company Customer Code, Corporate User Code, and temporary password above to log in to Corporate Online Banking.\n\n"
                        + "⚠ For security reasons, please change your password immediately after your first login.\n\n"
                        + "Best regards,\n"
                        + "Core Banking Team"
                );

                mailSender.send(message);
                System.out.println("✅ [EmailService] Corporate credentials email sent successfully to: " + toEmail + " (" + corporateUserCode + ")");
            } catch (Exception e) {
                System.err.println("❌ [EmailService] Failed to send corporate credentials email to " + toEmail + ": " + e.getMessage());
            }
        });
    }
}
