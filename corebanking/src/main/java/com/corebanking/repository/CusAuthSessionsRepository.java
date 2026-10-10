package com.corebanking.repository;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import com.corebanking.entity.AuthSessions;

public interface CusAuthSessionsRepository
        extends JpaRepository<AuthSessions, UUID> {

	@EntityGraph(attributePaths = "customer")
    Optional<AuthSessions> findBySessionUuid(
            String sessionUuid
    );
}