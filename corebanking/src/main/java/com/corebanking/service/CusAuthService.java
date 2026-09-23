package com.corebanking.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.corebanking.dto.CusLoginRequest;
import com.corebanking.dto.CusLoginResponse;
import com.corebanking.dto.CusOtpResendRequest;
import com.corebanking.dto.CusOtpResendResponse;
import com.corebanking.dto.CusOtpVerifyRequest;
import com.corebanking.dto.CusOtpVerifyResponse;
import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.AuthSessions;
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
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCredentialsRepository;
import com.corebanking.repository.CusCustomerRepository;
import com.corebanking.repository.CusLoginAttemptsRepository;
import com.corebanking.repository.CusOtpChallengesRepository;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.repository.CusJwtRevokedTokensRepository;

import io.jsonwebtoken.Claims;

import java.time.ZoneId;

import lombok.RequiredArgsConstructor;

import org.springframework.transaction.annotation.Transactional;
@Service
@RequiredArgsConstructor
public class CusAuthService {

    private final CusCustomerRepository customerRepository;
    private final CusAccountsRepository accountsRepository;
    private final CusCredentialsRepository credentialsRepository;
    private final CusLoginAttemptsRepository loginAttemptsRepository;
    private final CusOtpChallengesRepository otpChallengesRepository;
    private final PasswordEncoder passwordEncoder;
    private final CusAuthSessionsRepository authSessionsRepository;
    private final CusJwtService cusJwtService;
    private final CusSessionService cusSessionService;
    private final CusJwtRevokedTokensRepository jwtRevokedTokensRepository;



    // =========================================================
    // LOGIN RULES
    // =========================================================

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_MINUTES = 15;


    // =========================================================
    // OTP RULES
    // =========================================================

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

        // -----------------------------------------
        // Request validation
        // -----------------------------------------

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


        // -----------------------------------------
        // Customer ID / Account Number နဲ့ရှာ
        // -----------------------------------------

        try {

            customer = findCustomer(identifier);

        } catch (RuntimeException ex) {

            saveInvalidLoginAttempt(
                    identifier,
                    "INVALID_IDENTIFIER"
            );

            throw ex;
        }


        // -----------------------------------------
        // Customer status စစ်
        // -----------------------------------------

        validateCustomerStatus(customer);


        // -----------------------------------------
        // Customer Credentials ရှာ
        // -----------------------------------------

        CustomerCredentials credentials =
                credentialsRepository
                        .findById(customer.getCustomerId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Invalid login credentials."
                                )
                        );


        // -----------------------------------------
        // Login lock စစ်
        // -----------------------------------------

        checkLoginLock(
                credentials,
                identifier,
                customer
        );


        // -----------------------------------------
        // Password verify
        // -----------------------------------------

        boolean passwordMatches =
                passwordEncoder.matches(
                        request.getPassword(),
                        credentials.getPasswordHash()
                );


        // =====================================================
        // PASSWORD မှားရင်
        // =====================================================

        if (!passwordMatches) {

            handleFailedPassword(
                    credentials
            );


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

        credentials.setFailedLoginCount(0);

        credentials.setLockedUntil(null);

        credentialsRepository.save(
                credentials
        );


        // =====================================================
        // EMAIL OTP CREATE
        // =====================================================

        OtpChallenges otpChallenge =
                createLoginOtp(customer);


        // =====================================================
        // FRONTEND RESPONSE
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

    private Customers findCustomer(
            String identifier) {

        return customerRepository
                .findByCustomerCode(identifier)

                .orElseGet(() ->
                        accountsRepository
                                .findByAccountNumber(identifier)

                                .map(
                                        Accounts::getCustomer
                                )

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

        if (customer.getStatus()
                != CustomerStatus.ACTIVE) {

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

        LocalDateTime now =
                LocalDateTime.now();


        // Lock မဖြစ်ထားရင်
        if (credentials.getLockedUntil() == null) {

            return;
        }


        // Lock time မကုန်သေးရင်
        if (credentials
                .getLockedUntil()
                .isAfter(now)) {

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


        // -----------------------------------------
        // 15 minutes ပြည့်ပြီး lock expired
        // -----------------------------------------

        credentials.setFailedLoginCount(0);

        credentials.setLockedUntil(null);

        credentialsRepository.save(
                credentials
        );
    }


    // =========================================================
    // 5. FAILED PASSWORD MANAGEMENT
    // =========================================================

    private void handleFailedPassword(
            CustomerCredentials credentials) {

        int failedCount =
                credentials.getFailedLoginCount() + 1;


        credentials.setFailedLoginCount(
                failedCount
        );


        // Password 5 ကြိမ်မှား
        if (failedCount
                >= MAX_FAILED_ATTEMPTS) {

            credentials.setLockedUntil(
                    LocalDateTime.now()
                            .plusMinutes(
                                    LOCK_MINUTES
                            )
            );
        }


        credentialsRepository.save(
                credentials
        );
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

                        .loginIdentifier(
                                identifier
                        )

                        .customer(
                                customer
                        )

                        .success(
                                success
                        )

                        .failureReason(
                                failureReason
                        )

                        .build();


        loginAttemptsRepository.save(
                attempt
        );
    }


    private void saveInvalidLoginAttempt(
            String identifier,
            String failureReason) {

        LoginAttempts attempt =
                LoginAttempts.builder()

                        .actorType(
                                SessionSubjectType.CUSTOMER
                        )

                        .loginIdentifier(
                                identifier
                        )

                        .success(false)

                        .failureReason(
                                failureReason
                        )

                        .build();


        loginAttemptsRepository.save(
                attempt
        );
    }


    // =========================================================
    // 7. GENERATE 6-DIGIT OTP
    // =========================================================

    private String generateOtp() {

        int otpNumber =
                100000
                        + SECURE_RANDOM.nextInt(
                                900000
                        );


        return String.valueOf(
                otpNumber
        );
    }


    // =========================================================
    // 8. CREATE LOGIN OTP
    // =========================================================

    private OtpChallenges createLoginOtp(
            Customers customer) {


        // -----------------------------------------
        // Registered Email ရှိရမယ်
        // -----------------------------------------

        if (customer.getEmail() == null
                || customer.getEmail().isBlank()) {

            throw new RuntimeException(
                    "No registered email address is available for MFA."
            );
        }


        // -----------------------------------------
        // Previous ACTIVE Login OTP တွေ expire
        // -----------------------------------------

        invalidateOldLoginOtps(
                customer
        );


        // -----------------------------------------
        // New 6-digit OTP generate
        // -----------------------------------------

        String rawOtp =
                generateOtp();


        // -----------------------------------------
        // OTP hash
        // -----------------------------------------

        String otpHash =
                passwordEncoder.encode(
                        rawOtp
                );


        // -----------------------------------------
        // Challenge Group ID
        // -----------------------------------------

        String challengeGroupId =
                UUID.randomUUID()
                        .toString();


        LocalDateTime now =
                LocalDateTime.now();


        // -----------------------------------------
        // OTP Challenge create
        // -----------------------------------------

        OtpChallenges otpChallenge =
                OtpChallenges.builder()

                        .customer(
                                customer
                        )

                        .purpose(
                                OtpPurpose.LOGIN
                        )

                        .otpHash(
                                otpHash
                        )

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

                        .lastSentAt(
                                now
                        )

                        .maxResendAttempts(
                                MAX_OTP_RESENDS
                        )

                        .resendNo(0)

                        .build();


        OtpChallenges savedOtp =
                otpChallengesRepository.save(
                        otpChallenge
                );


        /*
         * TEMPORARY DEVELOPMENT ONLY
         *
         * Email service ရေးပြီးသွားရင်
         * ဒီ console print ကိုဖျက်ပါ။
         */
        System.out.println(
                "Generated OTP: " + rawOtp
        );


        return savedOtp;
    }


    // =========================================================
    // 9. INVALIDATE PREVIOUS ACTIVE LOGIN OTP
    // =========================================================

    private void invalidateOldLoginOtps(
            Customers customer) {

        var activeOtps =
                otpChallengesRepository
                        .findByCustomerAndPurposeAndStatus(
                                customer,
                                OtpPurpose.LOGIN,
                                OtpStatus.ACTIVE
                        );


        for (OtpChallenges otp
                : activeOtps) {

            otp.setStatus(
                    OtpStatus.EXPIRED
            );
        }


        otpChallengesRepository.saveAll(
                activeOtps
        );
    }


    // =========================================================
    // 10. VERIFY LOGIN OTP
    // =========================================================
    @Transactional
    public CusOtpVerifyResponse verifyLoginOtp(
            CusOtpVerifyRequest request) {


        // -----------------------------------------
        // Request validation
        // -----------------------------------------

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
                request.getChallengeGroupId()
                        .trim();


        String enteredOtp =
                request.getOtp()
                        .trim();


        // -----------------------------------------
        // OTP Challenge ရှာ
        // -----------------------------------------

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


        // -----------------------------------------
        // Status checks
        // -----------------------------------------

        if (otpChallenge.getStatus()
                == OtpStatus.CONSUMED) {

            throw new RuntimeException(
                    "This OTP has already been used."
            );
        }


        if (otpChallenge.getStatus()
                == OtpStatus.EXPIRED) {

            throw new RuntimeException(
                    "OTP has expired."
            );
        }


        if (otpChallenge.getStatus()
                == OtpStatus.BLOCKED) {

            throw new RuntimeException(
                    "OTP verification has been blocked."
            );
        }


        if (otpChallenge.getStatus()
                != OtpStatus.ACTIVE) {

            throw new RuntimeException(
                    "OTP is not active."
            );
        }


        LocalDateTime now =
                LocalDateTime.now();


        // -----------------------------------------
        // Expiry check
        // -----------------------------------------

        if (otpChallenge.getExpiresAt() == null
                || !otpChallenge
                        .getExpiresAt()
                        .isAfter(now)) {

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


        // -----------------------------------------
        // Max Attempts check
        // -----------------------------------------

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


        // -----------------------------------------
        // 6-digit format check
        // -----------------------------------------

        boolean validOtpFormat =
                enteredOtp.matches(
                        "\\d{6}"
                );


        // -----------------------------------------
        // OTP Hash verify
        // -----------------------------------------

        boolean otpMatches =
                validOtpFormat

                        && passwordEncoder.matches(
                                enteredOtp,
                                otpChallenge.getOtpHash()
                        );


        // -----------------------------------------
        // Wrong OTP
        // -----------------------------------------

        if (!otpMatches) {

            handleFailedOtpAttempt(
                    otpChallenge
            );


            throw new RuntimeException(
                    "Invalid OTP."
            );
        }


        // -----------------------------------------
        // Correct OTP → CONSUMED
        // -----------------------------------------

        otpChallenge.setStatus(
                OtpStatus.CONSUMED
        );


        otpChallenge.setConsumedAt(
                now
        );


        otpChallengesRepository.save(
                otpChallenge
        );


        // -----------------------------------------
        // Customer + Credentials
        // -----------------------------------------

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


        // -----------------------------------------
        // First Login Setup requirement check
        // -----------------------------------------

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


        if (firstLoginSetupRequired) {

        	return new CusOtpVerifyResponse(
        	        true,
        	        "OTP verified. Please complete first-time setup.",
        	        true,
        	        passwordChangeRequired,
        	        pinSetupRequired,
        	        null,
        	        null
        	);
        }

        CusTokenResponse tokenResponse =
                createAuthenticatedSession(
                        customer,
                        credentials
                );
        return new CusOtpVerifyResponse(
                true,
                "OTP verified successfully.",
                false,
                false,
                false,
                tokenResponse.getAccessToken(),
                tokenResponse.getRefreshToken()
        );
    }


    // =========================================================
    // 11. FAILED OTP ATTEMPT MANAGEMENT
    // =========================================================

    private void handleFailedOtpAttempt(
            OtpChallenges otpChallenge) {

        int failedAttempts =
                otpChallenge.getAttemptCount() + 1;


        otpChallenge.setAttemptCount(
                failedAttempts
        );


        // OTP 5 ကြိမ်မှား
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
    public CusOtpResendResponse resendLoginOtp(
            CusOtpResendRequest request) {

        // 1. Request validation
        if (request == null
                || request.getChallengeGroupId() == null
                || request.getChallengeGroupId().isBlank()) {

            throw new RuntimeException(
                    "OTP challenge information is required."
            );
        }

        String challengeGroupId =
                request.getChallengeGroupId().trim();


        // 2. Latest OTP challenge ရှာ
        OtpChallenges latestOtp =
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


        // 3. OTP already consumed?
        if (latestOtp.getStatus()
                == OtpStatus.CONSUMED) {

            throw new RuntimeException(
                    "OTP has already been verified."
            );
        }


        // 4. Resend limit စစ်
        if (latestOtp.getResendNo()
                >= latestOtp.getMaxResendAttempts()) {

            throw new RuntimeException(
                    "Maximum OTP resend attempts reached."
            );
        }


        // 5. Customer ရယူ
        Customers customer =
                latestOtp.getCustomer();


        if (customer.getEmail() == null
                || customer.getEmail().isBlank()) {

            throw new RuntimeException(
                    "No registered email address is available for MFA."
            );
        }


        // 6. Previous OTP expire
        latestOtp.setStatus(
                OtpStatus.EXPIRED
        );

        otpChallengesRepository.save(
                latestOtp
        );


        // 7. New OTP generate
        String rawOtp =
                generateOtp();


        String otpHash =
                passwordEncoder.encode(
                        rawOtp
                );


        LocalDateTime now =
                LocalDateTime.now();


        int newResendNo =
                latestOtp.getResendNo() + 1;


        // 8. Same challengeGroupId နဲ့ new OTP create
        OtpChallenges newOtp =
                OtpChallenges.builder()

                        .customer(customer)

                        .purpose(
                                OtpPurpose.LOGIN
                        )

                        .otpHash(
                                otpHash
                        )

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

                        // SAME challenge group
                        .challengeGroupId(
                                challengeGroupId
                        )

                        .lastSentAt(
                                now
                        )

                        .maxResendAttempts(
                                MAX_OTP_RESENDS
                        )

                        .resendNo(
                                newResendNo
                        )

                        .build();


        OtpChallenges savedOtp =
                otpChallengesRepository.save(
                        newOtp
                );


        // TEMPORARY development only
        System.out.println(
                "Resent OTP: " + rawOtp
        );


        return new CusOtpResendResponse(
                true,
                "A new OTP has been sent to your registered email.",
                savedOtp.getChallengeGroupId(),
                savedOtp.getDestinationMasked(),
                savedOtp.getResendNo()
        );
    }

    // =========================================================
    // 12. FIRST LOGIN - CHANGE TEMPORARY PASSWORD
    // =========================================================
    public void changeFirstLoginPassword(
            String challengeGroupId,
            String newPassword,
            String confirmPassword) {

        // 1. Required fields
        if (challengeGroupId == null
                || challengeGroupId.isBlank()
                || newPassword == null
                || newPassword.isBlank()
                || confirmPassword == null
                || confirmPassword.isBlank()) {

            throw new RuntimeException(
                    "All password setup fields are required."
            );
        }

        // 2. New password = Confirm password ?
        if (!newPassword.equals(confirmPassword)) {

            throw new RuntimeException(
                    "New password and confirm password do not match."
            );
        }

        // 3. OTP verified customer ကို challengeGroupId ကနေယူ
        Customers customer =
                getVerifiedCustomerFromChallenge(
                        challengeGroupId
                );

        // 4. Customer Credentials ရှာ
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

        // 5. First-login password change လိုသေးလား
        if (!credentials.isMustChangePassword()) {

            throw new RuntimeException(
                    "Password change is not required."
            );
        }

        // 6. New password != Temporary password
        if (passwordEncoder.matches(
                newPassword,
                credentials.getPasswordHash())) {

            throw new RuntimeException(
                    "New password must be different from the temporary password."
            );
        }

        // 7. Password policy
        if (!isValidPassword(newPassword)) {

            throw new RuntimeException(
                    "Password must contain at least 8 characters, "
                            + "including uppercase, lowercase, number, "
                            + "and special character."
            );
        }

        // 8. Hash new password
        String newPasswordHash =
                passwordEncoder.encode(
                        newPassword
                );

        // 9. Update credentials
        credentials.setPasswordHash(
                newPasswordHash
        );

        credentials.setMustChangePassword(
                false
        );

        credentials.setPasswordChangedAt(
                LocalDateTime.now()
        );

        credentialsRepository.save(
                credentials
        );
    }

    // =========================================================
    // 13. FIRST LOGIN - CREATE TRANSACTION PIN
    // =========================================================
    @Transactional
    public CusTokenResponse setupTransactionPin(
            String challengeGroupId,
            String pin,
            String confirmPin) {

        // =====================================================
        // 1. REQUIRED FIELDS
        // =====================================================

        if (challengeGroupId == null
                || challengeGroupId.isBlank()
                || pin == null
                || pin.isBlank()
                || confirmPin == null
                || confirmPin.isBlank()) {

            throw new RuntimeException(
                    "All PIN setup fields are required."
            );
        }


        // =====================================================
        // 2. PIN = CONFIRM PIN ?
        // =====================================================

        if (!pin.equals(confirmPin)) {

            throw new RuntimeException(
                    "PIN and confirm PIN do not match."
            );
        }


        // =====================================================
        // 3. EXACTLY 6 DIGITS
        // =====================================================

        if (!pin.matches("\\d{6}")) {

            throw new RuntimeException(
                    "Transaction PIN must be exactly 6 digits."
            );
        }


        // =====================================================
        // 4. GET OTP-VERIFIED CUSTOMER
        // =====================================================

        Customers customer =
                getVerifiedCustomerFromChallenge(
                        challengeGroupId
                );


        // =====================================================
        // 5. GET CUSTOMER CREDENTIALS
        // =====================================================

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
        // 6. PASSWORD MUST BE CHANGED FIRST
        // =====================================================

        if (credentials.isMustChangePassword()) {

            throw new RuntimeException(
                    "Please change the temporary password before setting the transaction PIN."
            );
        }


        // =====================================================
        // 7. PIN ALREADY EXISTS ?
        // =====================================================

        if (credentials.getTransactionPinHash() != null
                && !credentials
                        .getTransactionPinHash()
                        .isBlank()) {

            throw new RuntimeException(
                    "Transaction PIN has already been set."
            );
        }


        // =====================================================
        // 8. HASH PIN
        // =====================================================

        String pinHash =
                passwordEncoder.encode(
                        pin
                );


        // =====================================================
        // 9. UPDATE CREDENTIALS
        // =====================================================

        credentials.setTransactionPinHash(
                pinHash
        );

        credentials.setPinChangedAt(
                LocalDateTime.now()
        );

        credentials.setFailedPinAttemptCount(
                0
        );

        credentials.setPinLockedUntil(
                null
        );


        credentialsRepository.save(
                credentials
        );


        // =====================================================
        // 10. FIRST LOGIN SETUP COMPLETE
        // CREATE SESSION + JWT
        // =====================================================

        return createAuthenticatedSession(
                customer,
                credentials
        );
    }
    
 // =========================================================
 // CREATE AUTHENTICATED CUSTOMER SESSION
 // =========================================================

 private CusTokenResponse createAuthenticatedSession(
         Customers customer,
         CustomerCredentials credentials) {

     LocalDateTime now =
             LocalDateTime.now();


     // 1. Session UUID
     String sessionUuid =
             UUID.randomUUID()
                     .toString();


     // 2. Access Token
     String accessToken =
             cusJwtService.generateAccessToken(
                     customer.getCustomerId(),
                     sessionUuid,
                     credentials.getTokenVersion()
             );


     // 3. Refresh Token
     String refreshToken =
             cusJwtService.generateRefreshToken(
                     customer.getCustomerId(),
                     sessionUuid,
                     credentials.getTokenVersion()
             );


     // 4. Refresh Token Hash
     String refreshTokenHash =
    	        cusSessionService.hashRefreshToken(
    	                refreshToken
    	        );

     // 5. Auth Session
     AuthSessions authSession =
             AuthSessions.builder()

                     .sessionUuid(
                             sessionUuid
                     )

                     .subjectType(
                             SessionSubjectType.CUSTOMER
                     )

                     .customer(
                             customer
                     )

                     .staff(
                             null
                     )

                     .refreshTokenHash(
                             refreshTokenHash
                     )

                     .tokenVersionAtIssue(
                             credentials.getTokenVersion()
                     )

                     .issuedAt(
                             now
                     )

                     .lastSeenAt(
                             now
                     )

                     .refreshExpiresAt(
                             now.plusDays(7)
                     )

                     .idleTimeoutMinutes(
                             5
                     )

                     .build();


     authSessionsRepository.save(
             authSession
     );


     // 6. Last Login Time
     credentials.setLastLoginAt(
             now
     );

     credentialsRepository.save(
             credentials
     );


     // 7. Login Success Record
     saveLoginAttempt(
             customer.getCustomerCode(),
             customer,
             true,
             null
     );


     // 8. Return Tokens
     return new CusTokenResponse(
             true,
             "Login successful.",
             accessToken,
             refreshToken
     );
 }
 
 @Transactional
 public CusTokenResponse refreshToken(
	        CusRefreshTokenRequest request) {

	    if (request == null
	            || request.getRefreshToken() == null
	            || request.getRefreshToken().isBlank()) {

	        throw new RuntimeException(
	                "Refresh token is required."
	        );
	    }


	    String oldRefreshToken =
	            request.getRefreshToken()
	                    .trim();


	    // 1. JWT verify
	    Claims claims =
	            cusJwtService.getClaims(
	                    oldRefreshToken
	            );


	    // 2. Session + refresh hash verify
	    AuthSessions session =
	            cusSessionService
	                    .validateRefreshSession(
	                            claims,
	                            oldRefreshToken
	                    );


	    Customers customer =
	            session.getCustomer();


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


	    // 3. New Access Token
	    String newAccessToken =
	            cusJwtService.generateAccessToken(
	                    customer.getCustomerId(),
	                    session.getSessionUuid(),
	                    credentials.getTokenVersion()
	            );


	    // 4. Rotate Refresh Token
	    String newRefreshToken =
	            cusJwtService.generateRefreshToken(
	                    customer.getCustomerId(),
	                    session.getSessionUuid(),
	                    credentials.getTokenVersion()
	            );


	    // 5. Store NEW refresh hash
	    session.setRefreshTokenHash(
	            cusSessionService.hashRefreshToken(
	                    newRefreshToken
	            )
	    );

	    session.setRefreshExpiresAt(
	            LocalDateTime.now()
	                    .plusDays(7)
	    );

	    session.setLastSeenAt(
	            LocalDateTime.now()
	    );


	    authSessionsRepository.save(
	            session
	    );


	    return new CusTokenResponse(
	            true,
	            "Token refreshed successfully.",
	            newAccessToken,
	            newRefreshToken
	    );
	}
    // =========================================================
    // 14. PASSWORD POLICY HELPER
    // =========================================================

    private boolean isValidPassword(
            String password) {

        if (password == null
                || password.length() < 8) {

            return false;
        }


        boolean hasUppercase =
                password.matches(
                        ".*[A-Z].*"
                );


        boolean hasLowercase =
                password.matches(
                        ".*[a-z].*"
                );


        boolean hasNumber =
                password.matches(
                        ".*\\d.*"
                );


        boolean hasSpecialCharacter =
                password.matches(
                        ".*[^A-Za-z0-9].*"
                );


        return hasUppercase
                && hasLowercase
                && hasNumber
                && hasSpecialCharacter;
    }


    // =========================================================
    // 15. MASK CUSTOMER EMAIL
    // =========================================================

    private String maskEmail(
            String email) {

        if (email == null
                || !email.contains("@")) {

            return "******";
        }


        String[] parts =
                email.split("@", 2);


        String name =
                parts[0];


        String domain =
                parts[1];


        if (name.length() <= 2) {

            return "**@" + domain;
        }


        return name.substring(0, 2)
                + "****@"
                + domain;
    }
    
    
    
    private Customers getVerifiedCustomerFromChallenge(
            String challengeGroupId) {

        if (challengeGroupId == null
                || challengeGroupId.isBlank()) {

            throw new RuntimeException(
                    "OTP challenge information is required."
            );
        }

        OtpChallenges otpChallenge =
                otpChallengesRepository
                        .findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(
                                challengeGroupId.trim(),
                                OtpPurpose.LOGIN
                        )
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Invalid OTP challenge."
                                )
                        );

        if (otpChallenge.getStatus()
                != OtpStatus.CONSUMED) {

            throw new RuntimeException(
                    "OTP verification is required."
            );
        }


        if (otpChallenge.getConsumedAt() == null
                || otpChallenge.getConsumedAt()
                        .plusMinutes(10)
                        .isBefore(LocalDateTime.now())) {

            throw new RuntimeException(
                    "First-login setup session has expired. Please login again."
            );
        }

        return otpChallenge.getCustomer();
    }
    
 // =========================================================
 // CUSTOMER LOGOUT
 // =========================================================
    @Transactional
 public void logout(
         String authorizationHeader) {

     // -----------------------------------------
     // 1. Authorization Header check
     // -----------------------------------------

     if (authorizationHeader == null
             || !authorizationHeader
                     .startsWith("Bearer ")) {

         throw new RuntimeException(
                 "Access token is required."
         );
     }


     // -----------------------------------------
     // 2. Extract Access Token
     // -----------------------------------------

     String accessToken =
             authorizationHeader
                     .substring(7)
                     .trim();


     // -----------------------------------------
     // 3. JWT validate + read claims
     // -----------------------------------------

     Claims claims =
             cusJwtService.getClaims(
                     accessToken
             );


     // -----------------------------------------
     // 4. ACCESS token ဟုတ်လား
     // -----------------------------------------

     String tokenType =
             claims.get(
                     "tokenType",
                     String.class
             );


     if (!"ACCESS".equals(
             tokenType)) {

         throw new RuntimeException(
                 "Invalid access token."
         );
     }


     // -----------------------------------------
     // 5. jti ရယူ
     // -----------------------------------------

     String jti =
             claims.getId();


     if (jti == null
             || jti.isBlank()) {

         throw new RuntimeException(
                 "Invalid token ID."
         );
     }


     // -----------------------------------------
     // 6. Session validate
     // -----------------------------------------

     AuthSessions session =
             cusSessionService
                     .validateAccessSession(
                             claims
                     );


     // -----------------------------------------
     // 7. Access Token blacklist ထဲမရှိသေးရင် save
     // -----------------------------------------

     if (!jwtRevokedTokensRepository
             .existsByJti(jti)) {


         JwtRevokedTokens revokedToken =
                 JwtRevokedTokens.builder()

                         .jti(
                                 jti
                         )

                         .subjectType(
                                 SessionSubjectType.CUSTOMER
                         )

                         .customer(
                                 session.getCustomer()
                         )

                         .staff(
                                 null
                         )

                         .tokenExpiresAt(
                                 claims
                                         .getExpiration()
                                         .toInstant()
                                         .atZone(
                                                 ZoneId.systemDefault()
                                         )
                                         .toLocalDateTime()
                         )

                         .reason(
                                 "USER_LOGOUT"
                         )

                         .build();


         jwtRevokedTokensRepository.save(
                 revokedToken
         );
     }


     // -----------------------------------------
     // 8. Entire Session revoke
     // -----------------------------------------

     cusSessionService.revokeSession(
             session,
             "USER_LOGOUT"
     );
 }
 
}