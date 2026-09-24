package com.corebanking.config;

import com.corebanking.security.CusJwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;


@Configuration
@RequiredArgsConstructor
public class CusSecurityConfig {

    private final CusJwtAuthenticationFilter
            cusJwtAuthenticationFilter;


    // =========================================================
    // IMPORTANT
    // Servlet Container မှာ Customer JWT Filter
    // auto-register မဖြစ်အောင် disable လုပ်
    // =========================================================

    @Bean
    public FilterRegistrationBean<CusJwtAuthenticationFilter>
            cusJwtFilterRegistration(
                    CusJwtAuthenticationFilter filter) {

        FilterRegistrationBean<CusJwtAuthenticationFilter>
                registration =
                new FilterRegistrationBean<>(filter);

        // Servlet Filter အနေနဲ့ run မလုပ်စေ
        registration.setEnabled(false);

        return registration;
    }


    // =========================================================
    // CUSTOMER SECURITY CHAIN
    // =========================================================

    @Bean
    @Order(1)
    public SecurityFilterChain customerSecurityFilterChain(
            HttpSecurity http)
            throws Exception {

        http

            // Customer API ပဲ ဒီ chain ကိုသုံးမယ်
            .securityMatcher(
                    "/api/customer/**"
            )

            // REST API + JWT
            .csrf(
                    csrf ->
                            csrf.disable()
            )

            // Server HTTP Session မသုံး
            .sessionManagement(
                    session ->
                            session.sessionCreationPolicy(
                                    SessionCreationPolicy.STATELESS
                            )
            )

            // Authorization rules
            .authorizeHttpRequests(
                    auth -> auth

                        // Login
                        .requestMatchers(
                                "/api/customer/auth/login"
                        )
                        .permitAll()

                        // OTP Verify
                        .requestMatchers(
                                "/api/customer/auth/verify-otp"
                        )
                        .permitAll()

                        // OTP Resend
                        .requestMatchers(
                                "/api/customer/auth/resend-otp"
                        )
                        .permitAll()

                        // First-login password
                        .requestMatchers(
                                "/api/customer/auth/first-login/change-password"
                        )
                        .permitAll()

                        // First-login PIN
                        .requestMatchers(
                                "/api/customer/auth/first-login/setup-pin"
                        )
                        .permitAll()

                        // Refresh token
                        .requestMatchers(
                                "/api/customer/auth/refresh"
                        )
                        .permitAll()

                        // Test, logout, future customer APIs
                        // ROLE_CUSTOMER required
                        .anyRequest()
                        .hasRole("CUSTOMER")
            )

            // Customer JWT Filter ကို
            // Spring Security chain ထဲမှာပဲ run
            .addFilterBefore(
                    cusJwtAuthenticationFilter,
                    UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}