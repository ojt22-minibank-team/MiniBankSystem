package com.corebanking.config;

import java.util.List;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.corebanking.security.CusJwtAuthenticationFilter;

import lombok.RequiredArgsConstructor;

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
                    "/api/customer/**", "/api/v1/merchant-payment/**"
            )
            
           
            
            // REST API + JWT
            .csrf(
                    csrf ->
                            csrf.disable()
            )
            .cors(cors ->
            cors.configurationSource(
                    corsConfigurationSource()
            )
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
                    // CORS preflight
                    .requestMatchers(
                            HttpMethod.OPTIONS,
                            "/**"
                    )
                    .permitAll()

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
                        
                     // Password Reset Flow
                        .requestMatchers(
                                "/api/customer/auth/password-reset/**"
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
    
    
    @Bean
    @Primary
    public CorsConfigurationSource
            corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        String envOrigins = System.getProperty("app.cors.allowed-origins");
        if (envOrigins == null) {
            envOrigins = System.getProperty("CORS_ALLOWED_ORIGINS");
        }
        if (envOrigins == null) {
            envOrigins = System.getenv("CORS_ALLOWED_ORIGINS");
        }
        List<String> origins = (envOrigins != null && !envOrigins.isBlank())
                ? java.util.Arrays.stream(envOrigins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList()
                : List.of(
                        "http://localhost:8001",
                        "http://127.0.0.1:8001",
                        "http://localhost:8002",
                        "http://127.0.0.1:8002",
                        "http://localhost:8003",
                        "http://127.0.0.1:8003",
                        "http://localhost:8004",
                        "http://127.0.0.1:8004",
                        "http://localhost:8005",
                        "http://127.0.0.1:8005",
                        "http://localhost:8006",
                        "http://127.0.0.1:8006",
                        "http://localhost:4173",
                        "http://127.0.0.1:4173",
                        "http://localhost:5173",
                        "http://127.0.0.1:5173",
                        "http://localhost:5174",
                        "http://127.0.0.1:5174",
                        "http://42.156.32.114:8001",
                        "http://42.156.32.114:8002",
                        "http://42.156.32.114:8003",
                        "http://42.156.32.114:8004",
                        "http://42.156.32.114:8005",
                        "http://42.156.32.114:8006",
                        "http://42.156.32.114:8092",
                        "http://42.156.32.114:8093",
                        "http://42.156.32.114:8094"
                );

        configuration.setAllowedOrigins(origins);

        configuration.setAllowedMethods(
                List.of(
                        "GET",
                        "POST",
                        "PUT",
                        "PATCH",
                        "DELETE",
                        "OPTIONS"
                )
        );

        configuration.setAllowedHeaders(
                List.of(
                        "Authorization",
                        "Content-Type",
                        "Idempotency-Key",
                        "X-Requested-With",
                        "Accept"
                )
        );

        configuration.setAllowCredentials(true);


        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration(
                "/**",
                configuration
        );

        return source;
    }
}
