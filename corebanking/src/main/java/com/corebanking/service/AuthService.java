package com.corebanking.service;

import com.corebanking.dto.CoreLoginRequest;
import com.corebanking.dto.CoreLoginResponse;
import com.corebanking.dto.CoreLogoutRequest;
import com.corebanking.dto.CoreOtpResendRequest;
import com.corebanking.dto.CoreOtpResendResponse;
import com.corebanking.dto.CoreOtpVerifyRequest;
import com.corebanking.dto.CoreRefreshRequest;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.JwtRevokedTokens;
import com.corebanking.entity.OtpChallenge;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.DeliveryChannel;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;
import com.corebanking.entity.enums.OtpSubjectType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.AuthException;
import com.corebanking.repository.AuthSessionsRepository;
import com.corebanking.repository.JWTRevokedTokensRepository;
import com.corebanking.repository.PermissionsRepository;
import com.corebanking.repository.RolesRepository;
import com.corebanking.repository.StaffOtpChallengesRepository;
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
    private final SessionRevocationService sessionRevocationService;
    private final EmailService emailService;
    private final StaffOtpChallengesRepository staffOtpChallengesRepository;

    @Value("${security.auth.max-failed-attempts:5}")
    private int maxFailedAttempts;

    @Value("${security.auth.lockout-duration-minutes:15}")
    private int lockoutDurationMinutes;

    @Value("${security.auth.refresh-token-validity-days:7}")
    private int refreshTokenValidityDays;

    private static final String DUMMY_HASH = "$2a$12$MpBOjLk9yUNq/JNmUSFSg.1SvrEtcDQGCt3puJz7Q2aSMoilMHr.m";
    private final int idleTimeoutMinutes = 30;

    private static final int OTP_EXPIRY_MINUTES = 5;
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final int MAX_OTP_RESENDS = 5;
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    // =========================================================
    // LOGIN (STEP 1: CREDENTIALS CHECK & OTP DISPATCH)
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

        // 4. Validate Email Configuration
        if (staff.getEmail() == null || staff.getEmail().isBlank()) {
            log.error("Staff user {} has no email registered for OTP authentication", staff.getUsername());
            throw new AuthException("No email address registered for staff account. Please contact administrator.");
        }

        // 5. Invalidate existing active login OTP challenges for this staff member
        List<OtpChallenge> activeOtps = staffOtpChallengesRepository.findByStaffAndSubjectTypeAndPurposeAndStatus(
                staff, OtpSubjectType.STAFF, OtpPurpose.LOGIN, OtpStatus.ACTIVE);
        for (OtpChallenge oldOtp : activeOtps) {
            oldOtp.setStatus(OtpStatus.EXPIRED);
            oldOtp.setUpdatedByType(UpdatedByType.STAFF);
            oldOtp.setUpdatedById(staff.getStaffId());
        }
        if (!activeOtps.isEmpty()) {
            staffOtpChallengesRepository.saveAll(activeOtps);
        }

        // 6. Generate 6-digit OTP and Challenge
        String rawOtp = String.valueOf(100000 + SECURE_RANDOM.nextInt(900000));
        String challengeGroupId = UUID.randomUUID().toString();
        LocalDateTime now = LocalDateTime.now();
        String maskedEmail = maskEmail(staff.getEmail());

        OtpChallenge challenge = OtpChallenge.builder()
                .subjectType(OtpSubjectType.STAFF)
                .staff(staff)
                .purpose(OtpPurpose.LOGIN)
                .otpHash(passwordEncoder.encode(rawOtp))
                .deliveryChannel(DeliveryChannel.EMAIL)
                .destinationMasked(maskedEmail)
                .attemptCount(0)
                .maxAttempts(MAX_OTP_ATTEMPTS)
                .expiresAt(now.plusMinutes(OTP_EXPIRY_MINUTES))
                .status(OtpStatus.ACTIVE)
                .challengeGroupId(challengeGroupId)
                .lastSentAt(now)
                .maxResendAttempts(MAX_OTP_RESENDS)
                .resendNo(0)
                .updatedByType(UpdatedByType.STAFF)
                .updatedById(staff.getStaffId())
                .build();

        staffOtpChallengesRepository.save(challenge);

        // 7. Dispatch OTP to staff email
        emailService.sendStaffLoginOtpEmail(staff.getEmail(), rawOtp, OTP_EXPIRY_MINUTES);

        log.info("OTP challenge issued for staff user: {}", staff.getUsername());

        return CoreLoginResponse.builder()
                .otpRequired(true)
                .challengeGroupId(challengeGroupId)
                .destinationMasked(maskedEmail)
                .username(staff.getUsername())
                .build();
    }

    // =========================================================
    // VERIFY LOGIN OTP (STEP 2: OTP VERIFICATION & TOKEN ISSUE)
    // =========================================================

    @Transactional(noRollbackFor = AuthException.class)
    public CoreLoginResponse verifyLoginOtp(CoreOtpVerifyRequest request) {
        if (request == null || request.getChallengeGroupId() == null || request.getChallengeGroupId().isBlank()
                || request.getOtp() == null || request.getOtp().isBlank()) {
            throw new AuthException("Challenge group ID and OTP code are required");
        }

        String challengeGroupId = request.getChallengeGroupId().trim();
        String enteredOtp = request.getOtp().trim();

        OtpChallenge otpChallenge = staffOtpChallengesRepository
                .findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                        challengeGroupId, OtpSubjectType.STAFF, OtpPurpose.LOGIN)
                .orElseThrow(() -> new AuthException("Invalid or expired OTP session. Please login again."));

        if (otpChallenge.getStatus() == OtpStatus.CONSUMED || otpChallenge.getConsumedAt() != null) {
            throw new AuthException("This OTP has already been used.");
        }

        LocalDateTime now = LocalDateTime.now();
        if (otpChallenge.getStatus() == OtpStatus.EXPIRED || otpChallenge.getExpiresAt().isBefore(now)) {
            otpChallenge.setStatus(OtpStatus.EXPIRED);
            otpChallenge.setUpdatedByType(UpdatedByType.STAFF);
            staffOtpChallengesRepository.save(otpChallenge);
            throw new AuthException("OTP code has expired. Please request a new OTP.");
        }

        if (otpChallenge.getAttemptCount() >= otpChallenge.getMaxAttempts()) {
            otpChallenge.setStatus(OtpStatus.EXPIRED);
            otpChallenge.setUpdatedByType(UpdatedByType.STAFF);
            staffOtpChallengesRepository.save(otpChallenge);
            throw new AuthException("Maximum OTP attempts exceeded. Please login again.");
        }

        StaffUsers staff = otpChallenge.getStaff();
        if (staff == null) {
            throw new AuthException("Associated staff account not found.");
        }

        if (staff.getStatus() != StaffUserStatus.ACTIVE) {
            throw new AuthException("Account is not active");
        }
        if (staff.getLockedUntil() != null && staff.getLockedUntil().isAfter(now)) {
            throw new AuthException("Account is temporarily locked due to too many failed attempts. Please try again later.");
        }

        // Validate OTP Match
        if (!passwordEncoder.matches(enteredOtp, otpChallenge.getOtpHash())) {
            otpChallenge.setAttemptCount(otpChallenge.getAttemptCount() + 1);
            if (otpChallenge.getAttemptCount() >= otpChallenge.getMaxAttempts()) {
                otpChallenge.setStatus(OtpStatus.EXPIRED);
            }
            otpChallenge.setUpdatedByType(UpdatedByType.STAFF);
            staffOtpChallengesRepository.save(otpChallenge);

            int remaining = otpChallenge.getMaxAttempts() - otpChallenge.getAttemptCount();
            if (remaining <= 0) {
                throw new AuthException("Maximum OTP verification attempts reached. Please login again.");
            } else {
                throw new AuthException("Invalid OTP code. " + remaining + " attempts remaining.");
            }
        }

        // OTP verified successfully -> Consume challenge
        otpChallenge.setStatus(OtpStatus.CONSUMED);
        otpChallenge.setConsumedAt(now);
        otpChallenge.setUpdatedByType(UpdatedByType.STAFF);
        otpChallenge.setUpdatedById(staff.getStaffId());
        staffOtpChallengesRepository.save(otpChallenge);

        // Reset failed login & Update last login
        staff.setFailedLoginCount(0);
        staff.setLockedUntil(null);
        staff.setLastLoginAt(now);
        staff.setUpdatedByType(UpdatedByType.STAFF);
        staff.setUpdatedById(staff.getStaffId());
        staff.setUpdatedAt(now);
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
                .issuedAt(now)
                .lastSeenAt(now)
                .refreshExpiresAt(now.plusDays(refreshTokenValidityDays))
                .idleTimeoutMinutes(idleTimeoutMinutes)
                .updatedAt(now)
                .build();

        authSessionsRepository.save(session);
        log.info("Successful login via OTP for staff user: {}", staff.getUsername());

        return CoreLoginResponse.builder()
                .otpRequired(false)
                .accessToken(accessToken)
                .refreshToken(plainRefreshToken)
                .username(staff.getUsername())
                .roles(roles)
                .permissions(permissions)
                .build();
    }

    // =========================================================
    // RESEND LOGIN OTP
    // =========================================================

    @Transactional(noRollbackFor = AuthException.class)
    public CoreOtpResendResponse resendLoginOtp(CoreOtpResendRequest request) {
        if (request == null || request.getChallengeGroupId() == null || request.getChallengeGroupId().isBlank()) {
            throw new AuthException("Challenge group ID is required");
        }

        String challengeGroupId = request.getChallengeGroupId().trim();
        OtpChallenge latestOtp = staffOtpChallengesRepository
                .findFirstByChallengeGroupIdAndSubjectTypeAndPurposeOrderByOtpIdDesc(
                        challengeGroupId, OtpSubjectType.STAFF, OtpPurpose.LOGIN)
                .orElseThrow(() -> new AuthException("Invalid OTP session. Please login again."));

        if (latestOtp.getStatus() == OtpStatus.CONSUMED || latestOtp.getConsumedAt() != null) {
            throw new AuthException("OTP session is already consumed. Please login again.");
        }

        if (latestOtp.getResendNo() >= latestOtp.getMaxResendAttempts()) {
            throw new AuthException("Maximum OTP resend attempts reached. Please login again.");
        }

        StaffUsers staff = latestOtp.getStaff();
        if (staff == null || staff.getStatus() != StaffUserStatus.ACTIVE) {
            throw new AuthException("Staff account is invalid or inactive.");
        }
        if (staff.getEmail() == null || staff.getEmail().isBlank()) {
            throw new AuthException("Staff has no registered email.");
        }

        // Expire previous challenge
        latestOtp.setStatus(OtpStatus.EXPIRED);
        latestOtp.setUpdatedByType(UpdatedByType.STAFF);
        latestOtp.setUpdatedById(staff.getStaffId());
        staffOtpChallengesRepository.save(latestOtp);

        // Generate new OTP
        String rawOtp = String.valueOf(100000 + SECURE_RANDOM.nextInt(900000));
        LocalDateTime now = LocalDateTime.now();
        int newResendNo = latestOtp.getResendNo() + 1;

        OtpChallenge replacement = OtpChallenge.builder()
                .subjectType(OtpSubjectType.STAFF)
                .staff(staff)
                .purpose(OtpPurpose.LOGIN)
                .otpHash(passwordEncoder.encode(rawOtp))
                .deliveryChannel(DeliveryChannel.EMAIL)
                .destinationMasked(latestOtp.getDestinationMasked())
                .attemptCount(0)
                .maxAttempts(latestOtp.getMaxAttempts())
                .expiresAt(now.plusMinutes(OTP_EXPIRY_MINUTES))
                .status(OtpStatus.ACTIVE)
                .challengeGroupId(challengeGroupId)
                .lastSentAt(now)
                .maxResendAttempts(latestOtp.getMaxResendAttempts())
                .resendNo(newResendNo)
                .updatedByType(UpdatedByType.STAFF)
                .updatedById(staff.getStaffId())
                .build();

        staffOtpChallengesRepository.save(replacement);

        // Send OTP email
        emailService.sendStaffLoginOtpEmail(staff.getEmail(), rawOtp, OTP_EXPIRY_MINUTES);

        log.info("Resent login OTP for staff user: {}, resendNo: {}", staff.getUsername(), newResendNo);

        return CoreOtpResendResponse.builder()
                .success(true)
                .message("A new OTP code has been sent to your email.")
                .challengeGroupId(challengeGroupId)
                .resendNo(newResendNo)
                .maxResendAttempts(latestOtp.getMaxResendAttempts())
                .build();
    }

    private void handleFailedLogin(StaffUsers staff) {
        staff.setFailedLoginCount(staff.getFailedLoginCount() + 1);
        if (staff.getFailedLoginCount() >= maxFailedAttempts) {
            staff.setLockedUntil(LocalDateTime.now().plusMinutes(lockoutDurationMinutes));
            log.warn("Account locked due to {} failed attempts: {}", maxFailedAttempts, staff.getUsername());
        }
        staff.setUpdatedByType(UpdatedByType.SYSTEM);
        staff.setUpdatedById(staff.getStaffId());
        staff.setUpdatedAt(LocalDateTime.now());
        staffUsersRepository.save(staff);
    }

    private String maskEmail(String email) {
        if (email == null || !email.contains("@")) {
            return "******";
        }
        String[] parts = email.split("@", 2);
        String masked = parts[0].length() <= 2
                ? "**@" + parts[1]
                : parts[0].substring(0, 2) + "****@" + parts[1];
        return masked.substring(0, Math.min(masked.length(), 100));
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
            log.error(
                    "SECURITY ALERT: Attempted to reuse a revoked refresh token for user: {}",
                    staff.getUsername()
            );

            int revokedCount =
                    sessionRevocationService.revokeAllActiveSessions(
                            staff.getStaffId()
                    );

            log.error(
                    "Security Alert: Revoked {} active sessions for user: {}",
                    revokedCount,
                    staff.getUsername()
            );

            throw new AuthException(
                    "Security Alert: Token compromised. All sessions revoked. Please login again."
            );
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
                .idleTimeoutMinutes(idleTimeoutMinutes)
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

        // 5. Validate and require refresh token
        if (request == null || request.getRefreshToken() == null || request.getRefreshToken().isBlank()) {
            throw new AuthException("Refresh token is required for logout");
        }

        String hashedToken = hashToken(request.getRefreshToken());

        AuthSession session = authSessionsRepository
                .findByRefreshTokenHash(hashedToken)
                .orElseThrow(() -> new AuthException("Invalid refresh token"));

        if (session.getStaff() == null || !staffId.equals(session.getStaff().getStaffId())) {
            throw new AuthException("Refresh token does not belong to this staff");
        }

        // 6. Revoke refresh session
        if (session.getRevokedAt() == null) {
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
                            .updatedByType(UpdatedByType.STAFF)
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
