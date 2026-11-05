package com.corebanking.repository;

import com.corebanking.entity.AccountTransferLimitHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AccountTransferLimitHistoryRepository extends JpaRepository<AccountTransferLimitHistory, UUID> {

    List<AccountTransferLimitHistory> findByAccount_AccountIdOrderByChangedAtDesc(UUID accountId);

    List<AccountTransferLimitHistory> findByCustomer_CustomerIdOrderByChangedAtDesc(UUID customerId);

    List<AccountTransferLimitHistory> findByAccount_AccountNumberOrderByChangedAtDesc(String accountNumber);
}
