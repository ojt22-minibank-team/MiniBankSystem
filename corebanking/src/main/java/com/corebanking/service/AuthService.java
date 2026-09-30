package com.corebanking.service;

import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.dto.CoreRefreshRequest;
import com.corebanking.entity.AuthSessions;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.repository.AuthSessionsRepository;
import com.corebanking.repository.JWTRevokedTokensRepository;
import com.corebanking.repository.PermissionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.security.JwtService;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

import java.time.LocalDateTime;
import java.time.ZoneId;

import java.util.Base64;
import java.util.Date;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final StaffUsersRepository staffUsersRepository;

    private final RolesRepository rolesRepository;

    private final PermissionsRepository permissionsRepository;

    private final PasswordEncoder passwordEncoder;

    private final JwtService jwtService;

    private final AuthSessionsRepository authSessionsRepository;

    private final JWTRevokedTokensRepository jwtRevokedTokensRepository;


    // =========================================================
    // LOGIN
    // =========================================================

    
    public CoreLoginResponse login(CoreLoginRequest request) {

        StaffUsers staff = staffUsersRepository
                .findByUsername(request.getUsername())
                .orElseThrow(() ->
                        new RuntimeException(
                                "Invalid username or password"
                        )
                );

//rer
        // Account Lock Check
        if (staff.getLockedUntil() != null
                && staff.getLockedUntil().isAfter(LocalDateTime.now())) {

            throw new RuntimeException(
                    "Account is temporarily locked due to too many failed attempts. Please try again later."
            );
        }


        // Password Check
        if (!passwordEncoder.matches(
                request.getPassword(),
                staff.getPasswordHash()
        )) {

            staff.setFailedLoginCount(
                    staff.getFailedLoginCount() + 1
            );

            if (staff.getFailedLoginCount() >= 5) {

                staff.setLockedUntil(
                        LocalDateTime.now().plusMinutes(15)
                );
            }

            staffUsersRepository.save(staff);

            throw new RuntimeException(
                    "Invalid username or password"
            );
        }


        // Reset failed login
        staff.setFailedLoginCount(0);
        staff.setLockedUntil(null);

        staffUsersRepository.save(staff);

        staff.setLastLoginAt(LocalDateTime.now());

        staffUsersRepository.save(staff);
        
        // Account Status
        if (staff.getStatus() != StaffUserStatus.ACTIVE) {

            throw new RuntimeException(
                    "Account is not active"
            );
        }


        UUID staffId = staff.getStaffId();


        // Roles
        List<String> roles =
                rolesRepository.findRoleCodesByStaffId(
                        uuidToBytes(staffId)
                );


        // Permissions
        List<String> permissions =
                permissionsRepository.findPermissionCodesByStaffId(
                        uuidToBytes(staffId)
                );


        // =========================================================
        // ACCESS TOKEN
        // =========================================================

        String accessToken =
                jwtService.generateToken(
                        staffId,
                        staff.getUsername(),
                        staff.getTokenVersion(),
                        roles,
                        permissions
                );


        // =========================================================
        // REFRESH TOKEN
        // =========================================================

        String plainRefreshToken =
                generateSecureToken();

        String refreshTokenHash =
                hashToken(plainRefreshToken);


        // =========================================================
        // AUTH SESSION
        // =========================================================

        AuthSessions session =
                AuthSessions.builder()

                        .sessionUuid(
                                UUID.randomUUID().toString()
                        )

                        .subjectType(
                                SessionSubjectType.STAFF
                        )

                        .staff(staff)

                        .refreshTokenHash(
                                refreshTokenHash
                        )

                        .tokenVersionAtIssue(
                                staff.getTokenVersion()
                        )

                        .issuedAt(
                                LocalDateTime.now()
                        )

                        .lastSeenAt(
                                LocalDateTime.now()
                        )

                        .refreshExpiresAt(
                                LocalDateTime.now().plusDays(7)
                        )

                        .idleTimeoutMinutes(15)

                        .updatedAt(
                                LocalDateTime.now()
                        )

                        .build();


        authSessionsRepository.save(session);


        return new CoreLoginResponse(
                accessToken,
                plainRefreshToken,
                staff.getUsername(),
                roles,
                permissions
        );
    }


    // =========================================================
    // REFRESH TOKEN
    // =========================================================

    @Transactional
    public CoreLoginResponse refreshToken(
            CoreRefreshRequest request
    ) {

        String plainToken =
                request.getRefreshToken();


        if (plainToken == null
                || plainToken.isBlank()) {

            throw new RuntimeException(
                    "Refresh token is required"
            );
        }


        String hashedToken =
                hashToken(plainToken);


        AuthSessions session =
                authSessionsRepository
                        .findByRefreshTokenHash(hashedToken)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Invalid refresh token"
                                )
                        );


        // Already revoked
        if (session.getRevokedAt() != null) {

            throw new RuntimeException(
                    "Refresh token is revoked. Please login again."
            );
        }


        // Expired
        if (session.getRefreshExpiresAt()
                .isBefore(LocalDateTime.now())) {

            throw new RuntimeException(
                    "Refresh token has expired. Please login again."
            );
        }


        StaffUsers staff =
                session.getStaff();


        // Staff Status
        if (staff.getStatus()
                != StaffUserStatus.ACTIVE) {

            throw new RuntimeException(
                    "Account is not active"
            );
        }


        // Token Version
        if (session.getTokenVersionAtIssue()
                != staff.getTokenVersion()) {

            throw new RuntimeException(
                    "Token version mismatch. Please login again."
            );
        }


        UUID staffId =
                staff.getStaffId();


        List<String> roles =
                rolesRepository.findRoleCodesByStaffId(
                        uuidToBytes(staffId)
                );


        List<String> permissions =
                permissionsRepository.findPermissionCodesByStaffId(
                        uuidToBytes(staffId)
                );


        // =========================================================
        // NEW ACCESS TOKEN
        // =========================================================

        String newAccessToken =
                jwtService.generateToken(
                        staffId,
                        staff.getUsername(),
                        staff.getTokenVersion(),
                        roles,
                        permissions
                );


        // =========================================================
        // NEW REFRESH TOKEN
        // =========================================================

        String newPlainRefreshToken =
                generateSecureToken();

        String newRefreshTokenHash =
                hashToken(newPlainRefreshToken);


        // Revoke old refresh session
        session.setRevokedAt(
                LocalDateTime.now()
        );

        session.setRevokeReason(
                "Token Rotated"
        );

        authSessionsRepository.save(session);


        // Create new session
        AuthSessions newSession =
                AuthSessions.builder()

                        .sessionUuid(
                                UUID.randomUUID().toString()
                        )

                        .subjectType(
                                session.getSubjectType()
                        )

                        .staff(staff)

                        .refreshTokenHash(
                                newRefreshTokenHash
                        )

                        .tokenVersionAtIssue(
                                staff.getTokenVersion()
                        )

                        .issuedAt(
                                LocalDateTime.now()
                        )

                        .lastSeenAt(
                                LocalDateTime.now()
                        )

                        .refreshExpiresAt(
                                LocalDateTime.now().plusDays(7)
                        )

                        .idleTimeoutMinutes(15)

                        .updatedAt(
                                LocalDateTime.now()
                        )

                        .build();


        authSessionsRepository.save(newSession);


        return new CoreLoginResponse(
                newAccessToken,
                newPlainRefreshToken,
                staff.getUsername(),
                roles,
                permissions
        );
    }


    // =========================================================
    // LOGOUT
    // =========================================================

    @Transactional
    public void logout(
            String authorizationHeader,
            CoreRefreshRequest request
    ) {


        // =========================================================
        // 1. CHECK ACCESS TOKEN
        // =========================================================

        if (authorizationHeader == null
                || !authorizationHeader.startsWith("Bearer ")) {

            throw new RuntimeException(
                    "Authorization token is required"
            );
        }


        String accessToken =
                authorizationHeader.substring(7).trim();


        if (accessToken.isBlank()) {

            throw new RuntimeException(
                    "Access token is empty"
            );
        }


        // =========================================================
        // 2. EXTRACT JWT DATA
        // =========================================================

        String jti =
                jwtService.extractJti(accessToken);

        UUID staffId =
                jwtService.extractStaffId(accessToken);

        Date expirationDate =
                jwtService.extractAllClaims(accessToken)
                        .getExpiration();


        LocalDateTime expiresAt =
                expirationDate
                        .toInstant()
                        .atZone(
                                ZoneId.systemDefault()
                        )
                        .toLocalDateTime();


        // =========================================================
        // 3. REVOKE REFRESH TOKEN
        // =========================================================

        if (request != null
                && request.getRefreshToken() != null
                && !request.getRefreshToken().isBlank()) {


            String plainRefreshToken =
                    request.getRefreshToken();


            String hashedToken =
                    hashToken(plainRefreshToken);


            AuthSessions session =
                    authSessionsRepository
                            .findByRefreshTokenHash(
                                    hashedToken
                            )
                            .orElse(null);


            if (session != null) {

                session.setRevokedAt(
                        LocalDateTime.now()
                );

                session.setRevokeReason(
                        "User Logout"
                );

                session.setLastSeenAt(
                        LocalDateTime.now()
                );

                authSessionsRepository.save(session);
            }
        }


        // =========================================================
        // 4. REVOKE ACCESS TOKEN
        // =========================================================

        if (!jwtRevokedTokensRepository
                .existsByJti(jti)) {


            StaffUsers staff =
                    staffUsersRepository
                            .findById(staffId)
                            .orElse(null);


            JwtRevokedTokens revokedToken =
                    JwtRevokedTokens.builder()

                            .jti(jti)

                            .subjectType(
                                    SessionSubjectType.STAFF
                            )

                            .staff(staff)

                            .tokenExpiresAt(
                                    expiresAt
                            )

                            .reason(
                                    "User Logout"
                            )

                            .updatedByType(
                                    com.corebanking.entity.enums.UpdatedByType.STAFF
                            )

                            .updatedById(
                                    staffId
                            )

                            .updatedAt(
                                    LocalDateTime.now()
                            )

                            .build();


            jwtRevokedTokensRepository.save(
                    revokedToken
            );
        }
    }


    // =========================================================
    // SECURE REFRESH TOKEN GENERATOR
    // =========================================================

    private String generateSecureToken() {

        SecureRandom secureRandom =
                new SecureRandom();

        byte[] randomBytes =
                new byte[32];

        secureRandom.nextBytes(
                randomBytes
        );

        return Base64
                .getUrlEncoder()
                .withoutPadding()
                .encodeToString(
                        randomBytes
                );
    }


    // =========================================================
    // HASH TOKEN
    // =========================================================

    private String hashToken(
            String token
    ) {

        if (token == null) {

            throw new RuntimeException(
                    "Token cannot be null"
            );
        }


        try {

            MessageDigest digest =
                    MessageDigest.getInstance(
                            "SHA-256"
                    );


            byte[] hash =
                    digest.digest(
                            token.getBytes(
                                    StandardCharsets.UTF_8
                            )
                    );


            return Base64
                    .getEncoder()
                    .encodeToString(
                            hash
                    );


        } catch (NoSuchAlgorithmException e) {

            throw new RuntimeException(
                    "Error hashing token",
                    e
            );
        }
    }


    // =========================================================
    // UUID -> BYTE[]
    // =========================================================

    private byte[] uuidToBytes(
            UUID uuid
    ) {

        long msb =
                uuid.getMostSignificantBits();

        long lsb =
                uuid.getLeastSignificantBits();

        byte[] bytes =
                new byte[16];


        for (int i = 0; i < 8; i++) {

            bytes[i] =
                    (byte) (
                            msb >>> (56 - 8 * i)
                    );

            bytes[i + 8] =
                    (byte) (
                            lsb >>> (56 - 8 * i)
                    );
        }


        return bytes;
    }
}