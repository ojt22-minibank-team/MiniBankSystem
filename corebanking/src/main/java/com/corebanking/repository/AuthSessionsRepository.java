package com.corebanking.repository;

import com.corebanking.entity.AuthSessions;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuthSessionsRepository
        extends JpaRepository<AuthSessions, UUID> {

    Optional<AuthSessions> findBySessionUuid(
            String sessionUuid
    );

    Optional<AuthSessions> findByRefreshTokenHash(
            String refreshTokenHash
    );
}