package com.corebanking.repository;

import com.corebanking.entity.FeeSchedules;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface FeeSchedulesRepository extends JpaRepository<FeeSchedules, Integer> {

    Optional<FeeSchedules> findByFeeCodeIgnoreCase(String feeCode);

    boolean existsByFeeCodeIgnoreCase(String feeCode);
}