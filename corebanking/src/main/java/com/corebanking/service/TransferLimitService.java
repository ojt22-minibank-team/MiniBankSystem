package com.corebanking.service;

import com.corebanking.dto.BankTransferLimitRule;
import com.corebanking.dto.TransferLimitInfoResponseDto;
import com.corebanking.dto.UpdateTransferLimitRequestDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.SystemParameters;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.AccountType;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.exception.TransactionException;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.BankTransactionRepository;
import com.corebanking.repository.BeneficiaryRepository;
import com.corebanking.repository.CustomerCredentialsRepository;
import com.corebanking.repository.SystemParametersRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransferLimitService {

    private final AccountRepository accountRepository;
    private final CustomerCredentialsRepository customerCredentialsRepository;
    private final SystemParametersRepository systemParametersRepository;
    private final BeneficiaryRepository beneficiaryRepository;
    private final BankTransactionRepository bankTransactionRepository;
    private final PasswordEncoder passwordEncoder;

    // =========================================================================
    // 1. BANK MAXIMUM LIMITS (HIERARCHY BY ACCOUNT CATEGORY & TYPE)
    // =========================================================================

    // Retail Savings Account Limits
    // Parameter keys in system_parameters table
    public static final String KEY_SAVING_ONETIME = "ONE_TIME_LIMIT_FOR_SAVING_ACCOUNT";
    public static final String KEY_CURRENT_ONETIME = "ONE_TIME_LIMIT_FOR_CURRENT_ACCOUNT";
    public static final String KEY_SAVED_BENEFICIARY_ONETIME = "ONE_TIME_LIMIT_FOR_SAVE_ACCOUNT";
    public static final String KEY_UNSAVED_STRANGER_ONETIME = "ONE_TIME_LIMIT_FOR_UNSAVE_ACCOUNT";
    public static final String KEY_UNSAVED_STRANGER_ONETIME_ALT = "ONE_TIME_LIMIT_FOR_UN_SAVE_ACCOUNT";
    public static final String KEY_DAILY_LIMIT = "DAILY_TRANSFER_LIMIT";
    public static final String KEY_MINIMUM_BALANCE = "MINIMUM_BALANCE";

    // Retail Limits (Fallback Defaults)
    public static final BigDecimal DEFAULT_SAVINGS_ONETIME = new BigDecimal("2000000.00");
    public static final BigDecimal DEFAULT_CURRENT_ONETIME = new BigDecimal("3000000.00");
    public static final BigDecimal DEFAULT_SAVED_BENEFICIARY_ONETIME = new BigDecimal("3000000.00");
    public static final BigDecimal DEFAULT_UNSAVED_STRANGER_ONETIME = new BigDecimal("1000000.00");
    public static final BigDecimal DEFAULT_DAILY_LIMIT = new BigDecimal("10000000.00");
    public static final BigDecimal DEFAULT_MINIMUM_BALANCE = new BigDecimal("10000.00");

    // Corporate / Company Account Limits
    public static final BigDecimal CORPORATE_MAX_ONETIME = new BigDecimal("50000000.00");
    public static final BigDecimal CORPORATE_STRANGER_ONETIME = new BigDecimal("10000000.00");
    public static final BigDecimal CORPORATE_MAX_DAILY = new BigDecimal("200000000.00");

    /**
     * Resolves Bank Maximum Limit Rules for a given account category and type.
     */
    /**
     * Reads a numeric parameter from SystemParameters with a fallback default.
     */
    private BigDecimal getSystemParameter(String key, BigDecimal defaultValue) {
        return systemParametersRepository.findByParameterKeyIgnoreCase(key)
                .map(param -> {
                    try {
                        String val = param.getParameterValue().trim();
                        return new BigDecimal(val);
                    } catch (Exception e) {
                        log.warn("Invalid system parameter value for key {}: {}. Falling back to default: {}", key, param.getParameterValue(), defaultValue);
                        return defaultValue;
                    }
                })
                .orElse(defaultValue);
    }

    /**
     * Resolves the unsaved stranger one-time limit checking both KEY_UNSAVED_STRANGER_ONETIME and KEY_UNSAVED_STRANGER_ONETIME_ALT.
     */
    private BigDecimal getUnsavedStrangerLimit(BigDecimal defaultValue) {
        BigDecimal val = getSystemParameter(KEY_UNSAVED_STRANGER_ONETIME, null);
        if (val != null) return val;
        return getSystemParameter(KEY_UNSAVED_STRANGER_ONETIME_ALT, defaultValue);
    }

    public BankTransferLimitRule getBankLimits(AccountCategory category, AccountType type) {
        if (category == AccountCategory.CORPORATE) {
            BigDecimal maxOneTime = getSystemParameter("ONE_TIME_LIMIT_FOR_CORPORATE_ACCOUNT", CORPORATE_MAX_ONETIME);
            BigDecimal strangerOneTime = getSystemParameter("ONE_TIME_STRANGER_LIMIT_FOR_CORPORATE_ACCOUNT", CORPORATE_STRANGER_ONETIME);
            BigDecimal maxDaily = getSystemParameter("DAILY_TRANSFER_LIMIT_FOR_CORPORATE_ACCOUNT", CORPORATE_MAX_DAILY);

            return BankTransferLimitRule.builder()
                    .maxOneTimeLimit(maxOneTime)
                    .strangerOneTimeLimit(strangerOneTime.min(maxOneTime))
                    .maxDailyLimit(maxDaily)
                    .build();
        }

        BigDecimal dailyLimit = getSystemParameter(KEY_DAILY_LIMIT, DEFAULT_DAILY_LIMIT);
        BigDecimal savedBeneficiaryLimit = getSystemParameter(KEY_SAVED_BENEFICIARY_ONETIME, DEFAULT_SAVED_BENEFICIARY_ONETIME);
        BigDecimal unsavedStrangerLimit = getUnsavedStrangerLimit(DEFAULT_UNSAVED_STRANGER_ONETIME);

        BigDecimal accountTypeLimit;
        if (type == AccountType.CURRENT) {
            accountTypeLimit = getSystemParameter(KEY_CURRENT_ONETIME, DEFAULT_CURRENT_ONETIME);
        } else {
            accountTypeLimit = getSystemParameter(KEY_SAVING_ONETIME, DEFAULT_SAVINGS_ONETIME);
        }

        // Enforce least-privilege minimum: min(AccountTypeLimit, BeneficiaryLimit / StrangerLimit)
        BigDecimal effectiveBeneficiaryLimit = accountTypeLimit.min(savedBeneficiaryLimit);
        BigDecimal effectiveStrangerLimit = accountTypeLimit.min(unsavedStrangerLimit);

        return BankTransferLimitRule.builder()
                .maxOneTimeLimit(effectiveBeneficiaryLimit)
                .strangerOneTimeLimit(effectiveStrangerLimit)
                .maxDailyLimit(dailyLimit)
                .build();
    }

    /**
     * Retrieves the bank-wide minimum balance configured in system_parameters (default: 10,000 MMK).
     */
    public BigDecimal getMinimumBalance() {
        return getSystemParameter(KEY_MINIMUM_BALANCE, DEFAULT_MINIMUM_BALANCE);
    }

    /**
     * Resolves the required minimum balance for an account dynamically from DB system_parameters.
     * If the account entity has an explicit minimumBalance > 0, the maximum of account-level and system-level is enforced.
     */
    public BigDecimal getEffectiveMinimumBalance(Accounts account) {
        BigDecimal systemMinBalance = getMinimumBalance();
        if (account != null && account.getMinimumBalance() != null && account.getMinimumBalance().compareTo(BigDecimal.ZERO) > 0) {
            return account.getMinimumBalance().max(systemMinBalance);
        }
        return systemMinBalance;
    }



    /**
     * Parameter key for storing user custom one-time limit without schema modification.
     */
    private String getCustomOneTimeKey(String accountNumber) {
        return "LIMIT_ONETIME_" + accountNumber.trim();
    }

    /**
     * Reads user-configured custom one-time limit from SystemParameters.
     */
    public BigDecimal getUserCustomOneTimeLimit(String accountNumber) {
        return systemParametersRepository.findByParameterKeyIgnoreCase(getCustomOneTimeKey(accountNumber))
                .map(param -> {
                    try {
                        return new BigDecimal(param.getParameterValue().trim());
                    } catch (Exception e) {
                        return null;
                    }
                })
                .orElse(null);
    }

    /**
     * Calculates the effective one-time limit: min(Bank Limit, User Custom Limit).
     */
    public BigDecimal getEffectiveOneTimeLimit(Accounts account, boolean isBeneficiary) {
        BankTransferLimitRule rule = getBankLimits(account.getAccountCategory(), account.getAccountType());
        BigDecimal baseBankLimit = isBeneficiary ? rule.getMaxOneTimeLimit() : rule.getStrangerOneTimeLimit();

        BigDecimal customOneTime = getUserCustomOneTimeLimit(account.getAccountNumber());
        if (customOneTime != null && customOneTime.compareTo(BigDecimal.ZERO) > 0) {
            return customOneTime.min(baseBankLimit);
        }

        return baseBankLimit;
    }

    /**
     * Calculates the effective cumulative daily limit: min(Bank Max Daily, User Daily Limit).
     */
    public BigDecimal getEffectiveDailyLimit(Accounts account) {
        BankTransferLimitRule rule = getBankLimits(account.getAccountCategory(), account.getAccountType());

        if (account.getDailyTransferLimit() != null && account.getDailyTransferLimit().compareTo(BigDecimal.ZERO) > 0) {
            return account.getDailyTransferLimit().min(rule.getMaxDailyLimit());
        }

        return rule.getMaxDailyLimit();
    }

    // =========================================================================
    // 2. TRANSFER VALIDATION (ONE-TIME & DAILY TWO-TIER VALIDATION)
    // =========================================================================

    /**
     * Validates both One-Time Limit (Beneficiary vs Stranger) and Cumulative Daily Limit.
     */
    @Transactional(readOnly = true)
    public void validateTransferLimits(Accounts sourceAccount, Accounts destAccount, BigDecimal transferAmount) {
        if (transferAmount == null || transferAmount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new TransactionException("Transfer amount must be greater than zero.");
        }

        String currency = sourceAccount.getCurrency() != null ? sourceAccount.getCurrency() : "MMK";

        // Step 1: Beneficiary Relationship Check
        boolean isBeneficiary = beneficiaryRepository.findByOwnerAccountAndBeneficiaryAccount(sourceAccount, destAccount).isPresent();

        // Step 2: One-Time Limit Validation
        BigDecimal effectiveOneTimeLimit = getEffectiveOneTimeLimit(sourceAccount, isBeneficiary);
        BankTransferLimitRule rule = getBankLimits(sourceAccount.getAccountCategory(), sourceAccount.getAccountType());

        if (transferAmount.compareTo(effectiveOneTimeLimit) > 0) {
            if (!isBeneficiary) {
                throw new TransactionException(String.format(
                        "Transfer amount of %,.2f %s exceeds the stranger one-time limit of %,.2f %s. " +
                        "To transfer up to %,.2f %s, please add account %s to your beneficiaries list.",
                        transferAmount, currency, effectiveOneTimeLimit, currency,
                        rule.getMaxOneTimeLimit(), currency, destAccount.getAccountNumber()
                ));
            } else {
                String accType = sourceAccount.getAccountType() != null ? sourceAccount.getAccountType().name() : "account";
                throw new TransactionException(String.format(
                        "Transfer amount of %,.2f %s exceeds your one-time transfer limit of %,.2f %s for %s account.",
                        transferAmount, currency, effectiveOneTimeLimit, currency, accType
                ));
            }
        }

        // Step 3: Cumulative Daily Transfer Limit Validation
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        BigDecimal todayTransferred = bankTransactionRepository.findTodayTotalTransferredAmount(
                sourceAccount.getAccountId(), startOfDay, endOfDay);
        if (todayTransferred == null) {
            todayTransferred = BigDecimal.ZERO;
        }

        BigDecimal effectiveDailyLimit = getEffectiveDailyLimit(sourceAccount);
        BigDecimal newTotalDaily = todayTransferred.add(transferAmount);

        if (newTotalDaily.compareTo(effectiveDailyLimit) > 0) {
            BigDecimal remainingLimit = effectiveDailyLimit.subtract(todayTransferred).max(BigDecimal.ZERO);
            throw new TransactionException(String.format(
                    "Transfer exceeds daily limit of %,.2f %s. Transferred today: %,.2f %s. Remaining limit for today: %,.2f %s.",
                    effectiveDailyLimit, currency, todayTransferred, currency, remainingLimit, currency
            ));
        }

        log.info("Transfer limit validation passed. Source: {}, Amount: {}, Beneficiary: {}, TodayTotal: {}/{}",
                sourceAccount.getAccountNumber(), transferAmount, isBeneficiary, newTotalDaily, effectiveDailyLimit);
    }

    // =========================================================================
    // 3. TRANSFER LIMIT INQUIRY (INFO DTO)
    // =========================================================================

    /**
     * Inquires transfer limit details for a given customer account.
     */
    @Transactional(readOnly = true)
    public TransferLimitInfoResponseDto getTransferLimitInfo(String authenticatedCustomerId, String accountNumber) {
        Accounts account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + accountNumber));

        if (!account.getCustomer().getCustomerId().toString().equalsIgnoreCase(authenticatedCustomerId)) {
            throw new TransactionException("Authenticated user does not own this account.");
        }

        BankTransferLimitRule rule = getBankLimits(account.getAccountCategory(), account.getAccountType());
        BigDecimal customOneTime = getUserCustomOneTimeLimit(account.getAccountNumber());
        BigDecimal customDaily = account.getDailyTransferLimit();

        BigDecimal effectiveOneTimeBeneficiary = getEffectiveOneTimeLimit(account, true);
        BigDecimal effectiveOneTimeStranger = getEffectiveOneTimeLimit(account, false);
        BigDecimal effectiveDaily = getEffectiveDailyLimit(account);

        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);
        BigDecimal todayTransferred = bankTransactionRepository.findTodayTotalTransferredAmount(
                account.getAccountId(), startOfDay, endOfDay);
        if (todayTransferred == null) {
            todayTransferred = BigDecimal.ZERO;
        }

        BigDecimal remainingDaily = effectiveDaily.subtract(todayTransferred).max(BigDecimal.ZERO);

        return TransferLimitInfoResponseDto.builder()
                .accountNumber(account.getAccountNumber())
                .accountType(account.getAccountType() != null ? account.getAccountType().name() : null)
                .accountCategory(account.getAccountCategory() != null ? account.getAccountCategory().name() : null)
                .currency(account.getCurrency())
                .bankMaxOneTimeLimit(rule.getMaxOneTimeLimit())
                .bankStrangerOneTimeLimit(rule.getStrangerOneTimeLimit())
                .bankMaxDailyLimit(rule.getMaxDailyLimit())
                .userCustomOneTimeLimit(customOneTime)
                .userCustomDailyLimit(customDaily)
                .effectiveOneTimeLimitBeneficiary(effectiveOneTimeBeneficiary)
                .effectiveOneTimeLimitStranger(effectiveOneTimeStranger)
                .effectiveDailyLimit(effectiveDaily)
                .todayTransferredAmount(todayTransferred)
                .remainingDailyLimit(remainingDaily)
                .minimumBalance(getEffectiveMinimumBalance(account))
                .build();
    }

    // =========================================================================
    // 4. CUSTOM LIMIT UPDATE (WITH TRANSACTION PIN VERIFICATION)
    // =========================================================================

    /**
     * Updates user custom limits after verifying Transaction PIN and boundary validations.
     */
    @Transactional
    public TransferLimitInfoResponseDto updateCustomLimits(String authenticatedCustomerId, String accountNumber, UpdateTransferLimitRequestDto request) {
        Accounts account = accountRepository.findByAccountNumber(accountNumber)
                .orElseThrow(() -> new AccountNotFoundException("Account not found: " + accountNumber));

        // Ownership Verification
        if (!account.getCustomer().getCustomerId().toString().equalsIgnoreCase(authenticatedCustomerId)) {
            throw new TransactionException("Authenticated user does not own this account.");
        }

        // Account Status Verification
        if (account.getStatus() != AccountStatus.ACTIVE) {
            throw new TransactionException("Account is not active. Status: " + account.getStatus());
        }

        // 1. Transaction PIN Verification
        UUID customerUuid = UUID.fromString(authenticatedCustomerId);
        CustomerCredentials credentials = customerCredentialsRepository.findByCustomerId(customerUuid)
                .orElseThrow(() -> new TransactionException("Customer credentials record not found."));

        if (credentials.getTransactionPinHash() == null || credentials.getTransactionPinHash().isBlank()) {
            throw new TransactionException("Transaction PIN has not been set up. Please set up your PIN first in security settings.");
        }

        // PIN Lock Check
        if (credentials.getPinLockedUntil() != null && credentials.getPinLockedUntil().isAfter(LocalDateTime.now())) {
            throw new TransactionException("Transaction PIN is temporarily locked due to multiple failed attempts. Please try again later.");
        }

        if (!passwordEncoder.matches(request.getTransactionPin(), credentials.getTransactionPinHash())) {
            int failed = credentials.getFailedPinAttemptCount() + 1;
            credentials.setFailedPinAttemptCount(failed);
            if (failed >= 5) {
                credentials.setPinLockedUntil(LocalDateTime.now().plusMinutes(15));
            }
            customerCredentialsRepository.save(credentials);
            throw new TransactionException(String.format("Invalid transaction PIN. %d attempt(s) remaining.", Math.max(0, 5 - failed)));
        }

        // Reset failed PIN counter on success
        if (credentials.getFailedPinAttemptCount() > 0) {
            credentials.setFailedPinAttemptCount(0);
            credentials.setPinLockedUntil(null);
            customerCredentialsRepository.save(credentials);
        }

        // 2. Business Boundary Validations
        BankTransferLimitRule rule = getBankLimits(account.getAccountCategory(), account.getAccountType());

        // Validate Custom One-Time Limit
        if (request.getCustomOneTimeLimit() != null) {
            if (request.getCustomOneTimeLimit().compareTo(BigDecimal.ZERO) <= 0) {
                throw new TransactionException("Custom one-time limit must be greater than zero.");
            }
            if (request.getCustomOneTimeLimit().compareTo(rule.getMaxOneTimeLimit()) > 0) {
                throw new TransactionException(String.format(
                        "Custom one-time limit cannot exceed Bank Maximum Limit of %,.2f %s for %s accounts.",
                        rule.getMaxOneTimeLimit(), account.getCurrency(), account.getAccountType()));
            }
        }

        // Validate Custom Daily Limit
        if (request.getCustomDailyLimit() != null) {
            if (request.getCustomDailyLimit().compareTo(BigDecimal.ZERO) <= 0) {
                throw new TransactionException("Custom daily limit must be greater than zero.");
            }
            if (request.getCustomDailyLimit().compareTo(rule.getMaxDailyLimit()) > 0) {
                throw new TransactionException(String.format(
                        "Custom daily limit cannot exceed Bank Maximum Daily Limit of %,.2f %s for %s accounts.",
                        rule.getMaxDailyLimit(), account.getCurrency(), account.getAccountType()));
            }
        }

        // Validate Relationship: One-Time Limit <= Daily Limit
        BigDecimal effectiveTargetDaily = request.getCustomDailyLimit() != null
                ? request.getCustomDailyLimit()
                : (account.getDailyTransferLimit() != null ? account.getDailyTransferLimit() : rule.getMaxDailyLimit());

        BigDecimal effectiveTargetOneTime = request.getCustomOneTimeLimit() != null
                ? request.getCustomOneTimeLimit()
                : getUserCustomOneTimeLimit(accountNumber);

        if (effectiveTargetOneTime != null && effectiveTargetOneTime.compareTo(effectiveTargetDaily) > 0) {
            throw new TransactionException("One-time transfer limit cannot be greater than the daily transfer limit.");
        }

        // 3. Persist Changes
        // A. Daily Limit in Accounts entity
        if (request.getCustomDailyLimit() != null) {
            account.setDailyTransferLimit(request.getCustomDailyLimit());
            accountRepository.save(account);
        }

        // B. One-Time Limit in SystemParameters
        if (request.getCustomOneTimeLimit() != null) {
            String paramKey = getCustomOneTimeKey(accountNumber);
            SystemParameters param = systemParametersRepository.findByParameterKeyIgnoreCase(paramKey)
                    .orElseGet(() -> SystemParameters.builder()
                            .parameterKey(paramKey)
                            .description("Custom one-time transfer limit for account " + accountNumber)
                            .build());

            param.setParameterValue(request.getCustomOneTimeLimit().toPlainString());
            param.setUpdatedByType(UpdatedByType.CUSTOMER);
            param.setUpdatedById(account.getCustomer().getCustomerId());
            param.setUpdatedAt(LocalDateTime.now());
            systemParametersRepository.save(param);
        }

        log.info("Successfully updated custom transfer limits for Account: {}. OneTime: {}, Daily: {}",
                accountNumber, request.getCustomOneTimeLimit(), request.getCustomDailyLimit());

        return getTransferLimitInfo(authenticatedCustomerId, accountNumber);
    }
}
