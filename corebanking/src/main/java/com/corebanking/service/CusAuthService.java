package com.corebanking.service;

import com.corebanking.dto.CusLoginRequest;
import com.corebanking.dto.CusLoginResponse;

import com.corebanking.entity.Accounts;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.LoginAttempts;
import com.corebanking.entity.OtpChallenges;

import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.DeliveryChannel;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.SessionSubjectType;

import com.corebanking.repository.CusAccountsRepository;
import com.corebanking.repository.CusCredentialsRepository;
import com.corebanking.repository.CusCustomerRepository;
import com.corebanking.repository.CusLoginAttemptsRepository;
import com.corebanking.repository.CusOtpChallengesRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;
import com.corebanking.dto.CusOtpVerifyRequest;
import com.corebanking.dto.CusOtpVerifyResponse;

@Service
@RequiredArgsConstructor
public class CusAuthService {

    private final CusCustomerRepository customerRepository;
    private final CusAccountsRepository accountsRepository;
    private final CusCredentialsRepository credentialsRepository;
    private final CusLoginAttemptsRepository loginAttemptsRepository;
    private final CusOtpChallengesRepository otpChallengesRepository;
    private final PasswordEncoder passwordEncoder;

    // Login password rules
    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_MINUTES = 15;

    // OTP rules
    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int MAX_OTP_RESENDS = 5;

    private static final SecureRandom SECURE_RANDOM =
            new SecureRandom();


    // =========================================================
    // 1. CUSTOMER LOGIN - PASSWORD AUTHENTICATION
    // =========================================================

    public CusLoginResponse authenticateCredentials(
            CusLoginRequest request) {

        if (request == null
                || request.getLoginIdentifier() == null
                || request.getLoginIdentifier().isBlank()
                || request.getPassword() == null
                || request.getPassword().isBlank()) {

            throw new RuntimeException(
                    "Login identifier and password are required."
            );
        }

        String identifier =
                request.getLoginIdentifier().trim();

        Customers customer;

        try {

            customer = findCustomer(identifier);

        } catch (RuntimeException ex) {

            saveInvalidLoginAttempt(
                    identifier,
                    "INVALID_IDENTIFIER"
            );

            throw ex;
        }

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

        // 4. Login account lock ဖြစ်/မဖြစ် စစ်
        checkLoginLock(
                credentials,
                identifier,
                customer
        );

        // 5. Password စစ်
        boolean passwordMatches =
                passwordEncoder.matches(
                        request.getPassword(),
                        credentials.getPasswordHash()
                );


        // =====================================================
        // PASSWORD မှားရင်
        // =====================================================

        if (!passwordMatches) {

            // failed login count + 1
            // 5 ကြိမ်ရောက်ရင် 15 minutes lock
            handleFailedPassword(credentials);

            // login attempt history save
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


        // =====================================================
        // PASSWORD မှန်ရင်
        // =====================================================

        // Failed login count reset
        credentials.setFailedLoginCount(0);

        // Previous lock ရှိခဲ့ရင် clear
        credentials.setLockedUntil(null);

        credentialsRepository.save(credentials);

        
 


        // =====================================================
        // EMAIL OTP CREATE
        // =====================================================

        OtpChallenges otpChallenge =
                createLoginOtp(customer);
        


        // =====================================================
        // RESPONSE TO FRONTEND
        // =====================================================

        return new CusLoginResponse(
                true,
                "OTP has been sent to your registered email.",
                true,
                otpChallenge.getChallengeGroupId(),
                otpChallenge.getDestinationMasked()
        );
    }


    // =========================================================
    // 2. FIND CUSTOMER
    // Customer ID OR Account Number
    // =========================================================

    private Customers findCustomer(String identifier) {

        return customerRepository
                .findByCustomerCode(identifier)

                // Customer Code မတွေ့ရင်
                // Account Number နဲ့ရှာ
                .orElseGet(() ->
                        accountsRepository
                                .findByAccountNumber(identifier)

                                // Account ကနေ Customer ယူ
                                .map(Accounts::getCustomer)

                                .orElseThrow(() ->
                                        new RuntimeException(
                                                "Invalid login credentials."
                                        )
                                )
                );
    }


    // =========================================================
    // 3. CUSTOMER STATUS CHECK
    // =========================================================

    private void validateCustomerStatus(
            Customers customer) {

        if (customer.getStatus() != CustomerStatus.ACTIVE) {

            throw new RuntimeException(
                    "Customer account is not active."
            );
        }
    }


    // =========================================================
    // 4. LOGIN LOCK CHECK
    // =========================================================

    
    private void checkLoginLock(
            CustomerCredentials credentials,
            String identifier,
            Customers customer) {

        LocalDateTime now = LocalDateTime.now();

        if (credentials.getLockedUntil() == null) {
            return;
        }

        if (credentials.getLockedUntil().isAfter(now)) {

            saveLoginAttempt(
                    identifier,
                    customer,
                    false,
                    "ACCOUNT_LOCKED"
            );

            throw new RuntimeException(
                    "Account is temporarily locked. "
                            + "Please try again later."
            );
        }

        // Lock time expired
        credentials.setFailedLoginCount(0);
        credentials.setLockedUntil(null);

        credentialsRepository.save(credentials);
    }

    // =========================================================
    // 5. FAILED PASSWORD MANAGEMENT
    // =========================================================

    private void handleFailedPassword(
            CustomerCredentials credentials) {

        int failedCount =
                credentials.getFailedLoginCount() + 1;

        credentials.setFailedLoginCount(failedCount);


        // Password 5 ကြိမ်မှားရင်
        if (failedCount >= MAX_FAILED_ATTEMPTS) {

            credentials.setLockedUntil(
                    LocalDateTime.now()
                            .plusMinutes(LOCK_MINUTES)
            );
        }


        credentialsRepository.save(credentials);
    }


    // =========================================================
    // 6. LOGIN ATTEMPT HISTORY
    // =========================================================

    private void saveLoginAttempt(
            String identifier,
            Customers customer,
            boolean success,
            String failureReason) {

        LoginAttempts attempt =
                LoginAttempts.builder()

                        .actorType(
                                SessionSubjectType.CUSTOMER
                        )

                        .loginIdentifier(identifier)

                        .customer(customer)

                        .success(success)

                        .failureReason(failureReason)

                        .build();


        loginAttemptsRepository.save(attempt);
    }
    
    private void saveInvalidLoginAttempt(
            String identifier,
            String failureReason) {

        LoginAttempts attempt =
                LoginAttempts.builder()
                        .actorType(
                                SessionSubjectType.CUSTOMER
                        )
                        .loginIdentifier(identifier)
                        .success(false)
                        .failureReason(failureReason)
                        .build();

        loginAttemptsRepository.save(attempt);
    }


    // =========================================================
    // 7. GENERATE 6-DIGIT OTP
    // =========================================================

    private String generateOtp() {

        int otpNumber =
                100000
                        + SECURE_RANDOM.nextInt(900000);

        return String.valueOf(otpNumber);
    }


    // =========================================================
    // 8. CREATE LOGIN OTP
    // =========================================================

    private OtpChallenges createLoginOtp(
            Customers customer) {


        // Registered email ရှိရမယ်
        if (customer.getEmail() == null
                || customer.getEmail().isBlank()) {

            throw new RuntimeException(
                    "No registered email address is available for MFA."
            );
        }
// previous ACTIVE login otp ‌ေတွ expire လုပ်
        invalidateOldLoginOtps(customer);
        // 1. 6-digit OTP generate
        String rawOtp = generateOtp();


        // 2. OTP Hash
        String otpHash =
                passwordEncoder.encode(rawOtp);


        // 3. Challenge Group ID
        String challengeGroupId =
                UUID.randomUUID().toString();


        LocalDateTime now =
                LocalDateTime.now();


        // 4. OTP Challenge create
        OtpChallenges otpChallenge =
                OtpChallenges.builder()

                        .customer(customer)

                        .purpose(
                                OtpPurpose.LOGIN
                        )

                        .otpHash(otpHash)

                        .deliveryChannel(
                                DeliveryChannel.EMAIL
                        )

                        .destinationMasked(
                                maskEmail(
                                        customer.getEmail()
                                )
                        )

                        .attemptCount(0)

                        .maxAttempts(
                                MAX_OTP_ATTEMPTS
                        )

                        .expiresAt(
                                now.plusMinutes(
                                        OTP_EXPIRY_MINUTES
                                )
                        )

                        .status(
                                OtpStatus.ACTIVE
                        )

                        .challengeGroupId(
                                challengeGroupId
                        )

                        .lastSentAt(now)

                        .maxResendAttempts(
                                MAX_OTP_RESENDS
                        )

                        .resendNo(0)

                        .build();


        // 5. Database save
        OtpChallenges savedOtp =
                otpChallengesRepository.save(
                        otpChallenge
                );


        /*
         * TEMPORARY FOR DEVELOPMENT ONLY
         *
         * Email sending မရေးရသေးလို့
         * OTP ကို console မှာ ယာယီကြည့်မယ်။
         *
         * Email service အလုပ်လုပ်ပြီဆို
         * ဒီ line ကို ဖျက်ရမယ်။
         */
        System.out.println(
                "Generated OTP: " + rawOtp
        );


        return savedOtp;
    }

    public CusOtpVerifyResponse verifyLoginOtp(
            CusOtpVerifyRequest request) {

        // =====================================================
        // 1. REQUEST VALIDATION
        // =====================================================

        if (request == null
                || request.getChallengeGroupId() == null
                || request.getChallengeGroupId().isBlank()
                || request.getOtp() == null
                || request.getOtp().isBlank()) {

            throw new RuntimeException(
                    "OTP verification information is required."
            );
        }


        String challengeGroupId =
                request.getChallengeGroupId().trim();

        String enteredOtp =
                request.getOtp().trim();


        // =====================================================
        // 2. OTP CHALLENGE ရှာ
        // =====================================================

        OtpChallenges otpChallenge =
                otpChallengesRepository
                        .findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(
                                challengeGroupId,
                                OtpPurpose.LOGIN
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Invalid OTP challenge."
                                )
                        );


        // =====================================================
        // 3. OTP STATUS စစ်
        // =====================================================

        if (otpChallenge.getStatus() == OtpStatus.CONSUMED) {

            throw new RuntimeException(
                    "This OTP has already been used."
            );
        }


        if (otpChallenge.getStatus() == OtpStatus.EXPIRED) {

            throw new RuntimeException(
                    "OTP has expired."
            );
        }


        if (otpChallenge.getStatus() == OtpStatus.BLOCKED) {

            throw new RuntimeException(
                    "OTP verification has been blocked."
            );
        }


        // ACTIVE မဟုတ်ရင် reject
        if (otpChallenge.getStatus() != OtpStatus.ACTIVE) {

            throw new RuntimeException(
                    "OTP is not active."
            );
        }


        LocalDateTime now =
                LocalDateTime.now();


        // =====================================================
        // 4. OTP EXPIRY စစ်
        // =====================================================

        if (otpChallenge.getExpiresAt() == null
                || !otpChallenge.getExpiresAt().isAfter(now)) {

            otpChallenge.setStatus(
                    OtpStatus.EXPIRED
            );

            otpChallengesRepository.save(
                    otpChallenge
            );

            throw new RuntimeException(
                    "OTP has expired."
            );
        }


        // =====================================================
        // 5. MAX ATTEMPTS စစ်
        // =====================================================

        if (otpChallenge.getAttemptCount()
                >= otpChallenge.getMaxAttempts()) {

            otpChallenge.setStatus(
                    OtpStatus.BLOCKED
            );

            otpChallengesRepository.save(
                    otpChallenge
            );

            throw new RuntimeException(
                    "OTP verification has been blocked."
            );
        }


        // =====================================================
        // 6. OTP 6-DIGIT FORMAT + HASH VERIFY
        // =====================================================

        boolean validOtpFormat =
                enteredOtp.matches("\\d{6}");

        boolean otpMatches =
                validOtpFormat
                        && passwordEncoder.matches(
                                enteredOtp,
                                otpChallenge.getOtpHash()
                        );


        // =====================================================
        // 7. OTP မှားရင်
        // =====================================================

        if (!otpMatches) {

            handleFailedOtpAttempt(
                    otpChallenge
            );

            throw new RuntimeException(
                    "Invalid OTP."
            );
        }


        // =====================================================
        // 8. OTP မှန်ရင် CONSUMED
        // =====================================================

        otpChallenge.setStatus(
                OtpStatus.CONSUMED
        );

        otpChallenge.setConsumedAt(now);

        otpChallengesRepository.save(
                otpChallenge
        );


        // =====================================================
        // 9. CUSTOMER + CREDENTIALS
        // =====================================================

        Customers customer =
                otpChallenge.getCustomer();

        CustomerCredentials credentials =
                credentialsRepository
                        .findById(
                                customer.getCustomerId()
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Customer credentials not found."
                                )
                        );


        

        // =====================================================
        // 10. FIRST LOGIN SETUP လို/မလို
        // =====================================================

        boolean passwordChangeRequired =
                credentials.isMustChangePassword();

        boolean pinSetupRequired =
                credentials.getTransactionPinHash() == null
                        || credentials
                                .getTransactionPinHash()
                                .isBlank();

        boolean firstLoginSetupRequired =
                passwordChangeRequired
                        || pinSetupRequired;


        // =====================================================
        // 11. RESPONSE
        // =====================================================

        if (firstLoginSetupRequired) {

            return new CusOtpVerifyResponse(
                    true,
                    "OTP verified. Please complete first-time setup.",
                    true,
                    passwordChangeRequired,
                    pinSetupRequired
            );
        }


        return new CusOtpVerifyResponse(
                true,
                "OTP verified successfully.",
                false,
                false,
                false
        );
    }

    // =========================================================
    // 9. MASK CUSTOMER EMAIL
    // =========================================================

    private String maskEmail(String email) {

        if (email == null
                || !email.contains("@")) {

            return "******";
        }


        String[] parts =
                email.split("@", 2);

        String name = parts[0];
        String domain = parts[1];


        if (name.length() <= 2) {

            return "**@" + domain;
        }


        return name.substring(0, 2)
                + "****@"
                + domain;
    }
    
    private void invalidateOldLoginOtps(
            Customers customer) {

        var activeOtps =
                otpChallengesRepository
                        .findByCustomerAndPurposeAndStatus(
                                customer,
                                OtpPurpose.LOGIN,
                                OtpStatus.ACTIVE
                        );

        for (OtpChallenges otp : activeOtps) {

            otp.setStatus(OtpStatus.EXPIRED);
        }

        otpChallengesRepository.saveAll(activeOtps);
    }
    private void handleFailedOtpAttempt(
            OtpChallenges otpChallenge) {

        int failedAttempts =
                otpChallenge.getAttemptCount() + 1;

        otpChallenge.setAttemptCount(
                failedAttempts
        );


        // 5 ကြိမ်မှားသွားရင် OTP block
        if (failedAttempts
                >= otpChallenge.getMaxAttempts()) {

            otpChallenge.setStatus(
                    OtpStatus.BLOCKED
            );
        }


        otpChallengesRepository.save(
                otpChallenge
        );
    }
}