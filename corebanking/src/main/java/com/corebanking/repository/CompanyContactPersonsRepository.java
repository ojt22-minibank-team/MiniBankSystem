package com.corebanking.repository;

import com.corebanking.entity.CompanyContactPersons;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CompanyContactPersonsRepository extends JpaRepository<CompanyContactPersons, CompanyContactPersons.CompanyContactId> {
    
    // ကုမ္ပဏီ Customer ID အလိုက် ဆက်သွယ်ရမည့် ပုဂ္ဂိုလ်များအားလုံး ဆွဲယူခြင်း
    List<CompanyContactPersons> findByCustomerId(UUID customerId);
}