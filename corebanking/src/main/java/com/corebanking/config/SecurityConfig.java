
package com.corebanking.config;

import com.corebanking.security.JwtAuthFilter;

import lombok.RequiredArgsConstructor;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    // =========================================================
    // PASSWORD ENCODER
    // =========================================================
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    // =========================================================
    // GENERAL SECURITY FILTER CHAIN
    // =========================================================
    @Bean
    @Order(2)
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http) throws Exception {

        http
            // Enable CORS
            .cors(Customizer.withDefaults())

            // Disable CSRF for stateless JWT authentication
            .csrf(csrf -> csrf.disable())

            // Use stateless session management
            .sessionManagement(session ->
                session.sessionCreationPolicy(
                    SessionCreationPolicy.STATELESS
                )
            )

            // =================================================
            // AUTHORIZATION RULES
            // =================================================
            .authorizeHttpRequests(auth -> auth

                // Swagger documentation
                .requestMatchers(
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/v3/api-docs/**"
                ).permitAll()

                // Public login endpoint
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/login"
                ).permitAll()

                // Public refresh endpoint
                // AuthService must validate the refresh token.
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/refresh"
                ).permitAll()

                // Public logout endpoint
                // AuthService must validate the logout token.
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/logout"
                ).permitAll()

                // Public staff password setup completion
                .requestMatchers(
                    HttpMethod.POST,
                    "/api/auth/staff-password-setup/complete"
                ).permitAll()

                // CORS preflight requests
                .requestMatchers(
                    HttpMethod.OPTIONS,
                    "/**"
                ).permitAll()

                // Customer APIs
                .requestMatchers(
                    "/api/customers",
                    "/api/customers/**"
                ).permitAll()

                // Account APIs
                .requestMatchers(
                    "/api/accounts",
                    "/api/accounts/**"
                ).permitAll()

                // All other endpoints require authentication
                .anyRequest().authenticated()
            )

            // Add JWT filter before the standard authentication filter
            .addFilterBefore(
                jwtAuthFilter,
                UsernamePasswordAuthenticationFilter.class
            );

        return http.build();
    }

    // =========================================================
    // PREVENT DUPLICATE JWT FILTER REGISTRATION
    // =========================================================
    @Bean
    public FilterRegistrationBean<JwtAuthFilter>
            jwtAuthFilterRegistration(
                    JwtAuthFilter filter) {

        FilterRegistrationBean<JwtAuthFilter> registration =
            new FilterRegistrationBean<>(filter);

        // JWT filter will run through Spring Security only
        registration.setEnabled(false);

        return registration;
    }
}
