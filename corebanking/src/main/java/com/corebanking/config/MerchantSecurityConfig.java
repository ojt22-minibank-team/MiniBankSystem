package com.corebanking.config;

import com.corebanking.security.MerchantApiAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@RequiredArgsConstructor
public class MerchantSecurityConfig {

    private final MerchantApiAuthFilter merchantApiAuthFilter;

    /**
     * Disable standard servlet container auto-registration so that
     * MerchantApiAuthFilter only executes via the Spring Security Filter Chain.
     */
    @Bean
    public FilterRegistrationBean<MerchantApiAuthFilter> merchantApiAuthFilterRegistration(
            MerchantApiAuthFilter filter) {
        FilterRegistrationBean<MerchantApiAuthFilter> registration = new FilterRegistrationBean<>(filter);
        registration.setEnabled(false);
        return registration;
    }

    /**
     * Dedicated SecurityFilterChain for Merchant & Payment Gateway E-commerce payments.
     * Order(-1) ensures this takes precedence for /api/v1/payments/ecommerce/** before general chains.
     */
    @Bean
    @Order(-1)
    public SecurityFilterChain merchantSecurityFilterChain(HttpSecurity http) throws Exception {
        http
                .securityMatcher("/api/v1/payments/ecommerce/**")
                .cors(Customizer.withDefaults())
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/payments/ecommerce/**").hasAuthority("ROLE_MERCHANT_GATEWAY")
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        merchantApiAuthFilter,
                        UsernamePasswordAuthenticationFilter.class
                );

        return http.build();
    }
}
