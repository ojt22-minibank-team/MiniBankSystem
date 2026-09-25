package com.corebanking.config;


import com.corebanking.security.JwtAuthFilter;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.core.annotation.Order;
@Configuration
@EnableWebSecurity
@EnableMethodSecurity // (၁) Controller က @PreAuthorize တွေ အလုပ်လုပ်စေရန်
@RequiredArgsConstructor // (၂) JwtAuthFilter ကို Inject လုပ်နိုင်ရန်
public class SecurityConfig {

    // (၃) မင်းရေးထားတဲ့ JwtAuthFilter ကို လှမ်းခေါ်ပါ
    private final JwtAuthFilter jwtAuthFilter;

    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    
    
    @Bean
    @Order(2)
   
  
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
            		
            		.requestMatchers(
                            "/swagger-ui/**",
                            "/swagger-ui.html",
                            "/v3/api-docs/**"
                    ).permitAll()
            		
            
            		
                // Member 2 ၏ Customer API ကို Token မပါဘဲ စမ်းသပ်နိုင်ရန် လမ်းဖွင့်ပေးခြင်း
                .requestMatchers("/api/customers/**").permitAll()
                // Auth endpoint များကိုလည်း ခွင့်ပြုထားခြင်း
                .requestMatchers("/api/auth/**").permitAll()
                // ကျန်ရှိသော အခြား API များကိုသာ Login တောင်းဆိုခြင်း
                .anyRequest().authenticated()
            )
            
    
            // (၄) UsernamePasswordAuthenticationFilter ရဲ့ အရှေ့မှာ JwtAuthFilter ကို အလုပ်လုပ်ခိုင်းခြင်း
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}