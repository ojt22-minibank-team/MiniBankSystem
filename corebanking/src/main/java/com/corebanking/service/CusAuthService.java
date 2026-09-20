package com.corebanking.service;

import com.corebanking.dto.CusLoginRequest;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.LoginAttempts;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.repository.CusAccountsRepository;
import com.corebanking.repository.CusCredentialsRepository;
import com.corebanking.repository.CusCustomerRepository;
import com.corebanking.repository.CusLoginAttemptsRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import com.corebanking.entity.OtpChallenges;
import com.corebanking.entity.enums.DeliveryChannel;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.repository.CusOtpChallengesRepository;

import java.security.SecureRandom;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CusAuthService {

    private final CusCustomerRepository customerRepository;
    private final CusAccountsRepository accountsRepository;
    private final CusCredentialsRepository credentialsRepository;
    private final CusLoginAttemptsRepository loginAttemptsRepository;
    private final PasswordEncoder passwordEncoder;
    private final CusOtpChallengesRepository otpChallengesRepository;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_MINUTES = 15;
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int MAX_OTP_RESENDS = 5;


    public Customers authenticateCredentials(CusLoginRequest request) {

        String identifier = request.getLoginIdentifier();

        // 1. Customer ID OR Account Number နဲ့ customer ရှာ
        Customers customer = findCustomer(identifier);

        // 2. Customer status စစ်
        validateCustomerStatus(customer);

        // 3. Customer credentials ရှာ
        CustomerCredentials credentials =
                credentialsRepository
                        .findById(customer.getCustomerId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Invalid login credentials."
                                )
                        );

        // 4. Login lock စစ်
        checkLoginLock(credentials);

        // 5. Password စစ်
        boolean passwordMatches =
                passwordEncoder.matches(
                        request.getPassword(),
                        credentials.getPasswordHash()
                );

        // 6. Password မှားရင်
        if (!passwordMatches) {

            handleFailedPassword(credentials);

            saveLoginAttempt(
                    identifier,
                    customer,
                    false,
                    "INVALID_PASSWORD"
            );

            throw new RuntimeException(
                    "Invalid login credentials."
            );
        }

        // 7. Password မှန်ရင် failed count reset
        credentials.setFailedLoginCount(0);
        credentials.setLockedUntil(null);

        credentialsRepository.save(credentials);

        // Credential authentication success history
        saveLoginAttempt(
                identifier,
                customer,
                true,
                null
        );

        // ဒီမှာ login complete မဖြစ်သေးဘူး
        // နောက်တစ်ဆင့် Email OTP verify လုပ်ရမယ်
        createLoginOtp(customer);
     // Password authentication success ဖြစ်ပြီးနောက်
     // Login MFA OTP create
        return customer;
    }
    private OtpChallenges createLoginOtp(Customers customer) {

        // 1. 6-digit OTP generate
        String rawOtp = generateOtp();

        // 2. OTP ကို hash လုပ်
        String otpHash = passwordEncoder.encode(rawOtp);

        // 3. Challenge group id create
        String challengeGroupId = UUID.randomUUID().toString();

        LocalDateTime now = LocalDateTime.now();

        // 4. OTP entity create
        OtpChallenges otpChallenge =
                OtpChallenges.builder()
                        .customer(customer)
                        .purpose(OtpPurpose.LOGIN)
                        .otpHash(otpHash)
                        .deliveryChannel(DeliveryChannel.EMAIL)
                        .destinationMasked(
                                maskEmail(customer.getEmail())
                        )
                        .attemptCount(0)
                        .maxAttempts(MAX_OTP_ATTEMPTS)
                        .expiresAt(
                                now.plusMinutes(OTP_EXPIRY_MINUTES)
                        )
                        .status(OtpStatus.ACTIVE)
                        .challengeGroupId(challengeGroupId)
                        .lastSentAt(now)
                        .maxResendAttempts(MAX_OTP_RESENDS)
                        .resendNo(0)
                        .build();

        // 5. Database save
        otpChallengesRepository.save(otpChallenge);

        // TEMPORARY testing only
        System.out.println("Generated OTP: " + rawOtp);

        return otpChallenge;
    }

    private Customers findCustomer(String identifier) {

        // Customer ID / Customer Code နဲ့အရင်ရှာ
        return customerRepository
                .findByCustomerCode(identifier)

                // မတွေ့ရင် Account Number နဲ့ရှာ
                .orElseGet(() ->
                        accountsRepository
                                .findByAccountNumber(identifier)
                                .map(Accounts::getCustomer)
                                .orElseThrow(() ->
                                        new RuntimeException(
                                                "Invalid login credentials."
                                        )
                                )
                );
    }


    private void validateCustomerStatus(Customers customer) {

        if (customer.getStatus() != CustomerStatus.ACTIVE) {

            throw new RuntimeException(
                    "Customer account is not active."
            );
        }
    }


    private void checkLoginLock(
            CustomerCredentials credentials) {

        LocalDateTime now = LocalDateTime.now();

        // locked_until = null ဆို lock မဖြစ်ထားဘူး
        if (credentials.getLockedUntil() == null) {
            return;
        }

        // Lock time မကုန်သေးရင် login reject
        if (credentials.getLockedUntil().isAfter(now)) {

            throw new RuntimeException(
                    "Account is temporarily locked. Please try again later."
            );
        }

        // Lock period 15 minutes ပြည့်သွားပြီ
        credentials.setFailedLoginCount(0);
        credentials.setLockedUntil(null);

        credentialsRepository.save(credentials);
    }


    private void handleFailedPassword(
            CustomerCredentials credentials) {

        int failedCount =
                credentials.getFailedLoginCount() + 1;

        credentials.setFailedLoginCount(failedCount);

        // Password 5 ကြိမ်ဆက်တိုက်မှား
        if (failedCount >= MAX_FAILED_ATTEMPTS) {

            credentials.setLockedUntil(
                    LocalDateTime.now()
                            .plusMinutes(LOCK_MINUTES)
            );
        }

        credentialsRepository.save(credentials);
    }


    private void saveLoginAttempt(
            String identifier,
            Customers customer,
            boolean success,
            String failureReason) {

        LoginAttempts attempt =
                LoginAttempts.builder()
                        .actorType(SessionSubjectType.CUSTOMER)
                        .loginIdentifier(identifier)
                        .customer(customer)
                        .success(success)
                        .failureReason(failureReason)
                        .build();

        loginAttemptsRepository.save(attempt);
    }
    
    private String generateOtp() {

        SecureRandom random = new SecureRandom();

        int otpNumber = 100000 + random.nextInt(900000);

        return String.valueOf(otpNumber);
    }
    private String maskEmail(String email) {

        if (email == null || !email.contains("@")) {
            return "******";
        }

        String[] parts = email.split("@");

        String name = parts[0];
        String domain = parts[1];

        if (name.length() <= 2) {
            return "**@" + domain;
        }

        return name.substring(0, 2)
                + "****@"
                + domain;
    }
}