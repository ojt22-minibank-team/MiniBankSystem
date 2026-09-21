package com.corebanking.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.corebanking.entity.Customers;
import com.corebanking.entity.OtpChallenges;
import com.corebanking.entity.enums.OtpPurpose;
import com.corebanking.entity.enums.OtpStatus;

public interface CusOtpChallengesRepository
        extends JpaRepository<OtpChallenges, Long> {
	List<OtpChallenges> findByCustomerAndPurposeAndStatus(
            Customers customer,
            OtpPurpose purpose,
            OtpStatus status
    );
}