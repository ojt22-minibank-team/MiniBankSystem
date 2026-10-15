package com.corebanking.repository;

import com.corebanking.entity.AccountHolds;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface AccountHoldsRepository extends JpaRepository<AccountHolds, UUID> {
}