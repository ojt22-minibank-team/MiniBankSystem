package com.corebanking.service;

import com.corebanking.dto.LoginRequest;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CustomerCredentials;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.CustomerStatus;
import com.corebanking.repository.AccountsRepository;
import com.corebanking.repository.CustomerCredentialsRepository;
import com.corebanking.repository.CustomerRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final CustomerRepository customerRepository;
    private final AccountsRepository accountsRepository;
    private final CustomerCredentialsRepository credentialsRepository;
    private final PasswordEncoder passwordEncoder;

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final int LOCK_MINUTES = 15;


    public Customers authenticateCredentials(LoginRequest request) {

        String identifier = request.getLoginIdentifier();

        // 1. Customer ID OR Account Number ဖြင့် customer ရှာ
        Customers customer = findCustomer(identifier);

        // 2. Customer status စစ်
        validateCustomerStatus(customer);

        // 3. Customer credentials ရှာ
        CustomerCredentials credentials =
                credentialsRepository
                        .findById(customer.getCustomerId())
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Invalid login credentials."
                                )
                        );

        // 4. Login account locked ဖြစ်/မဖြစ် စစ်
        checkLoginLock(credentials);

        // 5. Password စစ်
        boolean passwordMatches =
                passwordEncoder.matches(
                        request.getPassword(),
                        credentials.getPasswordHash()
                );

        if (!passwordMatches) {

            handleFailedPassword(credentials);

            throw new RuntimeException(
                    "Invalid login credentials."
            );
        }

        // 6. Password မှန်ပြီဆို failed attempts reset
        credentials.setFailedLoginCount(0);
        credentials.setLockedUntil(null);

        credentialsRepository.save(credentials);

        // ဒီအဆင့်မှာ login complete မဖြစ်သေးဘူး
        // နောက် step မှာ Email OTP ပို့မယ်
        return customer;
    }


    private Customers findCustomer(String identifier) {

        // Customer ID (customer_code) နဲ့အရင်ရှာ
        return customerRepository
                .findByCustomerCode(identifier)

                // Customer ID နဲ့မတွေ့ရင် Account Number နဲ့ရှာ
                .orElseGet(() ->
                        accountsRepository
                                .findByAccountNumber(identifier)
                                .map(Accounts::getCustomer)
                                .orElseThrow(() ->
                                        new RuntimeException(
                                                "Invalid login credentials."
                                        )
                                )
                );
    }


    private void validateCustomerStatus(Customers customer) {

        if (customer.getStatus() != CustomerStatus.ACTIVE) {

            throw new RuntimeException(
                    "Customer account is not active."
            );
        }
    }


    private void checkLoginLock(
            CustomerCredentials credentials) {

        LocalDateTime now = LocalDateTime.now();

        // locked_until မှာ value မရှိဘူးဆို lock မဖြစ်ဘူး
        if (credentials.getLockedUntil() == null) {
            return;
        }

        // Lock time မကုန်သေးရင် login မပေးဘူး
        if (credentials.getLockedUntil().isAfter(now)) {

            throw new RuntimeException(
                    "Account is temporarily locked. Please try again later."
            );
        }

        // Lock 15 minutes ပြည့်သွားပြီ
        // failed count နဲ့ lock time reset
        credentials.setFailedLoginCount(0);
        credentials.setLockedUntil(null);

        credentialsRepository.save(credentials);
    }


    private void handleFailedPassword(
            CustomerCredentials credentials) {

        // Current failed count ကို 1 တိုး
        int failedCount =
                credentials.getFailedLoginCount() + 1;

        credentials.setFailedLoginCount(failedCount);

        // Password 5 ကြိမ်ဆက်တိုက်မှားပြီဆို
        if (failedCount >= MAX_FAILED_ATTEMPTS) {

            credentials.setLockedUntil(
                    LocalDateTime.now()
                            .plusMinutes(LOCK_MINUTES)
            );
        }

        credentialsRepository.save(credentials);
    }
}