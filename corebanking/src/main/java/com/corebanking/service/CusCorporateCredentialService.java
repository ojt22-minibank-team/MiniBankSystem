package com.corebanking.service;

import com.corebanking.dto.CusSessionClientMetadata;
import com.corebanking.dto.CusCorporateLoginRequest;
import com.corebanking.entity.CorporateCredential;
import com.corebanking.entity.CorporateUser;
import com.corebanking.entity.Customers;
import com.corebanking.entity.LoginAttempt;
import com.corebanking.entity.enums.CorporateUserStatus;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.entity.enums.SessionSubjectType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.CusAccountLockedException;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusValidationException;
import com.corebanking.repository.CusCorporateCredentialRepository;
import com.corebanking.repository.CusCorporateUserRepository;
import com.corebanking.repository.CusLoginAttemptsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CusCorporateCredentialService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_MINUTES = 15;

    private final CusCorporateUserRepository corporateUserRepository;
    private final CusCorporateCredentialRepository corporateCredentialRepository;
    private final CusLoginAttemptsRepository loginAttemptsRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Validates the password only; OTP and authenticated session creation are
     * still required before login is complete. Call through the Spring proxy.
     */
    @Transactional(
            propagation = Propagation.REQUIRES_NEW,
            noRollbackFor = {
                    CusAuthenticationException.class,
                    CusAccountLockedException.class
            }
    )
    public UUID authenticateCredentials(CusCorporateLoginRequest request) {
        return authenticateCredentials(request, CusSessionClientMetadata.EMPTY);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW, noRollbackFor = {CusAuthenticationException.class, CusAccountLockedException.class})
    public UUID authenticateCredentials(CusCorporateLoginRequest request, CusSessionClientMetadata metadata) {
        if (request == null
                || request.getCompanyCustomerCode() == null
                || request.getCompanyCustomerCode().isBlank()
                || request.getCorporateUserCode() == null
                || request.getCorporateUserCode().isBlank()
                || request.getPassword() == null
                || request.getPassword().isBlank()) {
            throw new CusValidationException("Company ID, Corporate User ID and password are required.");
        }

        String companyCode = request.getCompanyCustomerCode().trim();
        String userCode = request.getCorporateUserCode().trim();
        String identifier = loginIdentifier(companyCode, userCode);
        CorporateUser user = corporateUserRepository.findForLogin(companyCode, userCode)
                .orElseThrow(() -> {
                    saveFailedAttempt(identifier, null, "INVALID_IDENTIFIER", metadata);
                    return new CusAuthenticationException("Invalid login credentials.");
                });

        Customers company = user.getCompanyInfo() == null
                ? null : user.getCompanyInfo().getCustomer();
        if (user.getStatus() != CorporateUserStatus.ACTIVE
                || company == null
                || company.getCustomerType() != CustomerType.COMPANY
                || company.getStatus() != CustomerStatus.ACTIVE) {
            saveFailedAttempt(identifier, user, "ACCOUNT_INACTIVE", metadata);
            throw new CusAuthenticationException("Invalid login credentials.");
        }

        CorporateCredential credentials = corporateCredentialRepository
                .findByCorporateUserIdForUpdate(user.getCorporateUserId())
                .orElseThrow(() -> {
                    saveFailedAttempt(identifier, user, "INVALID_CREDENTIALS", metadata);
                    return new CusAuthenticationException("Invalid login credentials.");
                });

        LocalDateTime now = LocalDateTime.now();
        checkLoginLock(credentials, identifier, user, now, metadata);

        if (!passwordEncoder.matches(request.getPassword(), credentials.getPasswordHash())) {
            int failedCount = credentials.getFailedLoginCount() + 1;
            credentials.setFailedLoginCount(failedCount);
            boolean locked = failedCount >= MAX_FAILED_ATTEMPTS;
            if (locked) {
                credentials.setLockedUntil(LocalDateTime.now().plusMinutes(LOCK_MINUTES));
            }
            saveCredentials(credentials, user);
            saveFailedAttempt(identifier, user, locked ? "ACCOUNT_LOCKED" : "INVALID_PASSWORD", metadata);
            if (locked) {
                throw new CusAccountLockedException("Account is temporarily locked for 15 minutes.");
            }
            throw new CusAuthenticationException("Invalid login credentials.");
        }

        credentials.setFailedLoginCount(0);
        credentials.setLockedUntil(null);
        saveCredentials(credentials, user);
        return user.getCorporateUserId();
    }

    private void checkLoginLock(CorporateCredential credentials, String identifier,
                                CorporateUser user, LocalDateTime now) {
        checkLoginLock(credentials, identifier, user, now, CusSessionClientMetadata.EMPTY);
    }

    private void checkLoginLock(CorporateCredential credentials, String identifier,
                                CorporateUser user, LocalDateTime now, CusSessionClientMetadata metadata) {
        if (credentials.getLockedUntil() == null) {
            return;
        }
        if (credentials.getLockedUntil().isAfter(now)) {
            saveFailedAttempt(identifier, user, "ACCOUNT_LOCKED", metadata);
            throw new CusAccountLockedException("Account is temporarily locked. Please try again later.");
        }
        credentials.setFailedLoginCount(0);
        credentials.setLockedUntil(null);
        saveCredentials(credentials, user);
    }

    private void saveCredentials(CorporateCredential credentials, CorporateUser user) {
        credentials.setUpdatedByType(UpdatedByType.CORPORATE_USER);
        credentials.setUpdatedById(user.getCorporateUserId());
        corporateCredentialRepository.save(credentials);
    }

    private void saveFailedAttempt(String identifier, CorporateUser user, String reason) {
        saveFailedAttempt(identifier, user, reason, CusSessionClientMetadata.EMPTY);
    }

    private void saveFailedAttempt(String identifier, CorporateUser user, String reason, CusSessionClientMetadata metadata) {
        loginAttemptsRepository.save(LoginAttempt.builder()
                .ipAddress(metadata == null ? null : metadata.ipAddress())
                .userAgent(metadata == null ? null : metadata.userAgent())
                .actorType(SessionSubjectType.CORPORATE_USER)
                .corporateUser(user)
                .loginIdentifier(identifier)
                .success(false)
                .failureReason(reason)
                .updatedByType(user == null ? UpdatedByType.SYSTEM : UpdatedByType.CORPORATE_USER)
                .updatedById(user == null ? null : user.getCorporateUserId())
                .build());
    }

    private String loginIdentifier(String companyCode, String userCode) {
        String identifier = companyCode.length() + ":" + companyCode + ":" + userCode;
        return identifier.substring(0, Math.min(identifier.length(), 191));
    }
}
