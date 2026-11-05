package com.corebanking.service;

import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.dto.CoreLogoutRequest;
import com.corebanking.dto.CoreRefreshRequest;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.exception.AuthException;
import com.corebanking.repository.AuthSessionsRepository;
import com.corebanking.repository.JWTRevokedTokensRepository;
import com.corebanking.repository.PermissionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.security.JwtService;

import io.jsonwebtoken.ExpiredJwtException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
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
import java.util.Optional;
import java.util.UUID;

@Slf4j
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

    @Value("${security.auth.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${security.auth.lockout-duration-minutes:15}")
    private int lockoutDurationMinutes;

    @Value("${security.auth.refresh-token-validity-days:7}")
    private int refreshTokenValidityDays;

    
    private static final String DUMMY_HASH = "$2a$12$MpBOjLk9yUNq/JNmUSFSg.1SvrEtcDQGCt3puJz7Q2aSMoilMHr.m";

    // =========================================================
    // LOGIN
    // =========================================================

    @Transactional(noRollbackFor = AuthException.class)
    public CoreLoginResponse login(CoreLoginRequest request) {

        
    	Optional<StaffUsers> staffOpt = staffUsersRepository.findByUsernameWithLock(request.getUsername());

        
        if (staffOpt.isEmpty()) {
            
            passwordEncoder.matches(request.getPassword(), DUMMY_HASH);
            throw new AuthException("Invalid username or password");
        }

        StaffUsers staff = staffOpt.get();

        // 1. Account Lock Check
        if (staff.getLockedUntil() != null && staff.getLockedUntil().isAfter(LocalDateTime.now())) {
            log.warn("Login attempt for locked account: {}", staff.getUsername());
            throw new AuthException("Account is temporarily locked due to too many failed attempts. Please try again later.");
        }

        // 2. Account Status Check
        if (staff.getStatus() != StaffUserStatus.ACTIVE) {
            throw new AuthException("Account is not active");
        }

        if (staff.isMustChangePassword()) {
            throw new AuthException(
                "Password setup is required. Please use the setup link sent to your email."
            );
        }
        // 3. Password Check
        if (!passwordEncoder.matches(request.getPassword(), staff.getPasswordHash())) {
            handleFailedLogin(staff);
            throw new AuthException("Invalid username or password");
        }

        // 4. Reset failed login & Update last login
        staff.setFailedLoginCount(0);
        staff.setLockedUntil(null);
        staff.setLastLoginAt(LocalDateTime.now());
        staffUsersRepository.save(staff);

        UUID staffId = staff.getStaffId();
        byte[] staffIdBytes = uuidToBytes(staffId);

        List<String> roles = rolesRepository.findRoleCodesByStaffId(staffIdBytes);
        List<String> permissions = permissionsRepository.findPermissionCodesByStaffId(staffIdBytes);

        // Generate Tokens
        String accessToken = jwtService.generateToken(staffId, staff.getUsername(), staff.getTokenVersion(), roles, permissions);
        String plainRefreshToken = generateSecureToken();
        String refreshTokenHash = hashToken(plainRefreshToken);

        // Create Auth Session
        AuthSession session = AuthSession.builder()
                .sessionUuid(UUID.randomUUID().toString())
                .subjectType(SessionSubjectType.STAFF)
                .staff(staff)
                .refreshTokenHash(refreshTokenHash)
                .tokenVersionAtIssue(staff.getTokenVersion())
                .issuedAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .refreshExpiresAt(LocalDateTime.now().plusDays(refreshTokenValidityDays))
                .idleTimeoutMinutes(lockoutDurationMinutes)
                .updatedAt(LocalDateTime.now())
                .build();

        authSessionsRepository.save(session);
        log.info("Successful login for user: {}", staff.getUsername());

        return new CoreLoginResponse(accessToken, plainRefreshToken, staff.getUsername(), roles, permissions);
    }

    private void handleFailedLogin(StaffUsers staff) {
        staff.setFailedLoginCount(staff.getFailedLoginCount() + 1);
        if (staff.getFailedLoginCount() >= maxFailedAttempts) {
            staff.setLockedUntil(LocalDateTime.now().plusMinutes(lockoutDurationMinutes));
            log.warn("Account locked due to {} failed attempts: {}", maxFailedAttempts, staff.getUsername());
        }
        staffUsersRepository.save(staff);
    }

    // =========================================================
    // REFRESH TOKEN
    // =========================================================

    @Transactional
    public CoreLoginResponse refreshToken(CoreRefreshRequest request) {

        String plainToken = request.getRefreshToken();
        if (plainToken == null || plainToken.isBlank()) {
            throw new AuthException("Refresh token is required");
        }

        String hashedToken = hashToken(plainToken);
        
        
        AuthSession session = authSessionsRepository.findByRefreshTokenHash(hashedToken)
                .orElseThrow(() -> new AuthException("Invalid refresh token"));

        StaffUsers staff = session.getStaff();

        
        if (session.getRevokedAt() != null) {
            log.error("SECURITY ALERT: Attempted to reuse a revoked refresh token for user: {}", staff.getUsername());
            authSessionsRepository.revokeAllActiveSessionsByStaffId(staff.getStaffId());
            throw new AuthException("Security Alert: Token compromised. All sessions revoked. Please login again.");
        }

        if (session.getRefreshExpiresAt().isBefore(LocalDateTime.now())) {
            throw new AuthException("Refresh token has expired. Please login again.");
        }

        if (staff.getStatus() != StaffUserStatus.ACTIVE) {
            throw new AuthException("Account is not active");
        }

        if (session.getTokenVersionAtIssue() != staff.getTokenVersion()) {
            throw new AuthException("Token version mismatch. Please login again.");
        }

        UUID staffId = staff.getStaffId();
        byte[] staffIdBytes = uuidToBytes(staffId);

        List<String> roles = rolesRepository.findRoleCodesByStaffId(staffIdBytes);
        List<String> permissions = permissionsRepository.findPermissionCodesByStaffId(staffIdBytes);

        // Generate New Tokens (Token Rotation)
        String newAccessToken = jwtService.generateToken(staffId, staff.getUsername(), staff.getTokenVersion(), roles, permissions);
        String newPlainRefreshToken = generateSecureToken();
        String newRefreshTokenHash = hashToken(newPlainRefreshToken);

        // Revoke Old Session
        session.setRevokedAt(LocalDateTime.now());
        session.setRevokeReason("Token Rotated");
        authSessionsRepository.save(session);

        // Create New Session
        AuthSession newSession = AuthSession.builder()
                .sessionUuid(UUID.randomUUID().toString())
                .subjectType(session.getSubjectType())
                .staff(staff)
                .refreshTokenHash(newRefreshTokenHash)
                .tokenVersionAtIssue(staff.getTokenVersion())
                .issuedAt(LocalDateTime.now())
                .lastSeenAt(LocalDateTime.now())
                .refreshExpiresAt(LocalDateTime.now().plusDays(refreshTokenValidityDays))
                .idleTimeoutMinutes(lockoutDurationMinutes)
                .updatedAt(LocalDateTime.now())
                .build();

        authSessionsRepository.save(newSession);

        return new CoreLoginResponse(newAccessToken, newPlainRefreshToken, staff.getUsername(), roles, permissions);
    }

    // =========================================================
    // LOGOUT
    // =========================================================

    @Transactional
    public void logout(
            String authorizationHeader,
            CoreLogoutRequest request) {

        // 1. Validate Authorization header
        if (authorizationHeader == null
                || !authorizationHeader.startsWith("Bearer ")) {
            throw new AuthException(
                    "Authorization token is required");
        }

        String accessToken =
                authorizationHeader.substring(7).trim();

        if (accessToken.isBlank()) {
            throw new AuthException("Access token is empty");
        }

        // 2. Validate access token and extract claims
        io.jsonwebtoken.Claims claims;

        try {
            claims = jwtService.extractAllClaims(accessToken);

        } catch (ExpiredJwtException e) {
            // Allow logout using an expired access token
            claims = e.getClaims();

        } catch (Exception e) {
            log.warn("Invalid access token during logout");
            throw new AuthException("Invalid access token");
        }

        // 3. Extract required claims
        String jti = claims.getId();
        Date expirationDate = claims.getExpiration();

        UUID staffId;

        try {
            Object staffIdClaim = claims.get("staff_id");

            if (staffIdClaim == null) {
                throw new IllegalArgumentException(
                        "Missing staff_id claim");
            }

            staffId = UUID.fromString(staffIdClaim.toString());

        } catch (Exception e) {
            throw new AuthException(
                    "Invalid staff ID in access token");
        }

        if (jti == null || jti.isBlank()
                || expirationDate == null) {
            throw new AuthException(
                    "Required access token claims are missing");
        }

        LocalDateTime now = LocalDateTime.now();

        LocalDateTime expiresAt = expirationDate.toInstant()
                .atZone(ZoneId.systemDefault())
                .toLocalDateTime();

        // 4. Find staff
        StaffUsers staff = staffUsersRepository.findById(staffId)
                .orElseThrow(() ->
                        new AuthException("Staff account not found"));

        // 5. Find and validate refresh session BEFORE changing data
        AuthSession session = null;

        if (request != null
                && request.getRefreshToken() != null
                && !request.getRefreshToken().isBlank()) {

            String hashedToken = hashToken(request.getRefreshToken());

            session = authSessionsRepository
                    .findByRefreshTokenHash(hashedToken)
                    .orElseThrow(() ->
                            new AuthException("Invalid refresh token"));

            if (session.getStaff() == null
                    || !staffId.equals(
                            session.getStaff().getStaffId())) {
                throw new AuthException(
                        "Refresh token does not belong to this staff");
            }
        }

        // 6. Revoke refresh session
        if (session != null && session.getRevokedAt() == null) {
            session.setRevokedAt(now);
            session.setRevokeReason("User Logout");
            session.setLastSeenAt(now);

            authSessionsRepository.save(session);
        }

        // 7. Blacklist access token if it has not expired
        if (expiresAt.isAfter(now)
                && !jwtRevokedTokensRepository.existsByJti(jti)) {

            JwtRevokedTokens revokedToken =
                    JwtRevokedTokens.builder()
                            .jti(jti)
                            .subjectType(SessionSubjectType.STAFF)
                            .staff(staff)
                            .tokenExpiresAt(expiresAt)
                            .reason("User Logout")
                            .updatedByType(
                                    com.corebanking.entity.enums
                                            .UpdatedByType.STAFF)
                            .updatedById(staffId)
                            .updatedAt(now)
                            .build();

            jwtRevokedTokensRepository.save(revokedToken);
        }

        log.info("Logout completed for staff ID: {}", staffId);
    }

    // =========================================================
    // CLEANUP SCHEDULED JOB
    // =========================================================

    @Scheduled(cron = "0 0 2 * * ?") 
    @Transactional
    public void cleanupExpiredTokens() {
        log.info("Starting cleanup of expired revoked tokens...");
        jwtRevokedTokensRepository.deleteByTokenExpiresAtBefore(LocalDateTime.now());
        log.info("Finished cleanup of expired revoked tokens.");
    }

    // =========================================================
    // SECURE REFRESH TOKEN GENERATOR
    // =========================================================

    private String generateSecureToken() {
        SecureRandom secureRandom = new SecureRandom();
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }

    // =========================================================
    // HASH TOKEN
    // =========================================================

    private String hashToken(String token) {
        if (token == null) {
            throw new RuntimeException("Token cannot be null");
        }
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Error hashing token", e);
        }
    }

    // =========================================================
    // UUID -> BYTE[]
    // =========================================================

    private byte[] uuidToBytes(UUID uuid) {
        long msb = uuid.getMostSignificantBits();
        long lsb = uuid.getLeastSignificantBits();
        byte[] bytes = new byte[16];

        for (int i = 0; i < 8; i++) {
            bytes[i] = (byte) (msb >>> (56 - 8 * i));
            bytes[i + 8] = (byte) (lsb >>> (56 - 8 * i));
        }
        return bytes;
    }
}