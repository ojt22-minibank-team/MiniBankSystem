

package com.corebanking.config;


import com.corebanking.security.JwtAuthFilter;

import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;


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
    // CORS CONFIGURATION
    // =========================================================

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration =
                new CorsConfiguration();

        configuration.setAllowedOrigins(
                List.of("http://localhost:5173")
        );

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
                        "Content-Type"
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



    // =========================================================
    // GENERAL SECURITY CHAIN
    // Customer chain ပြီးမှ ဒီ chain သုံးမယ်
    // =========================================================

    @Bean
    @Order(2)
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http)
            throws Exception {


        http
     // -------------------------------------------------
        // CORS
        // -------------------------------------------------

        .cors(cors -> {})
        
            .csrf(
                    csrf ->
                            csrf.disable()
            )


            .sessionManagement(
                    session ->
                            session.sessionCreationPolicy(
                                    SessionCreationPolicy.STATELESS
                            )
            )


            .authorizeHttpRequests(
                    auth -> auth

                    // OPTIONS / CORS preflight
                    .requestMatchers(
                            HttpMethod.OPTIONS,
                            "/**"
                    )
                    .permitAll()
                        // Swagger
                        .requestMatchers(
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/v3/api-docs/**"
                        )
                        .permitAll()


                        // Member 2 customer APIs
                        .requestMatchers(
                                "/api/customers/**"
                        )
                        .permitAll()


                        // Existing Auth APIs
                        .requestMatchers(
                                "/api/auth/**"
                        )
                        .permitAll()


                        // Other endpoints
                        .anyRequest()
                        .authenticated()
            )


            .addFilterBefore(
                    jwtAuthFilter,
                    UsernamePasswordAuthenticationFilter.class
            );


        return http.build();
    }
    @Bean
    public FilterRegistrationBean<JwtAuthFilter>
            jwtAuthFilterRegistration(
                    JwtAuthFilter filter) {

        FilterRegistrationBean<JwtAuthFilter>
                registration =
                new FilterRegistrationBean<>(filter);

        registration.setEnabled(false);

        return registration;
    }
}