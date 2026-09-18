package com.corebanking.repository;

import com.corebanking.entity.Accounts;
import com.corebanking.entity.LedgerAccounts;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface LedgerAccountRepository extends JpaRepository<LedgerAccounts, Integer> {

    Optional<LedgerAccounts> findByLedgerCode(String ledgerCode);

    Optional<LedgerAccounts> findByCustomerAccount(Accounts customerAccount);

    Optional<LedgerAccounts> findBySystemKey(String systemKey);
}
