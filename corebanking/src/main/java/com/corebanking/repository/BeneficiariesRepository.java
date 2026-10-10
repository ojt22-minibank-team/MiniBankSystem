package com.corebanking.repository;

import com.corebanking.entity.Beneficiaries;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface BeneficiariesRepository extends JpaRepository<Beneficiaries, UUID> {
}