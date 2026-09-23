package com.corebanking.repository;

import com.corebanking.entity.JwtRevokedTokens;

import org.springframework.data.jpa.repository.JpaRepository;

public interface CusJwtRevokedTokensRepository
        extends JpaRepository<JwtRevokedTokens, Long> {

    boolean existsByJti(String jti);
}