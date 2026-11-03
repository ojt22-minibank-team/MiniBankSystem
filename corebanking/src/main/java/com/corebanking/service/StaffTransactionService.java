package com.corebanking.service;

import com.corebanking.dto.StaffTransactionDetailDto;
import com.corebanking.dto.StaffTransactionResponseDto;
import com.corebanking.dto.StaffTransactionSearchCriteria;
import com.corebanking.dto.StaffTransactionStatsDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

/**
 * Service contract for querying, filtering, and retrieving detailed transactions in Staff/Admin Portal.
 */
public interface StaffTransactionService {

    /**
     * Searches transactions with dynamic filtering and database-level pagination.
     */
    Page<StaffTransactionResponseDto> searchTransactions(StaffTransactionSearchCriteria criteria, Pageable pageable);

    /**
     * Retrieves comprehensive transaction details by either UUID or transaction reference string.
     */
    StaffTransactionDetailDto getTransactionDetail(String identifier);

    /**
     * Calculates overview KPI statistics for the transactions dashboard.
     */
    StaffTransactionStatsDto getTransactionStats();
}
