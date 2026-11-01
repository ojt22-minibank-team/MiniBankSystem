package com.corebanking.service;

import com.corebanking.dto.CusSessionClientMetadata;
import com.corebanking.dto.CusRefreshTokenRequest;
import com.corebanking.dto.CusTokenResponse;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusSessionExpiredException;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCredentialsRepository;
import com.corebanking.repository.CusJwtRevokedTokensRepository;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.IncorrectClaimException;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.MissingClaimException;
import io.jsonwebtoken.PrematureJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.security.SignatureException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

/**
 * Individual Customer refresh/logout orchestration behind CusAuthService.
 * JWT and shared session mechanics remain in the existing injected services.
 * Matching REQUIRED rollback rules participate in the facade transaction.
 */
@Service
@RequiredArgsConstructor
public class CusCustomerSessionService {

    private final CusCredentialsRepository credentialsRepository;
    private final CusAuthSessionsRepository authSessionsRepository;
    private final CusJwtService cusJwtService;
    private final CusSessionService cusSessionService;
    private final CusJwtRevokedTokensRepository jwtRevokedTokensRepository;
    private final CusAuditLogsRepository auditLogsRepository;

@Transactional(
	        noRollbackFor = CusSessionExpiredException.class
	)
public CusTokenResponse refreshToken(
      CusRefreshTokenRequest request) {
        return refreshToken(request, CusSessionClientMetadata.EMPTY);
    }

    @Transactional(noRollbackFor = CusSessionExpiredException.class)
    public CusTokenResponse refreshToken(
      CusRefreshTokenRequest request, CusSessionClientMetadata metadata) {

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

  Claims claims;
  try {
      claims = cusJwtService.getClaims(oldRefreshToken);
  } catch (MalformedJwtException | ExpiredJwtException
          | SignatureException | IncorrectClaimException
          | MissingClaimException | PrematureJwtException | UnsupportedJwtException ex) {
      // Client credential errors only; signing-key/configuration failures propagate.
      throw new CusAuthenticationException("Invalid or expired refresh token.");
  }


  // =====================================================
  // 3. VALIDATE SESSION + OLD REFRESH HASH
  // =====================================================
  //
  // ဒီ method က validation ပဲလုပ်တယ်.
  // DB refresh hash ကို ဒီနေရာမှာ မပြောင်းသေးဘူး.
  // =====================================================

  AuthSession session =
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

  LocalDateTime absoluteDeadline =
          session.getIssuedAt().plusHours(CusJwtService.SESSION_LIFETIME_HOURS);
  LocalDateTime effectiveDeadline =
          session.getRefreshExpiresAt().isBefore(absoluteDeadline)
                  ? session.getRefreshExpiresAt()
                  : absoluteDeadline;

  String newRefreshToken =
          cusJwtService.generateRefreshToken(
                  customer.getCustomerId(),
                  session.getSessionUuid(),
                  credentials.getTokenVersion(),
                  Date.from(effectiveDeadline.atZone(ZoneId.systemDefault()).toInstant())
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

                          effectiveDeadline,

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
                  + "\"refreshTokenRotated\":true}", metadata
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

@Transactional(
            noRollbackFor = CusSessionExpiredException.class
    )
 public void logout(
         String authorizationHeader) {
        logout(authorizationHeader, CusSessionClientMetadata.EMPTY);
    }

    @Transactional(noRollbackFor = CusSessionExpiredException.class)
    public void logout(
         String authorizationHeader, CusSessionClientMetadata metadata) {

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

     AuthSession session =
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
                     + "\"reason\":\"USER_LOGOUT\"}", metadata
     );
 }

    // The small audit helper is shared with login/setup; the facade retains
    // its unchanged copy so those operations stay in their existing flows.

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
