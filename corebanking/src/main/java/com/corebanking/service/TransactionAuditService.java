package com.corebanking.service;

import com.corebanking.dto.P2PTransferRequestDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.enums.InitiatedByType;
import com.corebanking.entity.enums.TransactionChannel;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.BankTransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.ThreadLocalRandom;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionAuditService {

    private final BankTransactionRepository bankTransactionRepository;
    private final AccountRepository accountRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordFailedTransfer(P2PTransferRequestDto request, String idempotencyKey, String failureCode, String failureMessage) {
        try {
            Accounts sourceAccount = accountRepository.findByAccountNumber(request.getSourceAccountNumber()).orElse(null);
            Accounts destAccount = accountRepository.findByAccountNumber(request.getDestinationAccountNumber()).orElse(null);

            String dateStr = LocalDate.now().format(DateTimeFormatter.BASIC_ISO_DATE);
            int randomNum = ThreadLocalRandom.current().nextInt(1000, 9999);
            String failedRef = String.format("TXN-FAIL-%s-%d", dateStr, randomNum);

            BankTransactions failedTxn = BankTransactions.builder()
                    .transactionRef(failedRef)
                    .transactionType(TransactionType.INTERNAL_TRANSFER)
                    .status(TransactionStatus.FAILED)
                    .sourceAccount(sourceAccount)
                    .destinationAccount(destAccount)
                    .amount(request.getAmount() != null ? request.getAmount() : BigDecimal.ZERO)
                    .serviceFee(BigDecimal.ZERO)
                    .currency(request.getCurrency() != null ? request.getCurrency() : "MMK")
                    .initiatedByType(InitiatedByType.CUSTOMER)
                    .initiatedByCustomer(sourceAccount != null ? sourceAccount.getCustomer() : null)
                    .channel(TransactionChannel.CUSTOMER_PORTAL)
                    .idempotencyKey(idempotencyKey)
                    .description(request.getDescription())
                    .auditNote("Failure Log: " + failureCode)
                    .failureCode(failureCode)
                    .failureMessage(failureMessage != null && failureMessage.length() > 255 ? failureMessage.substring(0, 255) : failureMessage)
                    .completedAt(LocalDateTime.now())
                    .build();

            bankTransactionRepository.save(failedTxn);
            log.info("Successfully persisted FAILED transaction record Ref: {}", failedRef);
        } catch (Exception ex) {
            log.error("Failed to save failed transaction record: {}", ex.getMessage(), ex);
        }
    }
}