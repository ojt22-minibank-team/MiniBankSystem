package com.corebanking.repository;

import com.corebanking.entity.Accounts;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AccountsRepository
        extends JpaRepository<Accounts, UUID> {

    Optional<Accounts> findByAccountNumber(String accountNumber);
}