package com.corebanking.repository;

import com.corebanking.entity.CompanyContactPersons;
import com.corebanking.entity.CompanyContactPersons.CompanyContactId;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CompanyContactPersonsRepository
        extends JpaRepository<CompanyContactPersons, CompanyContactId> {
}