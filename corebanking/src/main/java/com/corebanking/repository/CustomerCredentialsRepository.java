package com.corebanking.repository;

import com.corebanking.entity.CustomerCredentials;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CustomerCredentialsRepository
        extends JpaRepository<CustomerCredentials, UUID> {
}