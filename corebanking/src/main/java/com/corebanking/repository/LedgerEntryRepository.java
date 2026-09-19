package com.corebanking.repository;

import com.corebanking.entity.LedgerEntries;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntries, Long> {
}
