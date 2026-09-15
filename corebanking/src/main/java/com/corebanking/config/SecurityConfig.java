package com.corebanking.config;

import com.corebanking.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableMethodSecurity // Method Level တွင် @PreAuthorize သုံးနိုင်ရန်
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/login").permitAll()
                        
                        // TODO: TEMPORARY BYPASS FOR MEMBER 5 TESTING (Remove when JWT is fully integrated)
                        .requestMatchers("/api/v1/merchant-payment/**").permitAll()

                        .requestMatchers("/api/v1/gateway/**").authenticated()
                        
                        // ဥပမာ Role ကန့်သတ်ခြင်း 
                        // .requestMatchers("/api/admin/**").hasRole("ADMIN") 
                        .anyRequest().authenticated()
                )
                // Filter ကို UsernamePasswordAuthenticationFilter အရှေ့တွင် ထည့်ခြင်း
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}