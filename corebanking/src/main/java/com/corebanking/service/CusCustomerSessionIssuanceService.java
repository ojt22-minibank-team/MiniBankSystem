package com.corebanking.service;

import com.corebanking.dto.CusSessionClientMetadata;

import com.corebanking.dto.CusTokenResponse;
import com.corebanking.entity.AuditLogs;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.ActorType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.repository.CusAuditLogsRepository;
import com.corebanking.repository.CusAuthSessionsRepository;
import com.corebanking.repository.CusCredentialsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;
import java.util.UUID;

/**
 * Issues Customer sessions after the facade has authorized OTP/setup completion.
 * Runs synchronously in the caller's transaction with its existing managed entities.
 * JWT generation, refresh hashing and login history reuse the existing services.
 */
@Service
@RequiredArgsConstructor
public class CusCustomerSessionIssuanceService {

    private final CusAuthSessionsRepository authSessionsRepository;
    private final CusCredentialsRepository credentialsRepository;
    private final CusAuditLogsRepository auditLogsRepository;
    private final CusJwtService cusJwtService;
    private final CusSessionService cusSessionService;
    private final CusCustomerLoginAttemptService customerLoginAttemptService;

 public CusTokenResponse createAuthenticatedSession(
         Customers customer,
         CustomerCredentials credentials) {
     return createAuthenticatedSession(customer, credentials, CusSessionClientMetadata.EMPTY);
 }

 public CusTokenResponse createAuthenticatedSession(
         Customers customer, CustomerCredentials credentials, CusSessionClientMetadata metadata) {
     metadata = metadata == null ? CusSessionClientMetadata.EMPTY : metadata;

     LocalDateTime now =
             LocalDateTime.now();

     LocalDateTime absoluteDeadline =
             now.plusHours(CusJwtService.SESSION_LIFETIME_HOURS);

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
                     credentials.getTokenVersion(),
                     Date.from(absoluteDeadline.atZone(ZoneId.systemDefault()).toInstant())
             );


     // 4. Refresh Token Hash
     String refreshTokenHash =
    	        cusSessionService.hashRefreshToken(
    	                refreshToken
    	        );

     // 5. Auth Session
     AuthSession authSession =
             AuthSession.builder()

                     .sessionUuid(
                             sessionUuid
                     )

                     .ipAddress(metadata.ipAddress())
                     .userAgent(metadata.userAgent())

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
                             absoluteDeadline
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
             "{\"status\":\"ACTIVE\",\"idleTimeoutMinutes\":5}", metadata
     );


     // 6. Last Login Time
     credentials.setLastLoginAt(
             now
     );

     credentialsRepository.save(
             credentials
     );


     // 7. Login Success Record
     customerLoginAttemptService.saveLoginAttempt(
             customer.getCustomerCode(),
             customer,
             true,
             null, metadata
     );


     // 8. Return Tokens
     return new CusTokenResponse(
             true,
             "Login successful.",
             accessToken,
             refreshToken
     );
 }

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
