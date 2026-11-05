package com.corebanking.config;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.MutablePropertySources;
import org.springframework.core.env.StandardEnvironment;

import java.util.Map;

/**
 * Spring Boot EnvironmentPostProcessor that injects .env values into the Spring Environment.
 *
 * Precedence Order:
 * 1. OS Environment Variables (systemEnvironment) - highest
 * 2. JVM System Properties (systemProperties)
 * 3. Dotenv Properties (dotenvProperties from .env)
 * 4. application.properties defaults - lowest
 */
public class DotenvEnvironmentPostProcessor implements EnvironmentPostProcessor, Ordered {

    public static final String PROPERTY_SOURCE_NAME = "dotenvProperties";

    @Override
    public void postProcessEnvironment(ConfigurableEnvironment environment, SpringApplication application) {
        Map<String, Object> dotenv = DotenvLoader.load();
        if (dotenv.isEmpty()) {
            return;
        }

        MutablePropertySources propertySources = environment.getPropertySources();
        if (propertySources.contains(StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME)) {
            propertySources.addAfter(
                    StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                    new MapPropertySource(PROPERTY_SOURCE_NAME, dotenv)
            );
        } else {
            propertySources.addLast(new MapPropertySource(PROPERTY_SOURCE_NAME, dotenv));
        }
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }
}
