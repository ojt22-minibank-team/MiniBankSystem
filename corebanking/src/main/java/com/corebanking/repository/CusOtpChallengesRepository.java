package com.corebanking.repository;

import com.corebanking.entity.OtpChallenges;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CusOtpChallengesRepository
        extends JpaRepository<OtpChallenges, Long> {
}