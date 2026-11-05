package com.corebanking.repository;

import com.corebanking.entity.AccountTransferLimits;
import com.corebanking.entity.Accounts;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface AccountTransferLimitsRepository extends JpaRepository<AccountTransferLimits, UUID> {

    Optional<AccountTransferLimits> findByAccount(Accounts account);

    Optional<AccountTransferLimits> findByAccount_AccountId(UUID accountId);

    Optional<AccountTransferLimits> findByAccount_AccountNumber(String accountNumber);

    boolean existsByAccount(Accounts account);
}
