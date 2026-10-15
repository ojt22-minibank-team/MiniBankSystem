package com.corebanking.repository;

import com.corebanking.entity.AccountStatusHistory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountStatusHistoryRepository extends JpaRepository<AccountStatusHistory, Long> {
}