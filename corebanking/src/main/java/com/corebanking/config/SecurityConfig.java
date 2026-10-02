

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
    // GENERAL SECURITY CHAIN
    // Customer chain ပြီးမှ ဒီ chain သုံးမယ်
    // =========================================================

    @Bean
    @Order(2)
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http)
            throws Exception {


        http
        
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


                        // Member 5: Merchant Payment Checkout Info (Public so UI can show price)
                        .requestMatchers(
                                org.springframework.http.HttpMethod.GET,
                                "/api/customer/merchant-payment/request/**"
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
