package com.corebanking.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class AppConfig {

    @Bean
    public ObjectMapper objectMapper() {
        ObjectMapper mapper = new ObjectMapper();
        // Date/Time တွေကို JSON ပြောင်းရာမှာ အဆင်ပြေစေရန် JavaTimeModule ကိုပါ ထည့်ပေးထားပါတယ်
        mapper.registerModule(new JavaTimeModule()); 
        return mapper;
    }
}