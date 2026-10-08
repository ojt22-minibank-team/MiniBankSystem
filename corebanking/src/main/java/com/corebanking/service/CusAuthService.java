package com.corebanking.service;

import java.security.SecureRandom;
import com.corebanking.exception.CusValidationException;
import com.corebanking.dto.CusPasswordResetConfirmRequest;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.UUID;
import com.corebanking.dto.CusPinResetStartResponse;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.corebanking.dto.CusPinResetConfirmRequest;
import com.corebanking.dto.CusLoginRequest;
import com.corebanking.dto.CusLoginResponse;
import com.corebanking.dto.CusOtpResendRequest;
import com.corebanking.dto.CusOtpResendResponse;
import com.corebanking.dto.CusOtpVerifyRequest;
import com.corebanking.dto.CusOtpVerifyResponse;
import com.corebanking.dto.CusPasswordResetOtpVerifyRequest;
import com.corebanking.dto.CusPasswordResetOtpVerifyResponse;
import com.corebanking.dto.CusPasswordResetRequest;
import com.corebanking.dto.CusPasswordResetStartResponse;
import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.AuthSessions;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.LoginAttempts;
import com.corebanking.entity.OtpChallenges;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.DeliveryChannel;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.CusAccountLockedException;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusEmailException;
import com.corebanking.exception.CusOtpException;
import com.corebanking.exception.CusOtpResendLimitException;
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.repository.CusAccountsRepository;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCredentialsRepository;
import com.corebanking.repository.CusCustomerRepository;
import com.corebanking.repository.CusJwtRevokedTokensRepository;
import com.corebanking.repository.CusLoginAttemptsRepository;
import com.corebanking.repository.CusOtpChallengesRepository;
import com.corebanking.dto.CusPinResetOtpVerifyRequest;
import com.corebanking.dto.CusPinResetOtpVerifyResponse;

import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
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
    private final CusEmailService cusEmailService;
    private final CusAuditLogsRepository auditLogsRepository;



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
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_LENGTH = 10;

    private static final SecureRandom SECURE_RANDOM =
            new SecureRandom();


    // =========================================================
    // 1. CUSTOMER LOGIN - PASSWORD AUTHENTICATION
    // =========================================================

    public CusLoginResponse authenticateCredentials(
            CusLoginRequest request) {

        // TEMPORARY PERFORMANCE TIMING - remove after testing
        long loginStartTime = System.currentTimeMillis();
        System.out.println("\n========== LOGIN TIMING START ==========");

        // -----------------------------------------
        // Request validation
        // -----------------------------------------

        if (request == null
                || request.getLoginIdentifier() == null
                || request.getLoginIdentifier().isBlank()
                || request.getPassword() == null
                || request.getPassword().isBlank()) {

            throw new CusValidationException(
                    "Login identifier and password are required."
            );
        }


        String identifier =
                request.getLoginIdentifier().trim();


        Customers customer;


        // -----------------------------------------
        // Customer ID / Account Number နဲ့ရှာ
        // -----------------------------------------

        long customerLookupStart = System.currentTimeMillis();

        try {

            customer = findCustomer(identifier);

        } catch (RuntimeException ex) {

            saveInvalidLoginAttempt(
                    identifier,
                    "INVALID_IDENTIFIER"
            );

            throw ex;
        }

        System.out.println(
                "[TIMING] Customer lookup: "
                        + (System.currentTimeMillis() - customerLookupStart)
                        + " ms"
        );


        // -----------------------------------------
        // Customer status စစ်
        // -----------------------------------------

        validateCustomerStatus(customer);


        // -----------------------------------------
        // Customer Credentials ရှာ
        // -----------------------------------------

        long credentialsLookupStart = System.currentTimeMillis();

        CustomerCredentials credentials =
                credentialsRepository
                        .findById(customer.getCustomerId())
                        .orElseThrow(() ->
                                new CusAuthenticationException(
                                        "Invalid login credentials."
                                )
                        );

        System.out.println(
                "[TIMING] Credentials lookup: "
                        + (System.currentTimeMillis() - credentialsLookupStart)
                        + " ms"
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

        long passwordCheckStart = System.currentTimeMillis();

        boolean passwordMatches =
                passwordEncoder.matches(
                        request.getPassword(),
                        credentials.getPasswordHash()
                );

        System.out.println(
                "[TIMING] Password BCrypt check: "
                        + (System.currentTimeMillis() - passwordCheckStart)
                        + " ms"
        );


        // =====================================================
        // PASSWORD မှားရင်
        // =====================================================

        if (!passwordMatches) {

            handleFailedPassword(
                    credentials
            );

            // 5th wrong password ဖြစ်ပြီး lock တက်သွားပြီလား စစ်
            if (credentials.getFailedLoginCount()
                    >= MAX_FAILED_ATTEMPTS) {

                saveLoginAttempt(
                        identifier,
                        customer,
                        false,
                        "ACCOUNT_LOCKED"
                );

                throw new CusAccountLockedException(
                        "Account is temporarily locked for 15 minutes."
                );
            }

            // 1st - 4th wrong password
            saveLoginAttempt(
                    identifier,
                    customer,
                    false,
                    "INVALID_PASSWORD"
            );

            throw new CusAuthenticationException(
                    "Invalid Password."
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

        long createOtpStart = System.currentTimeMillis();

        OtpChallenges otpChallenge =
                createLoginOtp(customer);

        System.out.println(
                "[TIMING] createLoginOtp() total: "
                        + (System.currentTimeMillis() - createOtpStart)
                        + " ms"
        );

        System.out.println(
                "[TIMING] TOTAL LOGIN API: "
                        + (System.currentTimeMillis() - loginStartTime)
                        + " ms"
        );

        System.out.println("========== LOGIN TIMING END ==========\n");


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
                                        new CusAuthenticationException(
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

            throw new CusAuthenticationException(
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


            throw new CusAccountLockedException(
                    "Account is temporarily locked. Please try again later."
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

        // TEMPORARY PERFORMANCE TIMING - remove after testing
        long otpMethodStart = System.currentTimeMillis();


        // -----------------------------------------
        // Registered Email ရှိရမယ်
        // -----------------------------------------

        if (customer.getEmail() == null
                || customer.getEmail().isBlank()) {

            throw new CusAuthenticationException(
                    "No registered email address is available for MFA."
            );
        }


        // -----------------------------------------
        // Previous ACTIVE Login OTP တွေ expire
        // -----------------------------------------

        long invalidateOtpStart = System.currentTimeMillis();

        invalidateOldLoginOtps(
                customer
        );

        System.out.println(
                "[TIMING] Invalidate old OTPs: "
                        + (System.currentTimeMillis() - invalidateOtpStart)
                        + " ms"
        );


        // -----------------------------------------
        // New 6-digit OTP generate
        // -----------------------------------------

        String rawOtp =
                generateOtp();


        // -----------------------------------------
        // OTP hash
        // -----------------------------------------

        long otpHashStart = System.currentTimeMillis();

        String otpHash =
                passwordEncoder.encode(
                        rawOtp
                );

        System.out.println(
                "[TIMING] OTP BCrypt hash: "
                        + (System.currentTimeMillis() - otpHashStart)
                        + " ms"
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

                        .updatedByType(
                                UpdatedByType.CUSTOMER
                        )

                        .updatedById(
                                customer.getCustomerId()
                        )

                        .build();


        long otpDbSaveStart = System.currentTimeMillis();

        OtpChallenges savedOtp =
                otpChallengesRepository.save(
                        otpChallenge
                );

        System.out.println(
                "[TIMING] OTP DB save: "
                        + (System.currentTimeMillis() - otpDbSaveStart)
                        + " ms"
        );

        long emailSendStart = System.currentTimeMillis();

        try {

            cusEmailService.sendLoginOtp(
                    customer.getEmail(),
                    rawOtp
            );

            System.out.println(
                    "[TIMING] Gmail SMTP send: "
                            + (System.currentTimeMillis() - emailSendStart)
                            + " ms"
            );

            saveAuditLog(
                    ActorType.CUSTOMER,
                    customer,
                    "OTP_SENT",
                    "OTP_CHALLENGE",
                    String.valueOf(savedOtp.getOtpId()),
                    null,
                    "{\"purpose\":\"LOGIN\",\"status\":\"ACTIVE\",\"resendNo\":0}"
            );

        } catch (MailException ex) {
        	 ex.printStackTrace();

        	    savedOtp.setStatus(
        	            OtpStatus.EXPIRED
        	    );

            System.out.println(
                    "[TIMING] Gmail SMTP failed after: "
                            + (System.currentTimeMillis() - emailSendStart)
                            + " ms"
            );

            // Email မရောက်တဲ့ OTP ကို usable မဖြစ်အောင်
            savedOtp.setStatus(
                    OtpStatus.EXPIRED
            );

            markOtpUpdatedBySystem(
                    savedOtp
            );

            otpChallengesRepository.save(
                    savedOtp
            );

            saveAuditLog(
                    ActorType.SYSTEM,
                    null,
                    "OTP_SEND_FAILED",
                    "OTP_CHALLENGE",
                    String.valueOf(savedOtp.getOtpId()),
                    "{\"status\":\"ACTIVE\"}",
                    "{\"status\":\"EXPIRED\",\"reason\":\"EMAIL_SEND_FAILED\"}"
            );

            throw new CusEmailException(
                    "Unable to send OTP email. Please try again.",
                    ex
            );
        }

        System.out.println(
                "[TIMING] createLoginOtp internal total: "
                        + (System.currentTimeMillis() - otpMethodStart)
                        + " ms"
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

            markOtpUpdatedByCustomer(
                    otp
            );
        }


        otpChallengesRepository.saveAll(
                activeOtps
        );
    }


//verify login otp
    
    @Transactional(noRollbackFor = CusOtpException.class)
    public CusOtpVerifyResponse verifyLoginOtp(
            CusOtpVerifyRequest request) {

        // 1. Request validation
        if (request == null
                || request.getChallengeGroupId() == null
                || request.getChallengeGroupId().isBlank()
                || request.getOtp() == null
                || request.getOtp().isBlank()) {

            throw new CusOtpException(
                    "OTP verification information is required."
            );
        }

        String challengeGroupId =
                request.getChallengeGroupId().trim();

        String enteredOtp =
                request.getOtp().trim();

        // 2. OTP Challenge ရှာ
        OtpChallenges otpChallenge =
                otpChallengesRepository
                        .findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(
                                challengeGroupId,
                                OtpPurpose.LOGIN
                        )
                        .orElseThrow(() ->
                                new CusOtpException(
                                        "Invalid OTP challenge."
                                )
                        );

        // 3. Status checks
        if (otpChallenge.getStatus() == OtpStatus.CONSUMED) {

            throw new CusOtpException(
                    "This OTP has already been used."
            );
        }

        if (otpChallenge.getStatus() == OtpStatus.EXPIRED) {

            throw new CusOtpException(
                    "OTP has expired."
            );
        }

        if (otpChallenge.getStatus() == OtpStatus.BLOCKED) {

            throw new CusOtpException(
                    "OTP verification has been blocked."
            );
        }

        if (otpChallenge.getStatus() != OtpStatus.ACTIVE) {

            throw new CusOtpException(
                    "OTP is not active."
            );
        }

        LocalDateTime now =
                LocalDateTime.now();

        // 4. Expiry check
        if (otpChallenge.getExpiresAt() == null
                || !otpChallenge
                        .getExpiresAt()
                        .isAfter(now)) {

            otpChallenge.setStatus(
                    OtpStatus.EXPIRED
            );

            markOtpUpdatedBySystem(
                    otpChallenge
            );

            otpChallengesRepository.save(
                    otpChallenge
            );

            saveAuditLog(
                    ActorType.SYSTEM,
                    null,
                    "OTP_EXPIRED",
                    "OTP_CHALLENGE",
                    String.valueOf(otpChallenge.getOtpId()),
                    "{\"status\":\"ACTIVE\"}",
                    "{\"status\":\"EXPIRED\",\"reason\":\"TIME_EXPIRED\"}"
            );

            throw new CusOtpException(
                    "OTP has expired."
            );
        }

        // 5. Max attempts check
        if (otpChallenge.getAttemptCount()
                >= otpChallenge.getMaxAttempts()) {

            otpChallenge.setStatus(
                    OtpStatus.BLOCKED
            );

            markOtpUpdatedBySystem(
                    otpChallenge
            );

            otpChallengesRepository.save(
                    otpChallenge
            );

            saveAuditLog(
                    ActorType.SYSTEM,
                    null,
                    "OTP_BLOCKED",
                    "OTP_CHALLENGE",
                    String.valueOf(otpChallenge.getOtpId()),
                    null,
                    "{\"status\":\"BLOCKED\",\"reason\":\"MAX_ATTEMPTS_REACHED\"}"
            );

            throw new CusOtpException(
                    "OTP verification has been blocked."
            );
        }

        // 6. OTP format
        boolean validOtpFormat =
                enteredOtp.matches("\\d{6}");

        // 7. OTP verify
        boolean otpMatches =
                validOtpFormat
                        && passwordEncoder.matches(
                                enteredOtp,
                                otpChallenge.getOtpHash()
                        );

        // 8. Wrong OTP
        if (!otpMatches) {

            handleFailedOtpAttempt(
                    otpChallenge
            );

            throw new CusOtpException(
                    "Invalid OTP."
            );
        }

        // 9. Correct OTP
        otpChallenge.setStatus(
                OtpStatus.CONSUMED
        );

        otpChallenge.setConsumedAt(
                now
        );

        markOtpUpdatedByCustomer(
                otpChallenge
        );

        otpChallengesRepository.save(
                otpChallenge
        );

        saveAuditLog(
                ActorType.CUSTOMER,
                otpChallenge.getCustomer(),
                "OTP_VERIFIED",
                "OTP_CHALLENGE",
                String.valueOf(otpChallenge.getOtpId()),
                "{\"status\":\"ACTIVE\"}",
                "{\"status\":\"CONSUMED\"}"
        );

        // 10. Customer
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

        // 11. First-login checks
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

        // 12. Normal returning customer
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


        markOtpUpdatedByCustomer(
                otpChallenge
        );


        otpChallengesRepository.save(
                otpChallenge
        );


        saveAuditLog(
                ActorType.CUSTOMER,
                otpChallenge.getCustomer(),
                "OTP_VERIFY_FAILED",
                "OTP_CHALLENGE",
                String.valueOf(otpChallenge.getOtpId()),
                null,
                "{\"attemptCount\":" + failedAttempts
                        + ",\"status\":\"" + otpChallenge.getStatus().name() + "\"}"
        );


        if (otpChallenge.getStatus()
                == OtpStatus.BLOCKED) {

            saveAuditLog(
                    ActorType.CUSTOMER,
                    otpChallenge.getCustomer(),
                    "OTP_BLOCKED",
                    "OTP_CHALLENGE",
                    String.valueOf(otpChallenge.getOtpId()),
                    null,
                    "{\"status\":\"BLOCKED\",\"reason\":\"MAX_ATTEMPTS_REACHED\"}"
            );
        }
    }
    public CusOtpResendResponse resendLoginOtp(
            CusOtpResendRequest request) {

        // 1. Request validation
        if (request == null
                || request.getChallengeGroupId() == null
                || request.getChallengeGroupId().isBlank()) {

            throw new CusOtpException(
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
                                new CusOtpException(
                                        "Invalid OTP challenge."
                                )
                        );


        // 3. OTP already consumed?
        if (latestOtp.getStatus()
                == OtpStatus.CONSUMED) {

            throw new CusOtpException(
                    "OTP has already been verified."
            );
        }


        // 4. Resend limit စစ်
        if (latestOtp.getResendNo()
                >= latestOtp.getMaxResendAttempts()) {

            throw new CusOtpResendLimitException(
                    "Maximum OTP resend attempts reached."
            );
        }


        // 5. Customer ရယူ
        Customers customer =
                latestOtp.getCustomer();


        if (customer.getEmail() == null
                || customer.getEmail().isBlank()) {

            throw new CusAuthenticationException(
                    "No registered email address is available for MFA."
            );
        }


        // 6. Previous OTP expire
        latestOtp.setStatus(
                OtpStatus.EXPIRED
        );

        markOtpUpdatedByCustomer(
                latestOtp
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

                        .updatedByType(
                                UpdatedByType.CUSTOMER
                        )

                        .updatedById(
                                customer.getCustomerId()
                        )

                        .build();


        OtpChallenges savedOtp =
                otpChallengesRepository.save(
                        newOtp
                );

        try {

            cusEmailService.sendLoginOtp(
                    customer.getEmail(),
                    rawOtp
            );

            saveAuditLog(
                    ActorType.CUSTOMER,
                    customer,
                    "OTP_RESENT",
                    "OTP_CHALLENGE",
                    String.valueOf(savedOtp.getOtpId()),
                    null,
                    "{\"purpose\":\"LOGIN\",\"status\":\"ACTIVE\",\"resendNo\":"
                            + savedOtp.getResendNo() + "}"
            );

//OTP don't reach to customer, email service unavailabel
        } catch (MailException ex) {

            savedOtp.setStatus(
                    OtpStatus.EXPIRED
            );

            markOtpUpdatedBySystem(
                    savedOtp
            );

            otpChallengesRepository.save(
                    savedOtp
            );

            saveAuditLog(
                    ActorType.SYSTEM,
                    null,
                    "OTP_RESEND_FAILED",
                    "OTP_CHALLENGE",
                    String.valueOf(savedOtp.getOtpId()),
                    "{\"status\":\"ACTIVE\"}",
                    "{\"status\":\"EXPIRED\",\"reason\":\"EMAIL_SEND_FAILED\"}"
            );

            throw new CusEmailException(
                    "Unable to resend OTP email. Please try again.",
                    ex
            );
        }

        return new CusOtpResendResponse(
                true,
                "A new OTP has been sent to your registered email.",
                savedOtp.getChallengeGroupId(),
                savedOtp.getDestinationMasked(),
                savedOtp.getResendNo()
        );
    }
    
    
    

 // =========================================================
 // PASSWORD RESET - REQUEST OTP
 // =========================================================

 @Transactional(
         noRollbackFor = CusEmailException.class
 )
 public CusPasswordResetStartResponse requestPasswordReset(
         CusPasswordResetRequest request) {

     // =====================================================
     // 1. REQUEST VALIDATION
     // =====================================================

     if (request == null
             || request.getLoginIdentifier() == null
             || request.getLoginIdentifier().isBlank()) {

         throw new CusValidationException(
                 "Customer ID or Account Number is required."
         );
     }


     String identifier =
             request.getLoginIdentifier().trim();


     // =====================================================
     // 2. FIND CUSTOMER
     // Customer Code OR Account Number
     // =====================================================

     Customers customer =
             findCustomer(
                     identifier
             );


     // =====================================================
     // 3. CUSTOMER MUST BE ACTIVE
     // =====================================================

     validateCustomerStatus(
             customer
     );


     // =====================================================
     // 4. REGISTERED EMAIL REQUIRED
     // =====================================================

     if (customer.getEmail() == null
             || customer.getEmail().isBlank()) {

         throw new CusValidationException(
                 "No registered email address is available for password reset."
         );
     }


     // =====================================================
     // 5. EXPIRE PREVIOUS ACTIVE PASSWORD RESET OTPs
     // =====================================================

     var activeResetOtps =
             otpChallengesRepository
                     .findByCustomerAndPurposeAndStatus(
                             customer,
                             OtpPurpose.PASSWORD_RESET,
                             OtpStatus.ACTIVE
                     );


     for (OtpChallenges otp : activeResetOtps) {

         otp.setStatus(
                 OtpStatus.EXPIRED
         );

         markOtpUpdatedByCustomer(
                 otp
         );
     }


     otpChallengesRepository.saveAll(
             activeResetOtps
     );


     // =====================================================
     // 6. GENERATE 6-DIGIT OTP
     // =====================================================

     String rawOtp =
             generateOtp();


     // =====================================================
     // 7. HASH OTP
     // =====================================================

     String otpHash =
             passwordEncoder.encode(
                     rawOtp
             );


     // =====================================================
     // 8. CREATE CHALLENGE GROUP ID
     // =====================================================

     String challengeGroupId =
             UUID.randomUUID()
                     .toString();


     LocalDateTime now =
             LocalDateTime.now();


     // =====================================================
     // 9. CREATE PASSWORD RESET OTP CHALLENGE
     // =====================================================

     OtpChallenges otpChallenge =
             OtpChallenges.builder()

                     .customer(
                             customer
                     )

                     .purpose(
                             OtpPurpose.PASSWORD_RESET
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

                     .updatedByType(
                             UpdatedByType.CUSTOMER
                     )

                     .updatedById(
                             customer.getCustomerId()
                     )

                     .build();


     OtpChallenges savedOtp =
             otpChallengesRepository.save(
                     otpChallenge
             );


     // =====================================================
     // 10. SEND OTP EMAIL
     // =====================================================

     try {

         cusEmailService.sendPasswordResetOtp(
                 customer.getEmail(),
                 rawOtp
         );


         // =================================================
         // AUDIT - OTP SENT
         // =================================================

         saveAuditLog(
                 ActorType.CUSTOMER,
                 customer,
                 "PASSWORD_RESET_OTP_SENT",
                 "OTP_CHALLENGE",
                 String.valueOf(
                         savedOtp.getOtpId()
                 ),
                 null,
                 "{\"purpose\":\"PASSWORD_RESET\","
                         + "\"status\":\"ACTIVE\","
                         + "\"resendNo\":0}"
         );


     } catch (MailException ex) {

         // =================================================
         // EMAIL FAILED -> OTP MUST NOT REMAIN USABLE
         // =================================================

         savedOtp.setStatus(
                 OtpStatus.EXPIRED
         );


         markOtpUpdatedBySystem(
                 savedOtp
         );


         otpChallengesRepository.save(
                 savedOtp
         );


         saveAuditLog(
                 ActorType.SYSTEM,
                 null,
                 "PASSWORD_RESET_OTP_SEND_FAILED",
                 "OTP_CHALLENGE",
                 String.valueOf(
                         savedOtp.getOtpId()
                 ),
                 "{\"status\":\"ACTIVE\"}",
                 "{\"status\":\"EXPIRED\","
                         + "\"reason\":\"EMAIL_SEND_FAILED\"}"
         );


         throw new CusEmailException(
                 "Unable to send password reset OTP email. Please try again.",
                 ex
         );
     }


     // =====================================================
     // 11. RESPONSE
     // =====================================================

     return new CusPasswordResetStartResponse(
             true,
             "Password reset OTP has been sent to your registered email.",
             savedOtp.getChallengeGroupId(),
             savedOtp.getDestinationMasked()
     );
 }
 
//=========================================================
//TRANSACTION PIN RESET - REQUEST OTP
//=========================================================

@Transactional(
      noRollbackFor = CusEmailException.class
)
public CusPinResetStartResponse requestPinReset(
      String authorizationHeader) {

  // =====================================================
  // 1. ACCESS TOKEN REQUIRED
  // =====================================================

  if (authorizationHeader == null
          || !authorizationHeader.startsWith("Bearer ")) {

      throw new CusAuthenticationException(
              "Access token is required."
      );
  }


  String accessToken =
          authorizationHeader
                  .substring(7)
                  .trim();


  // =====================================================
  // 2. READ JWT
  // =====================================================

  Claims claims =
          cusJwtService.getClaims(
                  accessToken
          );


  // =====================================================
  // 3. TOKEN TYPE MUST BE ACCESS
  // =====================================================

  String tokenType =
          claims.get(
                  "tokenType",
                  String.class
          );


  if (!"ACCESS".equals(tokenType)) {

      throw new CusAuthenticationException(
              "Invalid access token."
      );
  }


  // =====================================================
  // 4. VALIDATE ACTIVE SESSION
  // =====================================================

  AuthSessions session =
          cusSessionService
                  .validateAccessSession(
                          claims
                  );


  Customers customer =
          session.getCustomer();


  if (customer == null
          || customer.getCustomerId() == null) {

      throw new CusSessionExpiredException(
              "Customer session is invalid."
      );
  }


  // =====================================================
  // 5. CUSTOMER MUST BE ACTIVE
  // =====================================================

  validateCustomerStatus(
          customer
  );


  // =====================================================
  // 6. REGISTERED EMAIL REQUIRED
  // =====================================================

  if (customer.getEmail() == null
          || customer.getEmail().isBlank()) {

      throw new CusEmailException(
              "No registered email address is available for PIN reset."
      );
  }


  // =====================================================
  // 7. EXPIRE OLD ACTIVE PIN RESET OTPs
  // =====================================================

  var activePinResetOtps =
          otpChallengesRepository
                  .findByCustomerAndPurposeAndStatus(
                          customer,
                          OtpPurpose.PIN_RESET,
                          OtpStatus.ACTIVE
                  );


  for (OtpChallenges otp : activePinResetOtps) {

      otp.setStatus(
              OtpStatus.EXPIRED
      );

      markOtpUpdatedByCustomer(
              otp
      );
  }


  otpChallengesRepository.saveAll(
          activePinResetOtps
  );


  // =====================================================
  // 8. GENERATE OTP
  // =====================================================

  String rawOtp =
          generateOtp();


  String otpHash =
          passwordEncoder.encode(
                  rawOtp
          );


  String challengeGroupId =
          UUID.randomUUID()
                  .toString();


  LocalDateTime now =
          LocalDateTime.now();


  // =====================================================
  // 9. CREATE PIN RESET OTP
  // =====================================================

  OtpChallenges otpChallenge =
          OtpChallenges.builder()

                  .customer(
                          customer
                  )

                  .purpose(
                          OtpPurpose.PIN_RESET
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

                  .updatedByType(
                          UpdatedByType.CUSTOMER
                  )

                  .updatedById(
                          customer.getCustomerId()
                  )

                  .build();


  OtpChallenges savedOtp =
          otpChallengesRepository.save(
                  otpChallenge
          );


  // =====================================================
  // 10. SEND EMAIL
  // =====================================================

  try {

      cusEmailService.sendPinResetOtp(
              customer.getEmail(),
              rawOtp
      );


      saveAuditLog(
              ActorType.CUSTOMER,
              customer,
              "PIN_RESET_OTP_SENT",
              "OTP_CHALLENGE",
              String.valueOf(
                      savedOtp.getOtpId()
              ),
              null,
              "{\"purpose\":\"PIN_RESET\","
                      + "\"status\":\"ACTIVE\","
                      + "\"resendNo\":0}"
      );


  } catch (MailException ex) {

      savedOtp.setStatus(
              OtpStatus.EXPIRED
      );


      markOtpUpdatedBySystem(
              savedOtp
      );


      otpChallengesRepository.save(
              savedOtp
      );


      saveAuditLog(
              ActorType.SYSTEM,
              null,
              "PIN_RESET_OTP_SEND_FAILED",
              "OTP_CHALLENGE",
              String.valueOf(
                      savedOtp.getOtpId()
              ),
              "{\"status\":\"ACTIVE\"}",
              "{\"status\":\"EXPIRED\","
                      + "\"reason\":\"EMAIL_SEND_FAILED\"}"
      );


      throw new CusEmailException(
              "Unable to send PIN reset OTP email. Please try again.",
              ex
      );
  }


  // =====================================================
  // 11. RESPONSE
  // =====================================================

  return new CusPinResetStartResponse(
          true,
          "Transaction PIN reset OTP has been sent to your registered email.",
          savedOtp.getChallengeGroupId(),
          savedOtp.getDestinationMasked()
  );
}


//=========================================================
//TRANSACTION PIN RESET - RESEND OTP
//=========================================================

@Transactional(
     noRollbackFor = CusEmailException.class
)
public CusOtpResendResponse resendPinResetOtp(
     String authorizationHeader,
     CusOtpResendRequest request) {

 // =====================================================
 // 1. ACCESS TOKEN REQUIRED
 // =====================================================

 if (authorizationHeader == null
         || !authorizationHeader.startsWith("Bearer ")) {

     throw new CusAuthenticationException(
             "Access token is required."
     );
 }


 String accessToken =
         authorizationHeader
                 .substring(7)
                 .trim();


 Claims claims =
         cusJwtService.getClaims(
                 accessToken
         );


 // =====================================================
 // 2. TOKEN TYPE MUST BE ACCESS
 // =====================================================

 String tokenType =
         claims.get(
                 "tokenType",
                 String.class
         );


 if (!"ACCESS".equals(tokenType)) {

     throw new CusAuthenticationException(
             "Invalid access token."
     );
 }


 // =====================================================
 // 3. VALIDATE CURRENT SESSION
 // =====================================================

 AuthSessions session =
         cusSessionService
                 .validateAccessSession(
                         claims
                 );


 Customers authenticatedCustomer =
         session.getCustomer();


 if (authenticatedCustomer == null
         || authenticatedCustomer.getCustomerId() == null) {

     throw new CusSessionExpiredException(
             "Customer session is invalid."
     );
 }


 // =====================================================
 // 4. REQUEST VALIDATION
 // =====================================================

 if (request == null
         || request.getChallengeGroupId() == null
         || request.getChallengeGroupId().isBlank()) {

     throw new CusOtpException(
             "PIN reset challenge is required."
     );
 }


 String challengeGroupId =
         request.getChallengeGroupId()
                 .trim();


 // =====================================================
 // 5. FIND LATEST PIN RESET OTP
 // =====================================================

 OtpChallenges latestOtp =
         otpChallengesRepository
                 .findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(
                         challengeGroupId,
                         OtpPurpose.PIN_RESET
                 )
                 .orElseThrow(() ->
                         new CusOtpException(
                                 "Invalid PIN reset challenge."
                         )
                 );


 // =====================================================
 // 6. CHALLENGE MUST BELONG TO CURRENT CUSTOMER
 // =====================================================

 if (latestOtp.getCustomer() == null
         || !latestOtp
                 .getCustomer()
                 .getCustomerId()
                 .equals(
                         authenticatedCustomer
                                 .getCustomerId()
                 )) {

     throw new CusOtpException(
             "Invalid PIN reset challenge."
     );
 }


 // =====================================================
 // 7. ALREADY VERIFIED?
 // =====================================================

 if (latestOtp.getStatus()
         == OtpStatus.CONSUMED) {

     throw new CusOtpException(
             "PIN reset OTP has already been verified."
     );
 }


 // =====================================================
 // 8. RESEND LIMIT
 // =====================================================

 if (latestOtp.getResendNo()
         >= latestOtp.getMaxResendAttempts()) {

     throw new CusOtpResendLimitException(
             "Maximum OTP resend attempts reached. "
                     + "Please restart PIN reset."
     );
 }


 Customers customer =
         latestOtp.getCustomer();


 validateCustomerStatus(
         customer
 );


 // =====================================================
 // 9. EMAIL REQUIRED
 // =====================================================

 if (customer.getEmail() == null
         || customer.getEmail().isBlank()) {

     throw new CusEmailException(
             "No registered email address is available for PIN reset."
     );
 }


 // =====================================================
 // 10. EXPIRE PREVIOUS OTP
 // =====================================================

 if (latestOtp.getStatus()
         == OtpStatus.ACTIVE) {

     latestOtp.setStatus(
             OtpStatus.EXPIRED
     );

     markOtpUpdatedByCustomer(
             latestOtp
     );

     otpChallengesRepository.save(
             latestOtp
     );
 }


 // =====================================================
 // 11. GENERATE NEW OTP
 // =====================================================

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


 // =====================================================
 // 12. CREATE NEW OTP
 // Same challengeGroupId
 // =====================================================

 OtpChallenges newOtp =
         OtpChallenges.builder()

                 .customer(
                         customer
                 )

                 .purpose(
                         OtpPurpose.PIN_RESET
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

                 .resendNo(
                         newResendNo
                 )

                 .updatedByType(
                         UpdatedByType.CUSTOMER
                 )

                 .updatedById(
                         customer.getCustomerId()
                 )

                 .build();


 OtpChallenges savedOtp =
         otpChallengesRepository.save(
                 newOtp
         );


 // =====================================================
 // 13. SEND EMAIL
 // =====================================================

 try {

     cusEmailService.sendPinResetOtp(
             customer.getEmail(),
             rawOtp
     );


     saveAuditLog(
             ActorType.CUSTOMER,
             customer,
             "PIN_RESET_OTP_RESENT",
             "OTP_CHALLENGE",
             String.valueOf(
                     savedOtp.getOtpId()
             ),
             null,
             "{\"purpose\":\"PIN_RESET\","
                     + "\"status\":\"ACTIVE\","
                     + "\"resendNo\":"
                     + savedOtp.getResendNo()
                     + "}"
     );


 } catch (MailException ex) {

     savedOtp.setStatus(
             OtpStatus.EXPIRED
     );


     markOtpUpdatedBySystem(
             savedOtp
     );


     otpChallengesRepository.save(
             savedOtp
     );


     saveAuditLog(
             ActorType.SYSTEM,
             null,
             "PIN_RESET_OTP_RESEND_FAILED",
             "OTP_CHALLENGE",
             String.valueOf(
                     savedOtp.getOtpId()
             ),
             "{\"status\":\"ACTIVE\"}",
             "{\"status\":\"EXPIRED\","
                     + "\"reason\":\"EMAIL_SEND_FAILED\"}"
     );


     throw new CusEmailException(
             "Unable to resend PIN reset OTP. Please try again.",
             ex
     );
 }


 return new CusOtpResendResponse(
         true,
         "A new Transaction PIN reset OTP has been sent "
                 + "to your registered email.",
         savedOtp.getChallengeGroupId(),
         savedOtp.getDestinationMasked(),
         savedOtp.getResendNo()
 );
}


//=========================================================
//TRANSACTION PIN RESET - VERIFY OTP
//=========================================================

@Transactional(
     noRollbackFor = CusOtpException.class
)
public CusPinResetOtpVerifyResponse verifyPinResetOtp(
     String authorizationHeader,
     CusPinResetOtpVerifyRequest request) {

 // =====================================================
 // 1. ACCESS TOKEN REQUIRED
 // =====================================================

 if (authorizationHeader == null
         || !authorizationHeader.startsWith("Bearer ")) {

     throw new CusAuthenticationException(
             "Access token is required."
     );
 }


 String accessToken =
         authorizationHeader
                 .substring(7)
                 .trim();


 Claims claims =
         cusJwtService.getClaims(
                 accessToken
         );


 String tokenType =
         claims.get(
                 "tokenType",
                 String.class
         );


 if (!"ACCESS".equals(tokenType)) {

     throw new CusAuthenticationException(
             "Invalid access token."
     );
 }


 // =====================================================
 // 2. VALIDATE SESSION
 // =====================================================

 AuthSessions session =
         cusSessionService
                 .validateAccessSession(
                         claims
                 );


 Customers authenticatedCustomer =
         session.getCustomer();


 if (authenticatedCustomer == null
         || authenticatedCustomer.getCustomerId() == null) {

     throw new CusSessionExpiredException(
             "Customer session is invalid."
     );
 }


 // =====================================================
 // 3. REQUEST VALIDATION
 // =====================================================

 if (request == null
         || request.getChallengeGroupId() == null
         || request.getChallengeGroupId().isBlank()
         || request.getOtp() == null
         || request.getOtp().isBlank()) {

     throw new CusOtpException(
             "OTP verification information is required."
     );
 }


 String challengeGroupId =
         request.getChallengeGroupId()
                 .trim();


 String enteredOtp =
         request.getOtp()
                 .trim();


 // =====================================================
 // 4. FIND PIN RESET OTP
 // =====================================================

 OtpChallenges otpChallenge =
         otpChallengesRepository
                 .findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(
                         challengeGroupId,
                         OtpPurpose.PIN_RESET
                 )
                 .orElseThrow(() ->
                         new CusOtpException(
                                 "Invalid PIN reset challenge."
                         )
                 );


 // =====================================================
 // 5. OTP MUST BELONG TO LOGGED-IN CUSTOMER
 // =====================================================

 if (otpChallenge.getCustomer() == null
         || otpChallenge
                 .getCustomer()
                 .getCustomerId() == null
         || !otpChallenge
                 .getCustomer()
                 .getCustomerId()
                 .equals(
                         authenticatedCustomer
                                 .getCustomerId()
                 )) {

     throw new CusOtpException(
             "Invalid PIN reset challenge."
     );
 }


 // =====================================================
 // 6. STATUS CHECK
 // =====================================================

 if (otpChallenge.getStatus()
         == OtpStatus.CONSUMED) {

     throw new CusOtpException(
             "This PIN reset OTP has already been used."
     );
 }


 if (otpChallenge.getStatus()
         == OtpStatus.EXPIRED) {

     throw new CusOtpException(
             "PIN reset OTP has expired."
     );
 }


 if (otpChallenge.getStatus()
         == OtpStatus.BLOCKED) {

     throw new CusOtpException(
             "PIN reset OTP verification has been blocked."
     );
 }


 if (otpChallenge.getStatus()
         != OtpStatus.ACTIVE) {

     throw new CusOtpException(
             "PIN reset OTP is not active."
     );
 }


 LocalDateTime now =
         LocalDateTime.now();


 // =====================================================
 // 7. EXPIRY CHECK
 // =====================================================

 if (otpChallenge.getExpiresAt() == null
         || !otpChallenge
                 .getExpiresAt()
                 .isAfter(now)) {

     otpChallenge.setStatus(
             OtpStatus.EXPIRED
     );


     markOtpUpdatedBySystem(
             otpChallenge
     );


     otpChallengesRepository.save(
             otpChallenge
     );


     saveAuditLog(
             ActorType.SYSTEM,
             null,
             "PIN_RESET_OTP_EXPIRED",
             "OTP_CHALLENGE",
             String.valueOf(
                     otpChallenge.getOtpId()
             ),
             "{\"status\":\"ACTIVE\"}",
             "{\"status\":\"EXPIRED\","
                     + "\"reason\":\"TIME_EXPIRED\"}"
     );


     throw new CusOtpException(
             "PIN reset OTP has expired."
     );
 }


 // =====================================================
 // 8. MAX VERIFY ATTEMPTS
 // =====================================================

 if (otpChallenge.getAttemptCount()
         >= otpChallenge.getMaxAttempts()) {

     otpChallenge.setStatus(
             OtpStatus.BLOCKED
     );


     markOtpUpdatedBySystem(
             otpChallenge
     );


     otpChallengesRepository.save(
             otpChallenge
     );


     throw new CusOtpException(
             "PIN reset OTP verification has been blocked."
     );
 }


 // =====================================================
 // 9. OTP FORMAT + HASH VERIFY
 // =====================================================

 boolean validOtpFormat =
         enteredOtp.matches(
                 "\\d{6}"
         );


 boolean otpMatches =
         validOtpFormat

                 && passwordEncoder.matches(
                         enteredOtp,
                         otpChallenge.getOtpHash()
                 );


 // =====================================================
 // 10. WRONG OTP
 // =====================================================

 if (!otpMatches) {

     int failedAttempts =
             otpChallenge.getAttemptCount() + 1;


     otpChallenge.setAttemptCount(
             failedAttempts
     );


     if (failedAttempts
             >= otpChallenge.getMaxAttempts()) {

         otpChallenge.setStatus(
                 OtpStatus.BLOCKED
         );
     }


     markOtpUpdatedByCustomer(
             otpChallenge
     );


     otpChallengesRepository.save(
             otpChallenge
     );


     saveAuditLog(
             ActorType.CUSTOMER,
             authenticatedCustomer,
             "PIN_RESET_OTP_VERIFY_FAILED",
             "OTP_CHALLENGE",
             String.valueOf(
                     otpChallenge.getOtpId()
             ),
             null,
             "{\"attemptCount\":"
                     + failedAttempts
                     + ",\"status\":\""
                     + otpChallenge.getStatus().name()
                     + "\"}"
     );


     throw new CusOtpException(
             "Invalid OTP."
     );
 }


 // =====================================================
 // 11. CORRECT OTP
 // GENERATE VERIFIED CHALLENGE ID
 // =====================================================

 String verifiedChallengeGroupId =
         UUID.randomUUID()
                 .toString();


 int updatedRows =
         otpChallengesRepository
                 .consumePinResetOtpIfActive(

                         otpChallenge.getOtpId(),

                         challengeGroupId,

                         OtpPurpose.PIN_RESET,

                         OtpStatus.ACTIVE,

                         OtpStatus.CONSUMED,

                         verifiedChallengeGroupId,

                         now,

                         now,

                         UpdatedByType.CUSTOMER,

                         authenticatedCustomer
                                 .getCustomerId(),

                         now
                 );


 if (updatedRows != 1) {

     throw new CusOtpException(
             "OTP has already been used or is no longer valid."
     );
 }


 // =====================================================
 // 12. AUDIT
 // =====================================================

 saveAuditLog(
         ActorType.CUSTOMER,
         authenticatedCustomer,
         "PIN_RESET_OTP_VERIFIED",
         "OTP_CHALLENGE",
         String.valueOf(
                 otpChallenge.getOtpId()
         ),
         "{\"status\":\"ACTIVE\"}",
         "{\"status\":\"CONSUMED\","
                 + "\"purpose\":\"PIN_RESET\"}"
 );


 // =====================================================
 // 13. RESPONSE
 // =====================================================

 return new CusPinResetOtpVerifyResponse(
         true,
         "OTP verified successfully. You may now reset your Transaction PIN.",
         verifiedChallengeGroupId
 );
}


//=========================================================
//TRANSACTION PIN RESET - CONFIRM NEW PIN
//=========================================================

@Transactional
public void resetTransactionPin(
     String authorizationHeader,
     CusPinResetConfirmRequest request) {

 // =====================================================
 // 1. ACCESS TOKEN REQUIRED
 // =====================================================

 if (authorizationHeader == null
         || !authorizationHeader.startsWith("Bearer ")) {

     throw new CusAuthenticationException(
             "Access token is required."
     );
 }


 String accessToken =
         authorizationHeader
                 .substring(7)
                 .trim();


 Claims claims =
         cusJwtService.getClaims(
                 accessToken
         );


 String tokenType =
         claims.get(
                 "tokenType",
                 String.class
         );


 if (!"ACCESS".equals(tokenType)) {

     throw new CusAuthenticationException(
             "Invalid access token."
     );
 }


 // =====================================================
 // 2. VALIDATE CURRENT SESSION
 // =====================================================

 AuthSessions session =
         cusSessionService
                 .validateAccessSession(
                         claims
                 );


 Customers authenticatedCustomer =
         session.getCustomer();


 if (authenticatedCustomer == null
         || authenticatedCustomer.getCustomerId() == null) {

     throw new CusSessionExpiredException(
             "Customer session is invalid."
     );
 }


 UUID authenticatedCustomerId =
         authenticatedCustomer.getCustomerId();


 // =====================================================
 // 3. REQUEST VALIDATION
 // =====================================================

 if (request == null
         || request.getVerifiedChallengeGroupId() == null
         || request.getVerifiedChallengeGroupId().isBlank()
         || request.getNewPin() == null
         || request.getNewPin().isBlank()
         || request.getConfirmPin() == null
         || request.getConfirmPin().isBlank()) {

     throw new CusValidationException(
             "All PIN reset fields are required."
     );
 }


 String verifiedChallengeGroupId =
         request.getVerifiedChallengeGroupId()
                 .trim();


 String newPin =
         request.getNewPin();


 String confirmPin =
         request.getConfirmPin();


 // =====================================================
 // 4. NEW PIN = CONFIRM PIN ?
 // =====================================================

 if (!newPin.equals(
         confirmPin)) {

     throw new CusValidationException(
             "New PIN and confirm PIN do not match."
     );
 }


 // =====================================================
 // 5. PIN MUST BE EXACTLY 6 DIGITS
 // =====================================================

 if (!newPin.matches(
         "\\d{6}")) {

     throw new CusValidationException(
             "Transaction PIN must be exactly 6 digits."
     );
 }


 // =====================================================
 // 6. FIND VERIFIED PIN RESET CHALLENGE
 // =====================================================

 OtpChallenges verifiedChallenge =
         otpChallengesRepository
                 .findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(
                         verifiedChallengeGroupId,
                         OtpPurpose.PIN_RESET
                 )
                 .orElseThrow(() ->
                         new CusOtpException(
                                 "Invalid PIN reset authorization."
                         )
                 );


 // =====================================================
 // 7. OTP MUST HAVE BEEN VERIFIED
 // =====================================================

 if (verifiedChallenge.getStatus()
         != OtpStatus.CONSUMED
         || verifiedChallenge.getConsumedAt() == null) {

     throw new CusOtpException(
             "PIN reset authorization is not valid."
     );
 }


 // =====================================================
 // 8. CHALLENGE MUST BELONG TO CURRENT CUSTOMER
 // =====================================================

 Customers challengeCustomer =
         verifiedChallenge.getCustomer();


 if (challengeCustomer == null
         || challengeCustomer.getCustomerId() == null
         || !challengeCustomer
                 .getCustomerId()
                 .equals(
                         authenticatedCustomerId
                 )) {

     throw new CusOtpException(
             "Invalid PIN reset authorization."
     );
 }


 // =====================================================
 // 9. CUSTOMER MUST STILL BE ACTIVE
 // =====================================================

 validateCustomerStatus(
         authenticatedCustomer
 );


 // =====================================================
 // 10. GET CUSTOMER CREDENTIALS
 // =====================================================

 CustomerCredentials credentials =
         credentialsRepository
                 .findById(
                         authenticatedCustomerId
                 )
                 .orElseThrow(() ->
                         new RuntimeException(
                                 "Customer credentials not found."
                         )
                 );


 // =====================================================
 // 11. EXISTING PIN SHOULD ALREADY EXIST
 // =====================================================

 if (credentials.getTransactionPinHash() == null
         || credentials
                 .getTransactionPinHash()
                 .isBlank()) {

     throw new CusValidationException(
             "Transaction PIN has not been set yet."
     );
 }


 // =====================================================
 // 12. CLAIM VERIFIED CHALLENGE
 // ONE-TIME USE
 // =====================================================

 LocalDateTime now =
         LocalDateTime.now();


 String claimedChallengeGroupId =
         UUID.randomUUID()
                 .toString();


 int claimedRows =
         otpChallengesRepository
                 .claimVerifiedPinResetChallengeIfMatch(

                         verifiedChallenge.getOtpId(),

                         verifiedChallengeGroupId,

                         claimedChallengeGroupId,

                         OtpPurpose.PIN_RESET,

                         OtpStatus.CONSUMED,

                         UpdatedByType.CUSTOMER,

                         authenticatedCustomerId,

                         now
                 );


 if (claimedRows != 1) {

     throw new CusOtpException(
             "PIN reset authorization has already been used "
                     + "or is no longer valid."
     );
 }


 // =====================================================
 // 13. RELOAD CREDENTIALS AFTER CLEAR
 // =====================================================

 credentials =
         credentialsRepository
                 .findById(
                         authenticatedCustomerId
                 )
                 .orElseThrow(() ->
                         new RuntimeException(
                                 "Customer credentials not found."
                         )
                 );


 // =====================================================
 // 14. HASH NEW PIN
 // =====================================================

 String newPinHash =
         passwordEncoder.encode(
                 newPin
         );


 // =====================================================
 // 15. UPDATE PIN
 // =====================================================

 credentials.setTransactionPinHash(
         newPinHash
 );


 credentials.setPinChangedAt(
         now
 );


 // =====================================================
 // 16. RESET FAILED PIN ATTEMPTS
 // =====================================================

 credentials.setFailedPinAttemptCount(
         0
 );


 // =====================================================
 // 17. REMOVE PIN LOCK
 // =====================================================

 credentials.setPinLockedUntil(
         null
 );


 // =====================================================
 // 18. UPDATE AUDIT METADATA
 // =====================================================

 credentials.setUpdatedByType(
         UpdatedByType.CUSTOMER
 );


 credentials.setUpdatedById(
         authenticatedCustomerId
 );


 credentialsRepository.save(
         credentials
 );


 // =====================================================
 // 19. AUDIT LOG
 // NEVER SAVE RAW PIN
 // =====================================================

 saveAuditLog(
         ActorType.CUSTOMER,
         authenticatedCustomer,
         "PIN_RESET_SUCCESS",
         "CUSTOMER_CREDENTIALS",
         authenticatedCustomerId.toString(),
         null,
         "{\"pinChanged\":true,"
                 + "\"failedPinAttemptCount\":0,"
                 + "\"pinLocked\":false}"
 );
}
//=========================================================
//PASSWORD RESET - RESEND OTP
//=========================================================

@Transactional(
      noRollbackFor = CusEmailException.class
)
public CusOtpResendResponse resendPasswordResetOtp(
      CusOtpResendRequest request) {

  // =====================================================
  // 1. REQUEST VALIDATION
  // =====================================================

  if (request == null
          || request.getChallengeGroupId() == null
          || request.getChallengeGroupId().isBlank()) {

      throw new CusOtpException(
              "Password reset challenge is required."
      );
  }


  String challengeGroupId =
          request.getChallengeGroupId()
                  .trim();


  // =====================================================
  // 2. FIND LATEST PASSWORD RESET OTP
  // =====================================================

  OtpChallenges latestOtp =
          otpChallengesRepository
                  .findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(
                          challengeGroupId,
                          OtpPurpose.PASSWORD_RESET
                  )
                  .orElseThrow(() ->
                          new CusOtpException(
                                  "Invalid password reset challenge."
                          )
                  );


  // =====================================================
  // 3. ALREADY VERIFIED?
  // =====================================================

  if (latestOtp.getStatus()
          == OtpStatus.CONSUMED) {

      throw new CusOtpException(
              "Password reset OTP has already been verified."
      );
  }


  // =====================================================
  // 4. RESEND LIMIT CHECK
  // =====================================================

  if (latestOtp.getResendNo()
          >= latestOtp.getMaxResendAttempts()) {

      throw new CusOtpResendLimitException(
              "Maximum OTP resend attempts reached. "
                      + "Please restart password reset."
      );
  }


  // =====================================================
  // 5. GET CUSTOMER
  // =====================================================

  Customers customer =
          latestOtp.getCustomer();


  if (customer == null) {

      throw new CusOtpException(
              "Invalid password reset challenge."
      );
  }


  // Customer status ကို resend အချိန်မှာလည်း ပြန်စစ်
  validateCustomerStatus(
          customer
  );


  // =====================================================
  // 6. REGISTERED EMAIL REQUIRED
  // =====================================================

  if (customer.getEmail() == null
          || customer.getEmail().isBlank()) {

      throw new CusEmailException(
              "No registered email address is available "
                      + "for password reset."
      );
  }


  // =====================================================
  // 7. INVALIDATE PREVIOUS OTP
  // =====================================================
  //
  // ACTIVE ဖြစ်နေတာဆို EXPIRED ပြောင်းမယ်။
  //
  // BLOCKED ဖြစ်ပြီးသားဆို BLOCKED အတိုင်းထားမယ်။
  // EXPIRED ဖြစ်ပြီးသားဆို EXPIRED အတိုင်းထားမယ်။
  //
  // =====================================================

  if (latestOtp.getStatus()
          == OtpStatus.ACTIVE) {

      latestOtp.setStatus(
              OtpStatus.EXPIRED
      );

      markOtpUpdatedByCustomer(
              latestOtp
      );

      otpChallengesRepository.save(
              latestOtp
      );
  }


  // =====================================================
  // 8. GENERATE NEW OTP
  // =====================================================

  String rawOtp =
          generateOtp();


  String otpHash =
          passwordEncoder.encode(
                  rawOtp
          );


  LocalDateTime now =
          LocalDateTime.now();


  // =====================================================
  // 9. INCREMENT RESEND NUMBER
  // =====================================================

  int newResendNo =
          latestOtp.getResendNo() + 1;


  // =====================================================
  // 10. CREATE NEW PASSWORD RESET OTP
  // =====================================================

  OtpChallenges newOtp =
          OtpChallenges.builder()

                  .customer(
                          customer
                  )

                  .purpose(
                          OtpPurpose.PASSWORD_RESET
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

                  // IMPORTANT:
                  // OTP အသစ်ဖြစ်လို့ attemptCount = 0
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

                  // PASSWORD RESET PROCESS တစ်ခုတည်းဖြစ်လို့
                  // same challengeGroupId ကို ဆက်သုံးမယ်
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

                  .updatedByType(
                          UpdatedByType.CUSTOMER
                  )

                  .updatedById(
                          customer.getCustomerId()
                  )

                  .build();


  OtpChallenges savedOtp =
          otpChallengesRepository.save(
                  newOtp
          );


  // =====================================================
  // 11. SEND EMAIL
  // =====================================================

  try {

      cusEmailService.sendPasswordResetOtp(
              customer.getEmail(),
              rawOtp
      );


      // =================================================
      // AUDIT SUCCESS
      // =================================================

      saveAuditLog(
              ActorType.CUSTOMER,
              customer,
              "PASSWORD_RESET_OTP_RESENT",
              "OTP_CHALLENGE",
              String.valueOf(
                      savedOtp.getOtpId()
              ),
              null,
              "{\"purpose\":\"PASSWORD_RESET\","
                      + "\"status\":\"ACTIVE\","
                      + "\"resendNo\":"
                      + savedOtp.getResendNo()
                      + "}"
      );


  } catch (MailException ex) {

      // =================================================
      // EMAIL မပို့နိုင်ရင်
      // OTP ကို usable မဖြစ်အောင် EXPIRED
      // =================================================

      savedOtp.setStatus(
              OtpStatus.EXPIRED
      );


      markOtpUpdatedBySystem(
              savedOtp
      );


      otpChallengesRepository.save(
              savedOtp
      );


      saveAuditLog(
              ActorType.SYSTEM,
              null,
              "PASSWORD_RESET_OTP_RESEND_FAILED",
              "OTP_CHALLENGE",
              String.valueOf(
                      savedOtp.getOtpId()
              ),
              "{\"status\":\"ACTIVE\"}",
              "{\"status\":\"EXPIRED\","
                      + "\"reason\":\"EMAIL_SEND_FAILED\"}"
      );


      throw new CusEmailException(
              "Unable to resend password reset OTP. "
                      + "Please try again.",
              ex
      );
  }


  // =====================================================
  // 12. RESPONSE
  // =====================================================

  return new CusOtpResendResponse(
          true,
          "A new password reset OTP has been sent "
                  + "to your registered email.",
          savedOtp.getChallengeGroupId(),
          savedOtp.getDestinationMasked(),
          savedOtp.getResendNo()
  );
}
 
//=========================================================
//PASSWORD RESET - VERIFY OTP
//=========================================================

@Transactional(
     noRollbackFor = CusOtpException.class
)
public CusPasswordResetOtpVerifyResponse
     verifyPasswordResetOtp(
             CusPasswordResetOtpVerifyRequest request) {

 // =====================================================
 // 1. REQUEST VALIDATION
 // =====================================================

 if (request == null
         || request.getChallengeGroupId() == null
         || request.getChallengeGroupId().isBlank()
         || request.getOtp() == null
         || request.getOtp().isBlank()) {

     throw new CusOtpException(
             "OTP verification information is required."
     );
 }


 String challengeGroupId =
         request.getChallengeGroupId()
                 .trim();


 String enteredOtp =
         request.getOtp()
                 .trim();


 // =====================================================
 // 2. FIND PASSWORD RESET OTP
 // =====================================================

 OtpChallenges otpChallenge =
         otpChallengesRepository
                 .findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(
                         challengeGroupId,
                         OtpPurpose.PASSWORD_RESET
                 )
                 .orElseThrow(() ->
                         new CusOtpException(
                                 "Invalid password reset challenge."
                         )
                 );


 // =====================================================
 // 3. STATUS CHECK
 // =====================================================

 if (otpChallenge.getStatus()
         == OtpStatus.CONSUMED) {

     throw new CusOtpException(
             "This OTP has already been used."
     );
 }


 if (otpChallenge.getStatus()
         == OtpStatus.EXPIRED) {

     throw new CusOtpException(
             "OTP has expired."
     );
 }


 if (otpChallenge.getStatus()
         == OtpStatus.BLOCKED) {

     throw new CusOtpException(
             "OTP verification has been blocked."
     );
 }


 if (otpChallenge.getStatus()
         != OtpStatus.ACTIVE) {

     throw new CusOtpException(
             "OTP is not active."
     );
 }


 LocalDateTime now =
         LocalDateTime.now();


 // =====================================================
 // 4. EXPIRY CHECK
 // =====================================================

 if (otpChallenge.getExpiresAt() == null
         || !otpChallenge
                 .getExpiresAt()
                 .isAfter(now)) {

     otpChallenge.setStatus(
             OtpStatus.EXPIRED
     );

     markOtpUpdatedBySystem(
             otpChallenge
     );

     otpChallengesRepository.save(
             otpChallenge
     );


     saveAuditLog(
             ActorType.SYSTEM,
             null,
             "PASSWORD_RESET_OTP_EXPIRED",
             "OTP_CHALLENGE",
             String.valueOf(
                     otpChallenge.getOtpId()
             ),
             "{\"status\":\"ACTIVE\"}",
             "{\"status\":\"EXPIRED\","
                     + "\"reason\":\"TIME_EXPIRED\"}"
     );


     throw new CusOtpException(
             "OTP has expired."
     );
 }


 // =====================================================
 // 5. MAX ATTEMPTS CHECK
 // =====================================================

 if (otpChallenge.getAttemptCount()
         >= otpChallenge.getMaxAttempts()) {

     otpChallenge.setStatus(
             OtpStatus.BLOCKED
     );

     markOtpUpdatedBySystem(
             otpChallenge
     );

     otpChallengesRepository.save(
             otpChallenge
     );


     throw new CusOtpException(
             "OTP verification has been blocked."
     );
 }


 // =====================================================
 // 6. OTP MUST BE EXACTLY 6 DIGITS
 // =====================================================

 boolean validOtpFormat =
         enteredOtp.matches(
                 "\\d{6}"
         );


 // =====================================================
 // 7. VERIFY HASH
 // =====================================================

 boolean otpMatches =
         validOtpFormat

                 && passwordEncoder.matches(
                         enteredOtp,
                         otpChallenge.getOtpHash()
                 );


 // =====================================================
 // 8. WRONG OTP
 // =====================================================

 if (!otpMatches) {

     handleFailedPasswordResetOtpAttempt(
             otpChallenge
     );

     throw new CusOtpException(
             "Invalid OTP."
     );
 }


 // =====================================================
 // 9. CORRECT OTP
 // Rotate challenge ID after verification
 // =====================================================

 String verifiedChallengeGroupId =
         UUID.randomUUID()
                 .toString();


 int updatedRows =
         otpChallengesRepository
                 .consumePasswordResetOtpIfActive(

                         otpChallenge.getOtpId(),

                         challengeGroupId,

                         OtpPurpose.PASSWORD_RESET,

                         OtpStatus.ACTIVE,

                         OtpStatus.CONSUMED,

                         verifiedChallengeGroupId,

                         now,

                         now,

                         UpdatedByType.CUSTOMER,

                         otpChallenge
                                 .getCustomer()
                                 .getCustomerId(),

                         now
                 );


 // Another concurrent request already consumed it
 if (updatedRows != 1) {

     throw new CusOtpException(
             "OTP has already been used or is no longer valid."
     );
 }


 // =====================================================
 // 10. AUDIT
 // =====================================================

 saveAuditLog(
         ActorType.CUSTOMER,
         otpChallenge.getCustomer(),
         "PASSWORD_RESET_OTP_VERIFIED",
         "OTP_CHALLENGE",
         String.valueOf(
                 otpChallenge.getOtpId()
         ),
         "{\"status\":\"ACTIVE\"}",
         "{\"status\":\"CONSUMED\","
                 + "\"purpose\":\"PASSWORD_RESET\"}"
 );


 // =====================================================
 // 11. RESPONSE
 // =====================================================

 return new CusPasswordResetOtpVerifyResponse(
         true,
         "OTP verified successfully. You may now reset your password.",
         verifiedChallengeGroupId
 );
}

//=========================================================
//PASSWORD RESET - SET NEW PASSWORD
//=========================================================

@Transactional
public void resetPassword(
     CusPasswordResetConfirmRequest request) {

 // =====================================================
 // 1. REQUEST VALIDATION
 // =====================================================

 if (request == null
         || request.getVerifiedChallengeGroupId() == null
         || request.getVerifiedChallengeGroupId().isBlank()
         || request.getNewPassword() == null
         || request.getNewPassword().isBlank()
         || request.getConfirmPassword() == null
         || request.getConfirmPassword().isBlank()) {

     throw new CusValidationException(
             "All password reset fields are required."
     );
 }


 String verifiedChallengeGroupId =
         request.getVerifiedChallengeGroupId()
                 .trim();

 String newPassword =
         request.getNewPassword();

 String confirmPassword =
         request.getConfirmPassword();


 // =====================================================
 // 2. NEW PASSWORD = CONFIRM PASSWORD ?
 // =====================================================

 if (!newPassword.equals(
         confirmPassword)) {

     throw new CusValidationException(
             "New password and confirm password do not match."
     );
 }


 // =====================================================
 // 3. PASSWORD POLICY CHECK
 // =====================================================

 if (!isValidPassword(
         newPassword)) {

     throw new CusValidationException(
             "Password must be between 8 and 10 characters long, "
                     + "including at least one uppercase letter, "
                     + "one lowercase letter, one number, "
                     + "and one special character."
     );
 }


 // =====================================================
 // 4. FIND VERIFIED PASSWORD RESET CHALLENGE
 // =====================================================

 OtpChallenges verifiedChallenge =
         otpChallengesRepository
                 .findTopByChallengeGroupIdAndPurposeOrderByOtpIdDesc(
                         verifiedChallengeGroupId,
                         OtpPurpose.PASSWORD_RESET
                 )
                 .orElseThrow(() ->
                         new CusOtpException(
                                 "Invalid password reset authorization."
                         )
                 );


 // =====================================================
 // 5. OTP MUST ALREADY BE VERIFIED
 // =====================================================

 if (verifiedChallenge.getStatus()
         != OtpStatus.CONSUMED
         || verifiedChallenge.getConsumedAt() == null) {

     throw new CusOtpException(
             "Password reset authorization is not valid."
     );
 }


 // =====================================================
 // 6. GET CUSTOMER
 // =====================================================

 Customers customer =
         verifiedChallenge.getCustomer();


 if (customer == null
         || customer.getCustomerId() == null) {

     throw new CusOtpException(
             "Invalid password reset authorization."
     );
 }


 UUID customerId =
         customer.getCustomerId();


 // =====================================================
 // 7. CUSTOMER MUST STILL BE ACTIVE
 // =====================================================

 validateCustomerStatus(
         customer
 );


 // =====================================================
 // 8. GET CUSTOMER CREDENTIALS
 // =====================================================

 CustomerCredentials credentials =
         credentialsRepository
                 .findById(
                         customerId
                 )
                 .orElseThrow(() ->
                         new RuntimeException(
                                 "Customer credentials not found."
                         )
                 );


 // =====================================================
 // 9. NEW PASSWORD != CURRENT PASSWORD
 // =====================================================

 if (passwordEncoder.matches(
         newPassword,
         credentials.getPasswordHash())) {

     throw new CusValidationException(
             "New password must be different from the current password."
     );
 }


 // =====================================================
 // 10. CLAIM VERIFIED CHALLENGE
 // ONE-TIME USE
 // =====================================================

 LocalDateTime now =
         LocalDateTime.now();


 String claimedChallengeGroupId =
         UUID.randomUUID()
                 .toString();


 int claimedRows =
         otpChallengesRepository
                 .claimVerifiedPasswordResetChallengeIfMatch(

                         verifiedChallenge.getOtpId(),

                         verifiedChallengeGroupId,

                         claimedChallengeGroupId,

                         OtpPurpose.PASSWORD_RESET,

                         OtpStatus.CONSUMED,

                         UpdatedByType.CUSTOMER,

                         customerId,

                         now
                 );


 if (claimedRows != 1) {

     throw new CusOtpException(
             "Password reset authorization has already been used "
                     + "or is no longer valid."
     );
 }


 // =====================================================
 // 11. RELOAD AFTER ATOMIC CLAIM
 // Repository uses clearAutomatically = true
 // =====================================================

 customer =
         customerRepository
                 .findById(
                         customerId
                 )
                 .orElseThrow(() ->
                         new RuntimeException(
                                 "Customer not found."
                         )
                 );


 credentials =
         credentialsRepository
                 .findById(
                         customerId
                 )
                 .orElseThrow(() ->
                         new RuntimeException(
                                 "Customer credentials not found."
                         )
                 );


 // =====================================================
 // 12. HASH NEW PASSWORD
 // =====================================================

 String newPasswordHash =
         passwordEncoder.encode(
                 newPassword
         );


 // =====================================================
 // 13. UPDATE PASSWORD
 // =====================================================

 credentials.setPasswordHash(
         newPasswordHash
 );

 credentials.setPasswordChangedAt(
         now
 );


 // =====================================================
 // 14. INVALIDATE OLD ACCESS / REFRESH TOKENS
 // =====================================================

 credentials.setTokenVersion(
         credentials.getTokenVersion() + 1
 );


 // =====================================================
 // 15. UPDATE AUDIT METADATA
 // =====================================================

 credentials.setUpdatedByType(
         UpdatedByType.CUSTOMER
 );

 credentials.setUpdatedById(
         customerId
 );


 credentialsRepository.save(
         credentials
 );


 // =====================================================
 // 16. REVOKE ALL ACTIVE CUSTOMER SESSIONS
 // =====================================================

 int revokedSessions =
         cusSessionService
                 .revokeAllActiveCustomerSessions(

                         customerId,

                         "PASSWORD_RESET",

                         UpdatedByType.CUSTOMER,

                         customerId
                 );


 // =====================================================
 // 17. PASSWORD RESET AUDIT
 // NEVER LOG RAW PASSWORD
 // =====================================================

 saveAuditLog(
         ActorType.CUSTOMER,
         customer,
         "PASSWORD_RESET_SUCCESS",
         "CUSTOMER_CREDENTIALS",
         customerId.toString(),
         null,
         "{\"passwordChanged\":true,"
                 + "\"sessionsRevoked\":"
                 + revokedSessions
                 + "}"
 );
}
 
    
    // =========================================================
    // 12. FIRST LOGIN - CHANGE TEMPORARY PASSWORD
    // =========================================================
    @Transactional
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

            throw new CusValidationException(
                    "All password setup fields are required."
            );
        }

        // 2. New password = Confirm password ?
        if (!newPassword.equals(confirmPassword)) {

            throw new CusValidationException(
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

            throw new CusValidationException(
                    "Password change is not required."
            );
        }

        // 6. New password != Temporary password
        if (passwordEncoder.matches(
                newPassword,
                credentials.getPasswordHash())) {

            throw new CusValidationException(
                    "New password must be different from the temporary password."
            );
        }

        // 7. Password policy
        if (!isValidPassword(newPassword)) {

        	throw new CusValidationException(
        	        "Password must contain between 8 and 10 characters, "
        	                + "including at least one uppercase letter, "
        	                + "one lowercase letter, one number, "
        	                + "and one special character. "
        	                + "Whitespace is not allowed."
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
        
     // =====================================================
        // AUDIT LOG
        // =====================================================

        saveAuditLog(
                ActorType.CUSTOMER,
                customer,
                "FIRST_LOGIN_PASSWORD_CHANGED",
                "CUSTOMER_CREDENTIALS",
                customer.getCustomerId().toString(),
                null,
                "{\"passwordChanged\":true}"
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

            throw new CusValidationException(
                    "All PIN setup fields are required."
            );
        }


        // =====================================================
        // 2. PIN = CONFIRM PIN ?
        // =====================================================

        if (!pin.equals(confirmPin)) {

            throw new CusValidationException(
                    "PIN and confirm PIN do not match."
            );
        }


        // =====================================================
        // 3. EXACTLY 6 DIGITS
        // =====================================================

        if (!pin.matches("\\d{6}")) {

            throw new CusValidationException(
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

            throw new CusValidationException(
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

            throw new CusValidationException(
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

                     .updatedByType(
                             UpdatedByType.CUSTOMER
                     )

                     .updatedById(
                             customer.getCustomerId()
                     )

                     .build();


     authSessionsRepository.save(
             authSession
     );


     saveAuditLog(
             ActorType.CUSTOMER,
             customer,
             "AUTH_SESSION_CREATED",
             "AUTH_SESSION",
             authSession.getSessionUuid(),
             null,
             "{\"status\":\"ACTIVE\",\"idleTimeoutMinutes\":5}"
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
 
//=========================================================
//REFRESH TOKEN - ATOMIC ROTATION
//=========================================================

 @Transactional(
	        noRollbackFor = CusSessionExpiredException.class
	)
public CusTokenResponse refreshToken(
      CusRefreshTokenRequest request) {

  // =====================================================
  // 1. REQUEST VALIDATION
  // =====================================================

  if (request == null
          || request.getRefreshToken() == null
          || request.getRefreshToken().isBlank()) {

      throw new CusAuthenticationException(
              "Refresh token is required."
      );
  }


  String oldRefreshToken =
          request.getRefreshToken()
                  .trim();


  // =====================================================
  // 2. VERIFY REFRESH JWT
  // =====================================================

  Claims claims =
          cusJwtService.getClaims(
                  oldRefreshToken
          );


  // =====================================================
  // 3. VALIDATE SESSION + OLD REFRESH HASH
  // =====================================================
  //
  // ဒီ method က validation ပဲလုပ်တယ်.
  // DB refresh hash ကို ဒီနေရာမှာ မပြောင်းသေးဘူး.
  // =====================================================

  AuthSessions session =
          cusSessionService
                  .validateRefreshSession(
                          claims,
                          oldRefreshToken
                  );


  // =====================================================
  // 4. GET CUSTOMER
  // =====================================================

  Customers customer =
          session.getCustomer();


  if (customer == null
          || customer.getCustomerId() == null) {

      throw new CusAuthenticationException(
              "Customer session is invalid."
      );
  }


  // =====================================================
  // 5. GET CURRENT CUSTOMER CREDENTIALS
  // =====================================================

  CustomerCredentials credentials =
          credentialsRepository
                  .findById(
                          customer.getCustomerId()
                  )
                  .orElseThrow(() ->
                          new CusAuthenticationException(
                                  "Customer credentials not found."
                          )
                  );


  // =====================================================
  // 6. GENERATE NEW ACCESS TOKEN
  // =====================================================

  String newAccessToken =
          cusJwtService.generateAccessToken(
                  customer.getCustomerId(),
                  session.getSessionUuid(),
                  credentials.getTokenVersion()
          );


  // =====================================================
  // 7. GENERATE NEW REFRESH TOKEN
  // =====================================================

  String newRefreshToken =
          cusJwtService.generateRefreshToken(
                  customer.getCustomerId(),
                  session.getSessionUuid(),
                  credentials.getTokenVersion()
          );


  // =====================================================
  // 8. HASH OLD REFRESH TOKEN
  // =====================================================

  String oldRefreshTokenHash =
          cusSessionService.hashRefreshToken(
                  oldRefreshToken
          );


  // =====================================================
  // 9. HASH NEW REFRESH TOKEN
  // =====================================================

  String newRefreshTokenHash =
          cusSessionService.hashRefreshToken(
                  newRefreshToken
          );


  LocalDateTime now =
          LocalDateTime.now();


  LocalDateTime newRefreshExpiresAt =
          now.plusDays(7);


  // =====================================================
  // 10. ATOMIC REFRESH TOKEN ROTATION
  // =====================================================
  //
  // DB မှာ:
  //
  // WHERE sessionUuid = ?
  // AND refreshTokenHash = oldHash
  // AND revokedAt IS NULL
  //
  // ဖြစ်တဲ့ row ကိုပဲ update လုပ်မယ်.
  //
  // Concurrent requests ၂ ခုလာရင်:
  //
  // Request A -> updatedRows = 1
  // Request B -> updatedRows = 0
  //
  // =====================================================

  int updatedRows =
          authSessionsRepository
                  .rotateRefreshTokenIfMatch(

                          session.getSessionUuid(),

                          oldRefreshTokenHash,

                          newRefreshTokenHash,

                          newRefreshExpiresAt,

                          now,

                          UpdatedByType.CUSTOMER,

                          customer.getCustomerId()
                  );


  // =====================================================
  // 11. OLD REFRESH TOKEN ALREADY USED?
  // =====================================================

  if (updatedRows != 1) {

      throw new CusAuthenticationException(
              "Refresh token has already been used or is no longer valid."
      );
  }


  // =====================================================
  // 12. AUDIT SUCCESSFUL ROTATION
  // =====================================================
  //
  // updatedRows == 1 ဖြစ်တဲ့ winner request တစ်ခုတည်း
  // ဒီ audit ကိုရေးနိုင်မယ်.
  // =====================================================

  saveAuditLog(
          ActorType.CUSTOMER,
          customer,
          "TOKEN_REFRESHED",
          "AUTH_SESSION",
          session.getSessionUuid(),
          null,
          "{\"status\":\"ACTIVE\","
                  + "\"refreshTokenRotated\":true}"
  );


  // =====================================================
  // 13. RETURN NEW TOKENS
  // =====================================================

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

//=========================================================
//PASSWORD POLICY
//8 - 10 characters
//At least 1 uppercase
//At least 1 lowercase
//At least 1 number
//At least 1 special character
//No whitespace
//=========================================================

private boolean isValidPassword(
      String password) {

  // 1. Null check
  if (password == null) {
      return false;
  }


  // 2. Length must be between 8 and 10
  if (password.length() < MIN_PASSWORD_LENGTH
	        || password.length() > MAX_PASSWORD_LENGTH) {

	    return false;
	}


  // 3. Whitespace not allowed
  // space, tab, newline အကုန် reject
  if (password.matches(".*\\s.*")) {

      return false;
  }


  // 4. At least one uppercase letter
  boolean hasUppercase =
          password.matches(
                  ".*[A-Z].*"
          );


  // 5. At least one lowercase letter
  boolean hasLowercase =
          password.matches(
                  ".*[a-z].*"
          );


  // 6. At least one number
  boolean hasNumber =
          password.matches(
                  ".*\\d.*"
          );


  // 7. At least one special character
  boolean hasSpecialCharacter =
          password.matches(
                  ".*[^A-Za-z0-9\\s].*"
          );


  // 8. All rules must pass
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

            throw new CusOtpException(
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
                                new CusOtpException(
                                        "Invalid OTP challenge."
                                )
                        );

        if (otpChallenge.getStatus()
                != OtpStatus.CONSUMED) {

            throw new CusOtpException(
                    "OTP verification is required."
            );
        }


        if (otpChallenge.getConsumedAt() == null
                || otpChallenge.getConsumedAt()
                        .plusMinutes(10)
                        .isBefore(LocalDateTime.now())) {

            throw new CusSessionExpiredException(
                    "First-login setup session has expired. Please login again."
            );
        }

        return otpChallenge.getCustomer();
    }
    
 // =========================================================
 // CUSTOMER LOGOUT
 // =========================================================

    @Transactional(
            noRollbackFor = CusSessionExpiredException.class
    )
 public void logout(
         String authorizationHeader) {

     // =====================================================
     // 1. AUTHORIZATION HEADER CHECK
     // =====================================================

     if (authorizationHeader == null
             || !authorizationHeader.startsWith("Bearer ")) {

         throw new CusAuthenticationException(
                 "Access token is required."
         );
     }


     // =====================================================
     // 2. EXTRACT ACCESS TOKEN
     // =====================================================

     String accessToken =
             authorizationHeader
                     .substring(7)
                     .trim();


     // =====================================================
     // 3. VALIDATE JWT + READ CLAIMS
     // =====================================================

     Claims claims =
             cusJwtService.getClaims(
                     accessToken
             );


     // =====================================================
     // 4. TOKEN TYPE MUST BE ACCESS
     // =====================================================

     String tokenType =
             claims.get(
                     "tokenType",
                     String.class
             );


     if (!"ACCESS".equals(tokenType)) {

         throw new CusAuthenticationException(
                 "Invalid access token."
         );
     }


     // =====================================================
     // 5. GET JWT ID (JTI)
     // =====================================================

     String jti =
             claims.getId();


     if (jti == null
             || jti.isBlank()) {

         throw new CusAuthenticationException(
                 "Invalid token ID."
         );
     }


     // =====================================================
     // 6. VALIDATE AUTH SESSION
     // =====================================================

     AuthSessions session =
    	        cusSessionService
    	                .validateAccessSessionForLogout(
    	                        claims
    	                );


     Customers customer =
             session.getCustomer();


     if (customer == null
             || customer.getCustomerId() == null) {

         throw new CusSessionExpiredException(
                 "Customer session is invalid."
         );
     }


     // =====================================================
     // 7. ATOMIC SESSION REVOKE
     // =====================================================
     //
     // revokeSession() က:
     //
     // true
     // → ဒီ request က session ကို revoke လုပ်နိုင်ခဲ့တယ်
     //
     // false
     // → အခြား concurrent request က revoke လုပ်ပြီးသား
     //
     // ဒီလိုလုပ်တာကြောင့် duplicate logout audit
     // မဖြစ်တော့ဘူး.
     // =====================================================

     boolean revoked =
             cusSessionService.revokeSession(
                     session,
                     "USER_LOGOUT",
                     UpdatedByType.CUSTOMER,
                     customer.getCustomerId()
             );


     // Already revoked ဖြစ်နေပြီဆို
     // ထပ်ပြီး blacklist/audit မရေးတော့ဘူး

     if (!revoked) {

         return;
     }


     // =====================================================
     // 8. ACCESS TOKEN BLACKLIST
     // =====================================================

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
                                 customer
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

                         // ---------------------------------
                         // Customer ကိုယ်တိုင် logout
                         // ---------------------------------

                         .updatedByType(
                                 UpdatedByType.CUSTOMER
                         )

                         .updatedById(
                                 customer.getCustomerId()
                         )

                         .build();


         jwtRevokedTokensRepository.save(
                 revokedToken
         );
     }


     // =====================================================
     // 9. SAVE CUSTOMER LOGOUT AUDIT
     // =====================================================

     saveAuditLog(
             ActorType.CUSTOMER,

             customer,

             "CUSTOMER_LOGOUT",

             "AUTH_SESSION",

             session.getSessionUuid(),

             "{\"status\":\"ACTIVE\"}",

             "{\"status\":\"REVOKED\","
                     + "\"reason\":\"USER_LOGOUT\"}"
     );
 }


 // =========================================================
 // OTP AUDIT METADATA HELPERS
 // =========================================================

 private void markOtpUpdatedByCustomer(
         OtpChallenges otpChallenge) {

     if (otpChallenge == null
             || otpChallenge.getCustomer() == null
             || otpChallenge.getCustomer().getCustomerId() == null) {

         return;
     }

     otpChallenge.setUpdatedByType(
             UpdatedByType.CUSTOMER
     );

     otpChallenge.setUpdatedById(
             otpChallenge
                     .getCustomer()
                     .getCustomerId()
     );
 }


 private void markOtpUpdatedBySystem(
         OtpChallenges otpChallenge) {

     if (otpChallenge == null) {
         return;
     }

     otpChallenge.setUpdatedByType(
             UpdatedByType.SYSTEM
     );

     otpChallenge.setUpdatedById(
             null
     );
 }



private void handleFailedPasswordResetOtpAttempt(
        OtpChallenges otpChallenge) {

    int failedAttempts =
            otpChallenge.getAttemptCount() + 1;

    otpChallenge.setAttemptCount(
            failedAttempts
    );

    if (failedAttempts
            >= otpChallenge.getMaxAttempts()) {

        otpChallenge.setStatus(
                OtpStatus.BLOCKED
        );
    }

    markOtpUpdatedByCustomer(
            otpChallenge
    );

    otpChallengesRepository.save(
            otpChallenge
    );

    saveAuditLog(
            ActorType.CUSTOMER,
            otpChallenge.getCustomer(),
            "PASSWORD_RESET_OTP_VERIFY_FAILED",
            "OTP_CHALLENGE",
            String.valueOf(
                    otpChallenge.getOtpId()
            ),
            null,
            "{\"attemptCount\":"
                    + failedAttempts
                    + ",\"status\":\""
                    + otpChallenge.getStatus().name()
                    + "\"}"
    );
}
 // =========================================================
 // SECURITY AUDIT LOG HELPER
 // =========================================================

 private void saveAuditLog(
         ActorType actorType,
         Customers actorCustomer,
         String actionType,
         String entityType,
         String entityId,
         String oldValues,
         String newValues) {

     AuditLogs auditLog =
             AuditLogs.builder()

                     .actorType(
                             actorType
                     )

                     .actorCustomer(
                             actorCustomer
                     )

                     .actorStaff(
                             null
                     )

                     .actionType(
                             actionType
                     )

                     .entityType(
                             entityType
                     )

                     .entityId(
                             entityId
                     )

                     .oldValues(
                             oldValues
                     )

                     .newValues(
                             newValues
                     )

                     .build();


     auditLogsRepository.save(
             auditLog
     );
 }
}