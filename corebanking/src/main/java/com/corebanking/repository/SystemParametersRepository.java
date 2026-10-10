package com.corebanking.repository;

import com.corebanking.entity.SystemParameters;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SystemParametersRepository extends JpaRepository<SystemParameters, Integer> {
}