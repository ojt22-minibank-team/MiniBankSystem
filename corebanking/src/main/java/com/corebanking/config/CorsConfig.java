package com.corebanking.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/**") // API အားလုံးအတွက် ခွင့်ပြုရန်
                .allowedOrigins("http://localhost:5173") // Frontend လိပ်စာ
                .allowedMethods("GET", "POST", "PUT","PATCH", "DELETE", "OPTIONS")
                .allowCredentials(true);
    }
}