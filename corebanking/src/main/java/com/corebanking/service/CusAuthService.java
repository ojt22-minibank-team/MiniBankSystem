package com.corebanking.service;

import com.corebanking.dto.CusSessionClientMetadata;

import java.security.SecureRandom;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import com.corebanking.exception.CusValidationException;
import com.corebanking.dto.CusPasswordResetConfirmRequest;
import java.time.LocalDateTime;
import java.util.UUID;
import com.corebanking.dto.CusPinResetStartResponse;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Propagation;
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
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.DeliveryChannel;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.OtpSubjectType;
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
@RequiredArgsConstructor(onConstructor_ = @Autowired)
public class CusAuthService {

    private final CusCustomerRepository customerRepository;
    private final CusAccountsRepository accountsRepository;
    private final CusCredentialsRepository credentialsRepository;
    private final CusCustomerLoginAttemptService customerLoginAttemptService;
    private final CusOtpChallengesRepository otpChallengesRepository;
    private final PasswordEncoder passwordEncoder;
    private final CusAuthSessionsRepository authSessionsRepository;
    private final CusJwtService cusJwtService;
    private final CusSessionService cusSessionService;
    private final CusJwtRevokedTokensRepository jwtRevokedTokensRepository;
    private final CusEmailService cusEmailService;
    private final CusAuditLogsRepository auditLogsRepository;
    private final CusCustomerPasswordResetService customerPasswordResetService;
    private final CusCustomerPinResetService customerPinResetService;
    private final CusCustomerSessionService customerSessionService;
    private final CusCustomerSessionIssuanceService customerSessionIssuanceService;


    /**
     * Preserve the writer-based 15-argument constructor. Direct callers use a
     * real issuer with the same dependencies and history writer. Spring selects
     * the annotated full constructor and injects the managed issuer instead.
     */
    public CusAuthService(
            CusCustomerRepository customerRepository,
            CusAccountsRepository accountsRepository,
            CusCredentialsRepository credentialsRepository,
            CusCustomerLoginAttemptService customerLoginAttemptService,
            CusOtpChallengesRepository otpChallengesRepository,
            PasswordEncoder passwordEncoder,
            CusAuthSessionsRepository authSessionsRepository,
            CusJwtService cusJwtService,
            CusSessionService cusSessionService,
            CusJwtRevokedTokensRepository jwtRevokedTokensRepository,
            CusEmailService cusEmailService,
            CusAuditLogsRepository auditLogsRepository,
            CusCustomerPasswordResetService customerPasswordResetService,
            CusCustomerPinResetService customerPinResetService,
            CusCustomerSessionService customerSessionService) {
        this(customerRepository, accountsRepository, credentialsRepository,
                customerLoginAttemptService, otpChallengesRepository, passwordEncoder,
                authSessionsRepository, cusJwtService, cusSessionService,
                jwtRevokedTokensRepository, cusEmailService, auditLogsRepository,
                customerPasswordResetService, customerPinResetService, customerSessionService,
                new CusCustomerSessionIssuanceService(authSessionsRepository, credentialsRepository,
                        auditLogsRepository, cusJwtService, cusSessionService, customerLoginAttemptService));
    }

    /**
     * Preserve the existing 15-argument direct-construction API with the real
     * writer using the supplied repository. Spring selects the annotated
     * constructor and injects the managed writer instead.
     */
    public CusAuthService(
            CusCustomerRepository customerRepository,
            CusAccountsRepository accountsRepository,
            CusCredentialsRepository credentialsRepository,
            CusLoginAttemptsRepository loginAttemptsRepository,
            CusOtpChallengesRepository otpChallengesRepository,
            PasswordEncoder passwordEncoder,
            CusAuthSessionsRepository authSessionsRepository,
            CusJwtService cusJwtService,
            CusSessionService cusSessionService,
            CusJwtRevokedTokensRepository jwtRevokedTokensRepository,
            CusEmailService cusEmailService,
            CusAuditLogsRepository auditLogsRepository,
            CusCustomerPasswordResetService customerPasswordResetService,
            CusCustomerPinResetService customerPinResetService,
            CusCustomerSessionService customerSessionService) {
        this(customerRepository, accountsRepository, credentialsRepository,
                new CusCustomerLoginAttemptService(loginAttemptsRepository),
                otpChallengesRepository, passwordEncoder, authSessionsRepository,
                cusJwtService, cusSessionService, jwtRevokedTokensRepository,
                cusEmailService, auditLogsRepository, customerPasswordResetService,
                customerPinResetService, customerSessionService);
    }

    /**
     * Preserve the existing direct-construction API. Spring selects the
     * annotated full constructor and injects the managed orchestration bean.
     * Direct callers reuse their existing JWT/session dependency instances;
     * transaction boundaries remain on the public facade entry points.
     */
    public CusAuthService(
            CusCustomerRepository customerRepository,
            CusAccountsRepository accountsRepository,
            CusCredentialsRepository credentialsRepository,
            CusLoginAttemptsRepository loginAttemptsRepository,
            CusOtpChallengesRepository otpChallengesRepository,
            PasswordEncoder passwordEncoder,
            CusAuthSessionsRepository authSessionsRepository,
            CusJwtService cusJwtService,
            CusSessionService cusSessionService,
            CusJwtRevokedTokensRepository jwtRevokedTokensRepository,
            CusEmailService cusEmailService,
            CusAuditLogsRepository auditLogsRepository,
            CusCustomerPasswordResetService customerPasswordResetService,
            CusCustomerPinResetService customerPinResetService) {
        this(customerRepository, accountsRepository, credentialsRepository,
                loginAttemptsRepository, otpChallengesRepository, passwordEncoder,
                authSessionsRepository, cusJwtService, cusSessionService,
                jwtRevokedTokensRepository, cusEmailService, auditLogsRepository,
                customerPasswordResetService, customerPinResetService,
                new CusCustomerSessionService(credentialsRepository, authSessionsRepository,
                        cusJwtService, cusSessionService, jwtRevokedTokensRepository, auditLogsRepository));
    }

    @PersistenceContext
    private EntityManager entityManager;


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

    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            noRollbackFor = {
                    CusAuthenticationException.class,
                    CusAccountLockedException.class,
                    CusEmailException.class
            }
    )
    public CusLoginResponse authenticateCredentials(
            CusLoginRequest request) {
        return authenticateCredentials(request, CusSessionClientMetadata.EMPTY);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = {CusAuthenticationException.class, CusAccountLockedException.class, CusEmailException.class})
    public CusLoginResponse authenticateCredentials(
            CusLoginRequest request, CusSessionClientMetadata metadata) {

        // TEMPORARY PERFORMANCE TIMING - remove after testing
        long loginStartTime = System.currentTimeMillis();
        System.out.println("\n========== LOGIN TIMING START ==========");


        // Request validation


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
                    "INVALID_IDENTIFIER", metadata
            );

            throw ex;
        }

        System.out.println(
                "[TIMING] Customer lookup: "
                        + (System.currentTimeMillis() - customerLookupStart)
                        + " ms"
        );

        // Customer status စစ်
     

        validateLoginCustomerStatus(customer, identifier, metadata);

        // Customer Credentials ရှာ
       

        long credentialsLookupStart = System.currentTimeMillis();

        UUID customerId = customer.getCustomerId();
        // No writes yet: discard the identifier lookup before the locking read.
        entityManager.clear();
        CustomerCredentials credentials =
                credentialsRepository
                        .findByCustomerIdForUpdate(customerId)
                        .orElseThrow(() ->
                                new CusAuthenticationException(
                                        "Invalid login credentials."
                                )
                        );

        customer = credentials.getCustomer();
        if (customer == null || !customerId.equals(customer.getCustomerId())) {
            throw new CusAuthenticationException("Invalid login credentials.");
        }
        validateLoginCustomerStatus(customer, identifier, metadata);

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
                customer, metadata
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
                        "ACCOUNT_LOCKED", metadata
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
                    "INVALID_PASSWORD", metadata
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

        OtpChallenge otpChallenge =
                createLoginOtp(customer, metadata);

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

    // Preserve the status decision while recording the previously missing inactive attempt.
    private void validateLoginCustomerStatus(Customers customer, String identifier, CusSessionClientMetadata metadata) {
        try { validateCustomerStatus(customer); }
        catch (CusAuthenticationException ex) {
            saveLoginAttempt(identifier, customer, false, "ACCOUNT_INACTIVE", metadata);
            throw ex;
        }
    }

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
        checkLoginLock(credentials, identifier, customer, CusSessionClientMetadata.EMPTY);
    }

    private void checkLoginLock(
            CustomerCredentials credentials,
            String identifier,
            Customers customer, CusSessionClientMetadata metadata) {

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
                    "ACCOUNT_LOCKED", metadata
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
        saveLoginAttempt(identifier, customer, success, failureReason, CusSessionClientMetadata.EMPTY);
    }

    private void saveLoginAttempt(
            String identifier,
            Customers customer,
            boolean success,
            String failureReason, CusSessionClientMetadata metadata) {
        customerLoginAttemptService.saveLoginAttempt(identifier, customer, success, failureReason, metadata);
    }


    private void saveInvalidLoginAttempt(
            String identifier,
            String failureReason) {
        saveInvalidLoginAttempt(identifier, failureReason, CusSessionClientMetadata.EMPTY);
    }

    private void saveInvalidLoginAttempt(
            String identifier,
            String failureReason, CusSessionClientMetadata metadata) {
        customerLoginAttemptService.saveInvalidLoginAttempt(identifier, failureReason, metadata);
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

    private OtpChallenge createLoginOtp(
            Customers customer) {
        return createLoginOtp(customer, CusSessionClientMetadata.EMPTY);
    }

    private OtpChallenge createLoginOtp(
            Customers customer, CusSessionClientMetadata metadata) {

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

        // The credential lock is already held. Lock the current original before
        // expiring any active replacements; an absent root is safe under that lock.
        otpChallengesRepository
                .findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(
                        customer.getCustomerId(), OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0);


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

        OtpChallenge otpChallenge =
                OtpChallenge.builder()

                        .subjectType(OtpSubjectType.CUSTOMER)

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

        OtpChallenge savedOtp =
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
                    "{\"purpose\":\"LOGIN\",\"status\":\"ACTIVE\",\"resendNo\":0}", metadata
            );

        } catch (MailException ex) {
           // ex.printStackTrace();

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
                    "{\"status\":\"EXPIRED\",\"reason\":\"EMAIL_SEND_FAILED\"}", metadata
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
                        .findByCustomerAndSubjectTypeAndPurposeAndStatus(
                                customer,
                                OtpSubjectType.CUSTOMER,
                                OtpPurpose.LOGIN,
                                OtpStatus.ACTIVE
                        );


        for (OtpChallenge otp
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
    public CusOtpVerifyResponse verifyLoginOtp(CusOtpVerifyRequest request) {
        return verifyLoginOtp(request, CusSessionClientMetadata.EMPTY);
    }

    @Transactional(noRollbackFor = CusOtpException.class)
    public CusOtpVerifyResponse verifyLoginOtp(
            CusOtpVerifyRequest request, CusSessionClientMetadata metadata) {

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
        OtpChallenge otpChallenge = lockCurrentCustomerLoginChallenge(challengeGroupId);

        // 3. Status checks
        if (otpChallenge.getStatus() == OtpStatus.CONSUMED
                || otpChallenge.getConsumedAt() != null) {

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
                    "{\"status\":\"EXPIRED\",\"reason\":\"TIME_EXPIRED\"}", metadata
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
                    "{\"status\":\"BLOCKED\",\"reason\":\"MAX_ATTEMPTS_REACHED\"}", metadata
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
                    otpChallenge, metadata
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
                "{\"status\":\"CONSUMED\"}", metadata
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
                        credentials, metadata
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
            OtpChallenge otpChallenge) {
        handleFailedOtpAttempt(otpChallenge, CusSessionClientMetadata.EMPTY);
    }

    private void handleFailedOtpAttempt(
            OtpChallenge otpChallenge, CusSessionClientMetadata metadata) {

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
                        + ",\"status\":\"" + otpChallenge.getStatus().name() + "\"}", metadata
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
                    "{\"status\":\"BLOCKED\",\"reason\":\"MAX_ATTEMPTS_REACHED\"}", metadata
            );
        }
    }
    @Transactional(noRollbackFor = CusEmailException.class)
    public CusOtpResendResponse resendLoginOtp(
            CusOtpResendRequest request) {
        return resendLoginOtp(request, CusSessionClientMetadata.EMPTY);
    }

    @Transactional(noRollbackFor = CusEmailException.class)
    public CusOtpResendResponse resendLoginOtp(
            CusOtpResendRequest request, CusSessionClientMetadata metadata) {

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
        OtpChallenge latestOtp = lockCurrentCustomerLoginChallenge(challengeGroupId);


        // 3. OTP already consumed?
        if (latestOtp.getStatus()
                == OtpStatus.CONSUMED || latestOtp.getConsumedAt() != null) {

            throw new CusOtpException(
                    "OTP has already been verified."
            );
        }

        if (latestOtp.getStatus() != OtpStatus.ACTIVE
                && latestOtp.getStatus() != OtpStatus.EXPIRED
                && latestOtp.getStatus() != OtpStatus.BLOCKED) {
            throw new CusOtpException("OTP cannot be resent.");
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
        OtpChallenge newOtp =
                OtpChallenge.builder()

                        .subjectType(OtpSubjectType.CUSTOMER)

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


        OtpChallenge savedOtp =
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
                            + savedOtp.getResendNo() + "}", metadata
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
                    "{\"status\":\"EXPIRED\",\"reason\":\"EMAIL_SEND_FAILED\"}", metadata
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
        return customerPasswordResetService.requestPasswordReset(request);
}
 
//=========================================================
//TRANSACTION PIN RESET - REQUEST OTP
//=========================================================

@Transactional(
      noRollbackFor = CusEmailException.class
)
public CusPinResetStartResponse requestPinReset(
      String authorizationHeader) {
        return customerPinResetService.requestPinReset(authorizationHeader);
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
        return customerPinResetService.resendPinResetOtp(authorizationHeader, request);
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
        return customerPinResetService.verifyPinResetOtp(authorizationHeader, request);
}


//=========================================================
//TRANSACTION PIN RESET - CONFIRM NEW PIN
//=========================================================

@Transactional
public void resetTransactionPin(
     String authorizationHeader,
     CusPinResetConfirmRequest request) {
        customerPinResetService.resetTransactionPin(authorizationHeader, request);
}
//=========================================================
//PASSWORD RESET - RESEND OTP
//=========================================================

@Transactional(
      noRollbackFor = CusEmailException.class
)
public CusOtpResendResponse resendPasswordResetOtp(
      CusOtpResendRequest request) {
        return customerPasswordResetService.resendPasswordResetOtp(request);
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
        return customerPasswordResetService.verifyPasswordResetOtp(request);
}

//=========================================================
//PASSWORD RESET - SET NEW PASSWORD
//=========================================================

@Transactional
public void resetPassword(
     CusPasswordResetConfirmRequest request) {
        customerPasswordResetService.resetPassword(request);
}


    // =========================================================
    // 12. FIRST LOGIN - CHANGE TEMPORARY PASSWORD
    // =========================================================
    @Transactional
    public void changeFirstLoginPassword(
            String challengeGroupId,
            String newPassword,
            String confirmPassword) {
        changeFirstLoginPassword(challengeGroupId, newPassword, confirmPassword, CusSessionClientMetadata.EMPTY);
    }

    @Transactional
    public void changeFirstLoginPassword(
            String challengeGroupId,
            String newPassword,
            String confirmPassword, CusSessionClientMetadata metadata) {

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
                "{\"passwordChanged\":true}", metadata
        );
    }
    

    // =========================================================
    // 13. FIRST LOGIN - CREATE TRANSACTION PIN
    // =========================================================
    @Transactional
    public CusTokenResponse setupTransactionPin(String challengeGroupId, String pin, String confirmPin) {
        return setupTransactionPin(challengeGroupId, pin, confirmPin, CusSessionClientMetadata.EMPTY);
    }

    @Transactional
    public CusTokenResponse setupTransactionPin(
            String challengeGroupId,
            String pin,
            String confirmPin, CusSessionClientMetadata metadata) {

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
                credentials, metadata
        );
    }
    
 // =========================================================
 // CREATE AUTHENTICATED CUSTOMER SESSION
 // =========================================================

 private CusTokenResponse createAuthenticatedSession(
         Customers customer,
         CustomerCredentials credentials) {
     return customerSessionIssuanceService.createAuthenticatedSession(customer, credentials);
 }

 private CusTokenResponse createAuthenticatedSession(
         Customers customer, CustomerCredentials credentials, CusSessionClientMetadata metadata) {
     return customerSessionIssuanceService.createAuthenticatedSession(customer, credentials, metadata);
 }

 
//=========================================================
//REFRESH TOKEN - ATOMIC ROTATION
//=========================================================

 @Transactional(
	        noRollbackFor = CusSessionExpiredException.class
	)
public CusTokenResponse refreshToken(
      CusRefreshTokenRequest request) {
        return customerSessionService.refreshToken(request);
    }

    @Transactional(noRollbackFor = CusSessionExpiredException.class)
    public CusTokenResponse refreshToken(
      CusRefreshTokenRequest request, CusSessionClientMetadata metadata) {
        return customerSessionService.refreshToken(request, metadata);
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

        OtpChallenge otpChallenge = lockCurrentCustomerLoginChallenge(challengeGroupId.trim());

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

    /**
     * Called before mutations, inside each public LOGIN/setup transaction.
     * The provisional read resolves only the lock owner; it never authorizes a
     * request. Discard it before credential -> original -> requested OTP locks.
     */
    private OtpChallenge lockCurrentCustomerLoginChallenge(String challengeGroupId) {
        OtpChallenge provisional = otpChallengesRepository
                .findTopByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                        challengeGroupId, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)
                .orElseThrow(() -> new CusOtpException("Invalid OTP challenge."));
        Customers provisionalCustomer = provisional.getCustomer();
        if (provisionalCustomer == null || provisionalCustomer.getCustomerId() == null
                || provisional.getCorporateUser() != null) {
            throw new CusOtpException("Invalid customer OTP challenge.");
        }
        UUID customerId = provisionalCustomer.getCustomerId();
        entityManager.clear();

        // Kept managed for subsequent findById calls in verify/password/PIN
        // setup; those calls reuse this locked credential until commit.
        CustomerCredentials credentials = credentialsRepository.findByCustomerIdForUpdate(customerId)
                .orElseThrow(() -> new CusAuthenticationException("Invalid login credentials."));
        OtpChallenge original = otpChallengesRepository
                .findFirstByCustomer_CustomerIdAndSubjectTypeAndPurposeAndResendNoOrderByOtpIdDesc(
                        customerId, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN, 0)
                .orElseThrow(() -> new CusOtpException("Invalid current login challenge. Please login again."));
        if (!challengeGroupId.equals(original.getChallengeGroupId())) {
            throw new CusOtpException("This login challenge has been superseded. Please login again.");
        }

        OtpChallenge challenge = otpChallengesRepository
                .findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                        challengeGroupId, OtpSubjectType.CUSTOMER, OtpPurpose.LOGIN)
                .orElseThrow(() -> new CusOtpException("Invalid OTP challenge."));
        Customers customer = credentials.getCustomer();
        if (customer == null || !customerId.equals(customer.getCustomerId())
                || challenge.getCustomer() == null
                || !customerId.equals(challenge.getCustomer().getCustomerId())
                || challenge.getCorporateUser() != null
                || challenge.getSubjectType() != OtpSubjectType.CUSTOMER
                || challenge.getPurpose() != OtpPurpose.LOGIN) {
            throw new CusOtpException("Invalid customer OTP challenge.");
        }
        validateCustomerStatus(customer);
        return challenge;
    }
    
 // =========================================================
 // CUSTOMER LOGOUT
 // =========================================================

    @Transactional(
            noRollbackFor = CusSessionExpiredException.class
    )
 public void logout(
         String authorizationHeader) {
        customerSessionService.logout(authorizationHeader);
    }

    @Transactional(noRollbackFor = CusSessionExpiredException.class)
    public void logout(
         String authorizationHeader, CusSessionClientMetadata metadata) {
        customerSessionService.logout(authorizationHeader, metadata);
}


 // =========================================================
 // OTP AUDIT METADATA HELPERS
 // =========================================================

 private void markOtpUpdatedByCustomer(
         OtpChallenge otpChallenge) {

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
         OtpChallenge otpChallenge) {

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
        saveAuditLog(actorType, actorCustomer, actionType, entityType, entityId, oldValues, newValues, CusSessionClientMetadata.EMPTY);
    }

    private void saveAuditLog(
         ActorType actorType,
         Customers actorCustomer,
         String actionType,
         String entityType,
         String entityId,
         String oldValues,
         String newValues, CusSessionClientMetadata metadata) {

     AuditLogs auditLog =
             AuditLogs.builder()
                     .ipAddress(metadata == null ? null : metadata.ipAddress())
                     .userAgent(metadata == null ? null : metadata.userAgent())

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
