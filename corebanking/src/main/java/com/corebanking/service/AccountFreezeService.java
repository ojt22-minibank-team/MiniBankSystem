package com.corebanking.service;

import com.corebanking.dto.AccountFreezeRequestDto;
import com.corebanking.dto.AccountFreezeResponseDto;

import java.util.UUID;

/**
 * Service contract for managing account freeze and unfreeze operations.
 * Implements bank fraud detection counter-measures and immutable audit capture.
 */
public interface AccountFreezeService {

    /**
     * Freezes an active account to immediately block outgoing debit and transfer operations.
     *
     * @param accountId UUID identifier of the customer account
     * @param request DTO containing the mandatory freeze reason
     * @return outcome response DTO with transition details
     */
    AccountFreezeResponseDto freezeAccount(UUID accountId, AccountFreezeRequestDto request);

    /**
     * Reactivates and unfreezes a currently frozen account.
     *
     * @param accountId UUID identifier of the customer account
     * @param request DTO containing the mandatory unfreeze reason
     * @return outcome response DTO with transition details
     */
    AccountFreezeResponseDto unfreezeAccount(UUID accountId, AccountFreezeRequestDto request);
}
