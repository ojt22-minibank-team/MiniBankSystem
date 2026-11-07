package com.corebanking.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Arrays;

@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${app.cors.allowed-origins:http://localhost:8001,http://127.0.0.1:8001,http://localhost:8002,http://127.0.0.1:8002,http://localhost:8003,http://127.0.0.1:8003,http://localhost:8004,http://127.0.0.1:8004,http://localhost:8005,http://127.0.0.1:8005,http://localhost:8006,http://127.0.0.1:8006,http://localhost:4173,http://127.0.0.1:4173,http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174,http://42.156.32.114:8001,http://42.156.32.114:8002,http://42.156.32.114:8003,http://42.156.32.114:8004,http://42.156.32.114:8005,http://42.156.32.114:8006,http://42.156.32.114:8092,http://42.156.32.114:8093,http://42.156.32.114:8094}")
    private String allowedOrigins;

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        String[] origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .toArray(String[]::new);

        registry.addMapping("/**")
            .allowedOrigins(origins)
            .allowedMethods(
                "GET",
                "POST",
                "PUT",
                "PATCH",
                "DELETE",
                "OPTIONS"
            )
            .allowedHeaders("*")
            .allowCredentials(true);
    }
}
