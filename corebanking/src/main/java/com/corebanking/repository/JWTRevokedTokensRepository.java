package com.corebanking.repository;

import com.corebanking.entity.JwtRevokedTokens;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying; 
import org.springframework.transaction.annotation.Transactional; 

import java.time.LocalDateTime; 
import java.util.Optional;

public interface JWTRevokedTokensRepository
        extends JpaRepository<JwtRevokedTokens, Long> {

    Optional<JwtRevokedTokens> findByJti(String jti);

    boolean existsByJti(String jti);
    
   
    @Modifying
    @Transactional
    void deleteByTokenExpiresAtBefore(LocalDateTime time);
}