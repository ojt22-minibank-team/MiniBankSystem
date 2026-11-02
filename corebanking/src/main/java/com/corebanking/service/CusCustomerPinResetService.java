package com.corebanking.service;

import com.corebanking.dto.CusOtpResendRequest;
import com.corebanking.dto.CusOtpResendResponse;
import com.corebanking.dto.CusPinResetConfirmRequest;
import com.corebanking.dto.CusPinResetOtpVerifyRequest;
import com.corebanking.dto.CusPinResetOtpVerifyResponse;
import com.corebanking.dto.CusPinResetStartResponse;
import com.corebanking.entity.AuditLogs;
import com.corebanking.dto.CusSessionClientMetadata;
import com.corebanking.entity.AuthSession;
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
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CusCredentialsRepository;
import com.corebanking.repository.CusOtpChallengesRepository;
import io.jsonwebtoken.Claims;
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
 * Individual Customer transaction-PIN reset implementation behind CusAuthService.
 * Matching REQUIRED transaction rules join the facade transaction and retain
 * the existing session validation, OTP updates, authorization claim and PIN update.
 */
@Service
@RequiredArgsConstructor
public class CusCustomerPinResetService {

    private final CusCredentialsRepository credentialsRepository;
    private final CusOtpChallengesRepository otpChallengesRepository;
    private final PasswordEncoder passwordEncoder;
    private final CusJwtService cusJwtService;
    private final CusSessionService cusSessionService;
    private final CusEmailService cusEmailService;
    private final CusAuditLogsRepository auditLogsRepository;

    @PersistenceContext
    private EntityManager entityManager;

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int MAX_OTP_RESENDS = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

@Transactional(
      noRollbackFor = CusEmailException.class
)
public CusPinResetStartResponse requestPinReset(
      String authorizationHeader) {
    return requestPinReset(authorizationHeader, CusSessionClientMetadata.EMPTY);
}

@Transactional(
      noRollbackFor = CusEmailException.class
)
public CusPinResetStartResponse requestPinReset(
      String authorizationHeader, CusSessionClientMetadata metadata) {

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

  CustomerCredentials lockedResetCredentials = CusCustomerOtpLocks.lockCustomer(
          entityManager, credentialsRepository, CusCustomerOtpLocks.customerSubject(claims.getSubject()));

  AuthSession session =
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

  OtpChallenge otpChallenge =
          OtpChallenge.builder()

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


  OtpChallenge savedOtp =
          otpChallengesRepository.save(
                  otpChallenge
          );


  // =====================================================
  // Expire predecessors after INSERT; avoid an empty InnoDB gap lock.
  // =====================================================

  var activePinResetOtps =
          otpChallengesRepository
                  .findByCustomerAndPurposeAndStatus(
                          customer,
                          OtpPurpose.PIN_RESET,
                          OtpStatus.ACTIVE
                  )
                     .stream()
                     .filter(otp -> !savedOtp.getOtpId().equals(otp.getOtpId()))
                     .toList();


  for (OtpChallenge otp : activePinResetOtps) {

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
                      + "\"resendNo\":0}",
              metadata
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
                      + "\"reason\":\"EMAIL_SEND_FAILED\"}",
              metadata
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

@Transactional(
     noRollbackFor = CusEmailException.class
)
public CusOtpResendResponse resendPinResetOtp(
     String authorizationHeader,
     CusOtpResendRequest request) {
    return resendPinResetOtp(authorizationHeader, request, CusSessionClientMetadata.EMPTY);
}

@Transactional(
     noRollbackFor = CusEmailException.class
)
public CusOtpResendResponse resendPinResetOtp(
     String authorizationHeader,
     CusOtpResendRequest request, CusSessionClientMetadata metadata) {

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

 CustomerCredentials lockedResetCredentials = CusCustomerOtpLocks.lockCustomer(
         entityManager, credentialsRepository, CusCustomerOtpLocks.customerSubject(claims.getSubject()));

 AuthSession session =
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

 OtpChallenge latestOtp =
         CusCustomerOtpLocks.current(entityManager, otpChallengesRepository, lockedResetCredentials,
                  challengeGroupId, OtpPurpose.PIN_RESET);


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

 OtpChallenge newOtp =
         OtpChallenge.builder()

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


 OtpChallenge savedOtp =
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
                     + "}",
             metadata
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
                     + "\"reason\":\"EMAIL_SEND_FAILED\"}",
             metadata
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

@Transactional(
     noRollbackFor = CusOtpException.class
)
public CusPinResetOtpVerifyResponse verifyPinResetOtp(
     String authorizationHeader,
     CusPinResetOtpVerifyRequest request) {
    return verifyPinResetOtp(authorizationHeader, request, CusSessionClientMetadata.EMPTY);
}

@Transactional(
     noRollbackFor = CusOtpException.class
)
public CusPinResetOtpVerifyResponse verifyPinResetOtp(
     String authorizationHeader,
     CusPinResetOtpVerifyRequest request, CusSessionClientMetadata metadata) {

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

 CustomerCredentials lockedResetCredentials = CusCustomerOtpLocks.lockCustomer(
         entityManager, credentialsRepository, CusCustomerOtpLocks.customerSubject(claims.getSubject()));

 AuthSession session =
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

 OtpChallenge otpChallenge =
         CusCustomerOtpLocks.current(entityManager, otpChallengesRepository, lockedResetCredentials,
                  challengeGroupId, OtpPurpose.PIN_RESET);


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
                     + "\"reason\":\"TIME_EXPIRED\"}",
             metadata
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
                     + "\"}",
             metadata
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
                 + "\"purpose\":\"PIN_RESET\"}",
         metadata
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

@Transactional
public void resetTransactionPin(
     String authorizationHeader,
     CusPinResetConfirmRequest request) {
    resetTransactionPin(authorizationHeader, request, CusSessionClientMetadata.EMPTY);
}

@Transactional
public void resetTransactionPin(
     String authorizationHeader,
     CusPinResetConfirmRequest request, CusSessionClientMetadata metadata) {

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

 CustomerCredentials lockedResetCredentials = CusCustomerOtpLocks.lockCustomer(
         entityManager, credentialsRepository, CusCustomerOtpLocks.customerSubject(claims.getSubject()));

 AuthSession session =
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

 OtpChallenge verifiedChallenge =
         CusCustomerOtpLocks.current(entityManager, otpChallengesRepository, lockedResetCredentials,
                  verifiedChallengeGroupId, OtpPurpose.PIN_RESET);


 // =====================================================
 // 7. OTP MUST HAVE BEEN VERIFIED
 // =====================================================

 if (verifiedChallenge.getStatus()
         != OtpStatus.CONSUMED
         || verifiedChallenge.getConsumedAt() == null
         || verifiedChallenge.getExpiresAt() == null
         || !verifiedChallenge.getExpiresAt().isAfter(LocalDateTime.now())) {

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
                 .findByCustomerIdForUpdate(
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
                 + "\"pinLocked\":false}",
         metadata
 );
}

    // Small shared helpers retain their original behavior. Their existing
    // facade copies remain for login and first-login flows.

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
