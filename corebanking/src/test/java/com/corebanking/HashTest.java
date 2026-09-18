package com.corebanking;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

public class HashTest {
    @Test
    public void generateHash() {
        System.out.println("\n\n=== YOUR NEW HASH ===");
        System.out.println(new BCryptPasswordEncoder().encode("123456"));
        System.out.println("=====================\n\n");
    }
}
