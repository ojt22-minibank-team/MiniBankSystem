package com.corebanking.repository;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;

class CusTransactionHistoryRepositoryTest {

    @Test
    @DisplayName("Internal transfer: Normal live counterparty returns 'Transfer to <Counterparty>'")
    void buildDisplayTitle_internalTransfer_normalLiveCounterparty() {
        String title = CusTransactionHistoryRepository.buildDisplayTitle(
                "INTERNAL_TRANSFER",
                "2003513817",
                "2003513817",
                "1008207493",
                "Daw Hla",
                false,
                "Monthly Rent"
        );
        assertEquals("Transfer to Daw Hla", title);
    }

    @Test
    @DisplayName("Internal transfer: Deleted counterparty outgoing returns 'Transfer to <DestinationAccountNumber>'")
    void buildDisplayTitle_internalTransfer_deletedCounterparty_outgoing() {
        String title = CusTransactionHistoryRepository.buildDisplayTitle(
                "INTERNAL_TRANSFER",
                "2003513817",
                "2003513817",
                "1008207493",
                null,
                false,
                "Monthly Rent"
        );
        assertEquals("Transfer to 1008207493", title);
    }

    @Test
    @DisplayName("Internal transfer: Deleted counterparty incoming returns 'Transfer from <SourceAccountNumber>'")
    void buildDisplayTitle_internalTransfer_deletedCounterparty_incoming() {
        String title = CusTransactionHistoryRepository.buildDisplayTitle(
                "INTERNAL_TRANSFER",
                "1008207493",
                "2003513817",
                "1008207493",
                null,
                false,
                "Monthly Rent"
        );
        assertEquals("Transfer from 2003513817", title);
    }

    @Test
    @DisplayName("Internal transfer: Own account takes precedence even if counterparty or account is present")
    void buildDisplayTitle_internalTransfer_ownAccountPrecedence() {
        String titleOutgoing = CusTransactionHistoryRepository.buildDisplayTitle(
                "INTERNAL_TRANSFER",
                "2003513817",
                "2003513817",
                "1008207493",
                "Self Account",
                true,
                "Self Transfer"
        );
        assertEquals("Transfer to Own Account", titleOutgoing);

        String titleIncoming = CusTransactionHistoryRepository.buildDisplayTitle(
                "INTERNAL_TRANSFER",
                "1008207493",
                "2003513817",
                "1008207493",
                "Self Account",
                true,
                "Self Transfer"
        );
        assertEquals("Transfer from Own Account", titleIncoming);
    }

    @Test
    @DisplayName("Internal transfer: Neither counterparty nor destination account falls back to 'Outgoing Transfer'")
    void buildDisplayTitle_internalTransfer_noCounterpartyNoAccount_outgoing() {
        String title = CusTransactionHistoryRepository.buildDisplayTitle(
                "INTERNAL_TRANSFER",
                "2003513817",
                "2003513817",
                null,
                null,
                false,
                null
        );
        assertEquals("Outgoing Transfer", title);
    }

    @Test
    @DisplayName("Internal transfer: Neither counterparty nor source account falls back to 'Incoming Transfer'")
    void buildDisplayTitle_internalTransfer_noCounterpartyNoAccount_incoming() {
        String title = CusTransactionHistoryRepository.buildDisplayTitle(
                "INTERNAL_TRANSFER",
                "1008207493",
                null,
                "1008207493",
                null,
                false,
                null
        );
        assertEquals("Incoming Transfer", title);
    }

    @Test
    @DisplayName("External payment: Deleted counterparty outgoing returns 'Payment to <DestinationAccountNumber>'")
    void buildDisplayTitle_externalPayment_deletedCounterparty_outgoing() {
        String title = CusTransactionHistoryRepository.buildDisplayTitle(
                "EXTERNAL_PAYMENT",
                "2003513817",
                "2003513817",
                "9876543210",
                null,
                false,
                "Utility Bill"
        );
        assertEquals("Payment to 9876543210", title);
    }

    @Test
    @DisplayName("External payment: Deleted counterparty incoming returns 'Payment from <SourceAccountNumber>'")
    void buildDisplayTitle_externalPayment_deletedCounterparty_incoming() {
        String title = CusTransactionHistoryRepository.buildDisplayTitle(
                "EXTERNAL_PAYMENT",
                "9876543210",
                "2003513817",
                "9876543210",
                null,
                false,
                "Salary"
        );
        assertEquals("Payment from 2003513817", title);
    }

    @Test
    @DisplayName("External payment: No counterparty and no account number falls back to 'Payment' / 'Payment Received'")
    void buildDisplayTitle_externalPayment_noCounterpartyNoAccount() {
        String titleOutgoing = CusTransactionHistoryRepository.buildDisplayTitle(
                "EXTERNAL_PAYMENT",
                "2003513817",
                "2003513817",
                null,
                null,
                false,
                null
        );
        assertEquals("Payment", titleOutgoing);

        String titleIncoming = CusTransactionHistoryRepository.buildDisplayTitle(
                "EXTERNAL_PAYMENT",
                "9876543210",
                null,
                "9876543210",
                null,
                false,
                null
        );
        assertEquals("Payment Received", titleIncoming);
    }

    @Test
    @DisplayName("Transaction item DTO preserves external reference")
    void cusTransactionHistoryItemDTO_preservesExternalReference() {
        com.corebanking.dto.CusTransactionHistoryItemDTO item = com.corebanking.dto.CusTransactionHistoryItemDTO.builder()
                .transactionRef("TXN-ECOM-20261108-001")
                .externalReference("ORD-20261108-001")
                .build();
        assertEquals("ORD-20261108-001", item.getExternalReference());
    }
}
