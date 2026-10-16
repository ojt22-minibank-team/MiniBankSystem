package com.corebanking.repository;

import com.corebanking.entity.LoginAttempt;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CusLoginAttemptsRepository
        extends JpaRepository<LoginAttempt, Long> {
}