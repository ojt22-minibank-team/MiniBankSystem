package com.corebanking.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            // REST API (Postman) အတွက် CSRF ကို ပိတ်ထားပါသည်
            .csrf(csrf -> csrf.disable())
            
            // Session မသိမ်းဆည်းဘဲ Stateless အဖြစ် သတ်မှတ်ပါသည်
            .sessionManagement(session -> 
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
            )
            
            // Endpoint များ၏ ခွင့်ပြုချက် သတ်မှတ်ခြင်း
            .authorizeHttpRequests(auth -> auth
                // Member 2 ၏ Customer API ကို Token မပါဘဲ စမ်းသပ်နိုင်ရန် လမ်းဖွင့်ပေးခြင်း
                .requestMatchers("/api/customers/**").permitAll()
                // Auth endpoint များကိုလည်း ခွင့်ပြုထားခြင်း
                .requestMatchers("/api/auth/**").permitAll()
                // ကျန်ရှိသော အခြား API များကိုသာ Login တောင်းဆိုခြင်း
                .anyRequest().authenticated()
            );

        return http.build();
    }
}