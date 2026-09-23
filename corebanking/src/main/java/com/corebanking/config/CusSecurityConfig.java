package com.corebanking.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

import com.corebanking.security.CusJwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;

@Configuration
@RequiredArgsConstructor
public class CusSecurityConfig {

    private final CusJwtAuthenticationFilter cusJwtAuthenticationFilter;

    @Bean
    @Order(1)
    public SecurityFilterChain customerSecurityFilterChain(
            HttpSecurity http) throws Exception {

        http
            .securityMatcher("/api/customer/**")

            .csrf(csrf -> csrf.disable())

            .sessionManagement(session ->
                    session.sessionCreationPolicy(
                            SessionCreationPolicy.STATELESS
                    )
            )

            .authorizeHttpRequests(auth -> auth

                    .requestMatchers(
                            "/api/customer/auth/login",
                            "/api/customer/auth/verify-otp",
                            "/api/customer/auth/resend-otp",
                            "/api/customer/auth/first-login/change-password",
                            "/api/customer/auth/first-login/setup-pin",
                            "/api/customer/auth/refresh"
                    )
                    .permitAll()

                    .anyRequest()
                    .hasRole("CUSTOMER")
            )

            .addFilterBefore(
                    cusJwtAuthenticationFilter,
                    UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }
}