package com.corebanking.repository;

import com.corebanking.entity.LoginAttempts;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CusLoginAttemptsRepository
        extends JpaRepository<LoginAttempts, Long> {
}