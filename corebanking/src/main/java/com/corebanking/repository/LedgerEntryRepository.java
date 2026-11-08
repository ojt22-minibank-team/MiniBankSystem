package com.corebanking.repository;

import com.corebanking.entity.LedgerEntries;
import com.corebanking.entity.enums.AccountClass;
import com.corebanking.entity.enums.EntryType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Repository
public interface LedgerEntryRepository extends JpaRepository<LedgerEntries, Long> {

    @Query("SELECT COALESCE(SUM(le.amount), 0) FROM LedgerEntries le " +
           "JOIN le.ledgerAccount la " +
           "WHERE la.ledgerCode = :ledgerCode " +
           "AND la.accountClass = :accountClass " +
           "AND le.entryType = :entryType")
    BigDecimal sumByLedgerCodeAndAccountClassAndEntryType(
            @Param("ledgerCode") String ledgerCode,
            @Param("accountClass") AccountClass accountClass,
            @Param("entryType") EntryType entryType);

    @Query("SELECT COALESCE(SUM(le.amount), 0) FROM LedgerEntries le " +
           "JOIN le.ledgerAccount la " +
           "WHERE la.ledgerCode = :ledgerCode " +
           "AND la.accountClass = :accountClass " +
           "AND le.entryType = :entryType " +
           "AND le.createdAt >= :startDate AND le.createdAt <= :endDate")
    BigDecimal sumByLedgerCodeAndAccountClassAndEntryTypeAndDateRange(
            @Param("ledgerCode") String ledgerCode,
            @Param("accountClass") AccountClass accountClass,
            @Param("entryType") EntryType entryType,
            @Param("startDate") LocalDateTime startDate,
            @Param("endDate") LocalDateTime endDate);
}
