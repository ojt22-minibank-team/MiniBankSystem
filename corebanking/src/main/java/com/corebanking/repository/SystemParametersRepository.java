package com.corebanking.repository;

import com.corebanking.entity.SystemParameters;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SystemParametersRepository extends JpaRepository<SystemParameters, Integer> {

    Optional<SystemParameters> findByParameterKeyIgnoreCase(String parameterKey);

    boolean existsByParameterKeyIgnoreCase(String parameterKey);
}