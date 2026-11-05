
package com.corebanking.service;

import com.corebanking.dto.StaffPasswordSetupRequest;
import com.corebanking.entity.AuthSession;
import com.corebanking.entity.StaffPasswordSetupToken;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.repository.AuthSessionsRepository;
import com.corebanking.repository.StaffPasswordSetupTokenRepository;
import com.corebanking.repository.StaffUsersRepository;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.validation.annotation.Validated;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Service
@Validated
@RequiredArgsConstructor
public class StaffPasswordSetupService {

    private final StaffUsersRepository staffUsersRepository;
    private final StaffPasswordSetupTokenRepository setupTokenRepository;
    private final AuthSessionsRepository authSessionsRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.security.password-setup.expiration-minutes:30}")
    private int expirationMinutes;

    @Value("${app.frontend.base-url}")
    private String frontendBaseUrl;

    /**
     * Creates a single-use setup link and sends it to the staff email.
     */
    @Transactional
    public void createSetupLink(UUID staffId) {

        StaffUsers staff = staffUsersRepository.findById(staffId)
                .orElseThrow(() ->
                        new IllegalArgumentException("Staff account not found"));

        if (staff.getStatus() != StaffUserStatus.ACTIVE) {
            throw new IllegalStateException(
                    "Cannot create a setup link for an inactive staff account");
        }

        if (staff.getEmail() == null || staff.getEmail().isBlank()) {
            throw new IllegalStateException(
                    "Staff email is required for password setup");
        }

        LocalDateTime now = LocalDateTime.now();

        // Revoke previously issued, unused links.
        setupTokenRepository.revokeUnusedTokensByStaffId(staffId, now);

        // Generate a cryptographically random token.
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);

        String rawToken = Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(randomBytes);

        String tokenHash = sha256(rawToken);

        StaffPasswordSetupToken setupToken =
                new StaffPasswordSetupToken();

        setupToken.setStaff(staff);
        setupToken.setTokenHash(tokenHash);
        setupToken.setExpiresAt(now.plusMinutes(expirationMinutes));

        setupTokenRepository.saveAndFlush(setupToken);

        String baseUrl = frontendBaseUrl.replaceAll("/+$", "");
        String setupLink = baseUrl
                + "/set-password?token="
                + rawToken;

        // Send the raw token only to the intended staff email.
        // The database stores only the hash.
        emailService.sendPasswordSetupEmail(
                staff.getEmail(),
                setupLink,
                expirationMinutes
        );
    }

    /**
     * Validates the single-use token and sets the staff password.
     */
    @Transactional
    public void completePasswordSetup(
            @Valid StaffPasswordSetupRequest request) {

        if (!request.getNewPassword()
                .equals(request.getConfirmPassword())) {
            throw new IllegalArgumentException(
                    "Password and confirm password do not match");
        }

        String tokenHash = sha256(request.getToken());

        StaffPasswordSetupToken setupToken =
                setupTokenRepository.findByTokenHashForUpdate(tokenHash)
                        .orElseThrow(() ->
                                new IllegalArgumentException(
                                        "Invalid or expired setup link"));

        LocalDateTime now = LocalDateTime.now();

        if (setupToken.getUsedAt() != null
                || setupToken.getRevokedAt() != null
                || !setupToken.getExpiresAt().isAfter(now)) {
            throw new IllegalArgumentException(
                    "Invalid or expired setup link");
        }

        StaffUsers staff = staffUsersRepository.findById(
                setupToken.getStaff().getStaffId()
        ).orElseThrow(() ->
                new IllegalArgumentException("Staff account not found"));

        if (staff.getStatus() != StaffUserStatus.ACTIVE) {
            throw new IllegalStateException(
                    "This staff account is not active");
        }

        staff.setPasswordHash(
                passwordEncoder.encode(request.getNewPassword())
        );

        staff.setPasswordChangedAt(now);
        staff.setMustChangePassword(false);
        staff.setFailedLoginCount(0);
        staff.setLockedUntil(null);

        // Invalidate existing access tokens that use token_version.
        staff.setTokenVersion(staff.getTokenVersion() + 1);

        staffUsersRepository.save(staff);

        // Mark the link as consumed. A second use must fail.
        setupToken.setUsedAt(now);
        setupTokenRepository.save(setupToken);

        // Revoke existing refresh sessions for this staff member.
        authSessionsRepository.revokeAllActiveSessionsByStaffId(
                staff.getStaffId()
        );
    }

    private String sha256(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");

            byte[] hash = digest.digest(
                    value.getBytes(StandardCharsets.UTF_8)
            );

            return HexFormat.of().formatHex(hash);

        } catch (Exception ex) {
            throw new IllegalStateException(
                    "Unable to hash setup token", ex);
        }
    }
}