package com.corebanking.service;

import com.corebanking.dto.CusOtpResendRequest;
import com.corebanking.dto.CusOtpResendResponse;
import com.corebanking.dto.CusPasswordResetConfirmRequest;
import com.corebanking.dto.CusPasswordResetOtpVerifyRequest;
import com.corebanking.dto.CusPasswordResetOtpVerifyResponse;
import com.corebanking.dto.CusPasswordResetRequest;
import com.corebanking.dto.CusPasswordResetStartResponse;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.AuditLogs;
import com.corebanking.dto.CusSessionClientMetadata;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.DeliveryChannel;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusEmailException;
import com.corebanking.exception.CusOtpException;
import com.corebanking.exception.CusOtpResendLimitException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.repository.CusAccountsRepository;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CusCredentialsRepository;
import com.corebanking.repository.CusCustomerRepository;
import com.corebanking.repository.CusOtpChallengesRepository;
import lombok.RequiredArgsConstructor;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.mail.MailException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Individual Customer password-reset implementation behind CusAuthService.
 * The matching REQUIRED transaction rules join the facade transaction; the
 * authorization claim, password update and session revocation stay together.
 */
@Service
@RequiredArgsConstructor
public class CusCustomerPasswordResetService {

    private final CusCustomerRepository customerRepository;
    private final CusAccountsRepository accountsRepository;
    private final CusCredentialsRepository credentialsRepository;
    private final CusOtpChallengesRepository otpChallengesRepository;
    private final PasswordEncoder passwordEncoder;
    private final CusSessionService cusSessionService;
    private final CusEmailService cusEmailService;
    private final CusAuditLogsRepository auditLogsRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int MAX_OTP_RESENDS = 5;
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_LENGTH = 10;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

@Transactional(
         noRollbackFor = CusEmailException.class
 )
 public CusPasswordResetStartResponse requestPasswordReset(
         CusPasswordResetRequest request) {
    return requestPasswordReset(request, CusSessionClientMetadata.EMPTY);
}

@Transactional(
         noRollbackFor = CusEmailException.class
 )
 public CusPasswordResetStartResponse requestPasswordReset(
         CusPasswordResetRequest request, CusSessionClientMetadata metadata) {

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

      customer = CusCustomerOtpLocks.lockCustomer(entityManager, credentialsRepository,
              customer.getCustomerId()).getCustomer();

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

     OtpChallenge otpChallenge =
             OtpChallenge.builder()

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


     OtpChallenge savedOtp =
             otpChallengesRepository.save(
                     otpChallenge
             );


     // =====================================================
     // Expire predecessors after INSERT; avoid an empty InnoDB gap lock.
     // =====================================================

     var activeResetOtps =
             otpChallengesRepository
                     .findByCustomerAndPurposeAndStatus(
                             customer,
                             OtpPurpose.PASSWORD_RESET,
                             OtpStatus.ACTIVE
                     )
                     .stream()
                     .filter(otp -> !savedOtp.getOtpId().equals(otp.getOtpId()))
                     .toList();


     for (OtpChallenge otp : activeResetOtps) {

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
                         + "\"resendNo\":0}",
                 metadata
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
                         + "\"reason\":\"EMAIL_SEND_FAILED\"}",
                 metadata
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

@Transactional(
      noRollbackFor = CusEmailException.class
)
public CusOtpResendResponse resendPasswordResetOtp(
      CusOtpResendRequest request) {
    return resendPasswordResetOtp(request, CusSessionClientMetadata.EMPTY);
}

@Transactional(
      noRollbackFor = CusEmailException.class
)
public CusOtpResendResponse resendPasswordResetOtp(
      CusOtpResendRequest request, CusSessionClientMetadata metadata) {

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

  OtpChallenge latestOtp =
          CusCustomerOtpLocks.lockRequested(entityManager, credentialsRepository,
                  otpChallengesRepository, challengeGroupId, OtpPurpose.PASSWORD_RESET);


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

  OtpChallenge newOtp =
          OtpChallenge.builder()

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


  OtpChallenge savedOtp =
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
                      + "}",
              metadata
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
                      + "\"reason\":\"EMAIL_SEND_FAILED\"}",
              metadata
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

@Transactional(
     noRollbackFor = CusOtpException.class
)
public CusPasswordResetOtpVerifyResponse
     verifyPasswordResetOtp(
             CusPasswordResetOtpVerifyRequest request) {
    return verifyPasswordResetOtp(request, CusSessionClientMetadata.EMPTY);
}

@Transactional(
     noRollbackFor = CusOtpException.class
)
public CusPasswordResetOtpVerifyResponse
     verifyPasswordResetOtp(
             CusPasswordResetOtpVerifyRequest request, CusSessionClientMetadata metadata) {

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

 OtpChallenge otpChallenge =
         CusCustomerOtpLocks.lockRequested(entityManager, credentialsRepository,
                  otpChallengesRepository, challengeGroupId, OtpPurpose.PASSWORD_RESET);


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
                     + "\"reason\":\"TIME_EXPIRED\"}",
             metadata
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
             otpChallenge,
             metadata
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
                 + "\"purpose\":\"PASSWORD_RESET\"}",
         metadata
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

@Transactional
public void resetPassword(
     CusPasswordResetConfirmRequest request) {
    resetPassword(request, CusSessionClientMetadata.EMPTY);
}

@Transactional
public void resetPassword(
     CusPasswordResetConfirmRequest request, CusSessionClientMetadata metadata) {

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

 OtpChallenge verifiedChallenge =
         CusCustomerOtpLocks.lockRequested(entityManager, credentialsRepository,
                  otpChallengesRepository, verifiedChallengeGroupId, OtpPurpose.PASSWORD_RESET);


 // =====================================================
 // 5. OTP MUST ALREADY BE VERIFIED
 // =====================================================

 if (verifiedChallenge.getStatus()
         != OtpStatus.CONSUMED
         || verifiedChallenge.getConsumedAt() == null
         || verifiedChallenge.getExpiresAt() == null
         || !verifiedChallenge.getExpiresAt().isAfter(LocalDateTime.now())) {

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

 // The claim clears JPA state. A locking read avoids the provisional RR snapshot.


 credentials =
         credentialsRepository
                 .findByCustomerIdForUpdate(
                         customerId
                 )
                 .orElseThrow(() ->
                         new RuntimeException(
                                 "Customer credentials not found."
                         )
                 );


 // Fresh owner from the same authoritative locking read.
 customer = credentials.getCustomer();

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
                 + "}",
         metadata
 );
}

    // Small private helpers retain the existing behavior without coupling back
    // to the facade. Login and PIN-reset helpers remain in CusAuthService.

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

    private void validateCustomerStatus(
            Customers customer) {

        if (customer.getStatus()
                != CustomerStatus.ACTIVE) {

            throw new CusAuthenticationException(
                    "Customer account is not active."
            );
        }
    }

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

private void handleFailedPasswordResetOtpAttempt(
        OtpChallenge otpChallenge, CusSessionClientMetadata metadata) {

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
                    + "\"}",
            metadata
    );
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
