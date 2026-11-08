package com.corebanking.dto;

import com.corebanking.entity.BankTransactions;
import com.corebanking.entity.enums.InitiatedByType;
import com.corebanking.entity.enums.TransactionChannel;
import com.corebanking.entity.enums.TransactionStatus;
import com.corebanking.entity.enums.TransactionType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Detailed DTO for inspecting all granular attributes of a transaction in Staff Portal.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffTransactionDetailDto {

    private UUID transactionId;
    private String transactionRef;
    private String externalReference;
    private String idempotencyKey;

    private TransactionType transactionType;
    private TransactionStatus status;
    private TransactionChannel channel;

    private BigDecimal amount;
    private BigDecimal serviceFee;
    private BigDecimal totalDebited;
    private BigDecimal netCreditAmount;
    private String currency;

    // Source Account
    private UUID sourceAccountId;
    private String sourceAccountNo;
    private String sourceAccountType;
    private String sourceCustomerCode;
    private String sourceCustomerName;

    // Destination Account
    private UUID destAccountId;
    private String destAccountNo;
    private String destAccountType;
    private String destCustomerCode;
    private String destCustomerName;

    // Initiator
    private InitiatedByType initiatedByType;
    private String initiatedByName;
    private String initiatedByUsername;

    // Audit & Failure details
    private String description;
    private String auditNote;
    private String failureCode;
    private String failureMessage;

    // Timestamps
    private LocalDateTime initiatedAt;
    private LocalDateTime authorizedAt;
    private LocalDateTime completedAt;
    private LocalDateTime expiresAt;
    private LocalDateTime updatedAt;

    // Managerial override / review history (if applicable)
    private List<TransactionOverrideResponseDto> reviewHistory;

    public static StaffTransactionDetailDto fromEntity(BankTransactions tx, List<TransactionOverrideResponseDto> reviewHistory) {
        if (tx == null) return null;

        BigDecimal fee = tx.getServiceFee() != null ? tx.getServiceFee() : BigDecimal.ZERO;
        BigDecimal amount = tx.getAmount() != null ? tx.getAmount() : BigDecimal.ZERO;
        boolean isExternalPayment = tx.getTransactionType() == TransactionType.EXTERNAL_PAYMENT;
        BigDecimal total = isExternalPayment ? amount : amount.add(fee);
        BigDecimal netCredit = isExternalPayment ? amount.subtract(fee) : amount;

        // Source details
        UUID srcAccId = tx.getSourceAccount() != null ? tx.getSourceAccount().getAccountId() : null;
        String srcAccNo = tx.getSourceAccount() != null ? tx.getSourceAccount().getAccountNumber() : null;
        String srcAccType = (tx.getSourceAccount() != null && tx.getSourceAccount().getAccountType() != null)
                ? tx.getSourceAccount().getAccountType().name() : null;
        String srcCustCode = (tx.getSourceAccount() != null && tx.getSourceAccount().getCustomer() != null)
                ? tx.getSourceAccount().getCustomer().getCustomerCode() : null;
        String srcCustName = (tx.getSourceAccount() != null && tx.getSourceAccount().getCustomer() != null)
                ? tx.getSourceAccount().getCustomer().getFullName() : null;

        // Destination details
        UUID destAccId = tx.getDestinationAccount() != null ? tx.getDestinationAccount().getAccountId() : null;
        String destAccNo = tx.getDestinationAccount() != null ? tx.getDestinationAccount().getAccountNumber() : null;
        String destAccType = (tx.getDestinationAccount() != null && tx.getDestinationAccount().getAccountType() != null)
                ? tx.getDestinationAccount().getAccountType().name() : null;
        String destCustCode = (tx.getDestinationAccount() != null && tx.getDestinationAccount().getCustomer() != null)
                ? tx.getDestinationAccount().getCustomer().getCustomerCode() : null;
        String destCustName = (tx.getDestinationAccount() != null && tx.getDestinationAccount().getCustomer() != null)
                ? tx.getDestinationAccount().getCustomer().getFullName() : null;

        // Initiator details
        String initiatorName = "System";
        String initiatorUsername = null;
        if (tx.getInitiatedByStaff() != null) {
            initiatorName = tx.getInitiatedByStaff().getFullName() != null
                    ? tx.getInitiatedByStaff().getFullName()
                    : tx.getInitiatedByStaff().getUsername();
            initiatorUsername = tx.getInitiatedByStaff().getUsername();
        } else if (tx.getInitiatedByCustomer() != null) {
            initiatorName = tx.getInitiatedByCustomer().getFullName();
            initiatorUsername = tx.getInitiatedByCustomer().getEmail();
        } else if (tx.getInitiatedByCorporateUser() != null) {
            initiatorName = tx.getInitiatedByCorporateUser().getFullName() != null
                    ? tx.getInitiatedByCorporateUser().getFullName()
                    : tx.getInitiatedByCorporateUser().getCorporateUserCode();
            initiatorUsername = tx.getInitiatedByCorporateUser().getEmail();
        }

        return StaffTransactionDetailDto.builder()
                .transactionId(tx.getTransactionId())
                .transactionRef(tx.getTransactionRef())
                .externalReference(tx.getExternalReference())
                .idempotencyKey(tx.getIdempotencyKey())
                .transactionType(tx.getTransactionType())
                .status(tx.getStatus())
                .channel(tx.getChannel())
                .amount(amount)
                .serviceFee(fee)
                .totalDebited(total)
                .netCreditAmount(netCredit)
                .currency(tx.getCurrency() != null ? tx.getCurrency() : "MMK")
                .sourceAccountId(srcAccId)
                .sourceAccountNo(srcAccNo)
                .sourceAccountType(srcAccType)
                .sourceCustomerCode(srcCustCode)
                .sourceCustomerName(srcCustName)
                .destAccountId(destAccId)
                .destAccountNo(destAccNo)
                .destAccountType(destAccType)
                .destCustomerCode(destCustCode)
                .destCustomerName(destCustName)
                .initiatedByType(tx.getInitiatedByType())
                .initiatedByName(initiatorName)
                .initiatedByUsername(initiatorUsername)
                .description(tx.getDescription())
                .auditNote(tx.getAuditNote())
                .failureCode(tx.getFailureCode())
                .failureMessage(tx.getFailureMessage())
                .initiatedAt(tx.getInitiatedAt())
                .authorizedAt(tx.getAuthorizedAt())
                .completedAt(tx.getCompletedAt())
                .expiresAt(tx.getExpiresAt())
                .updatedAt(tx.getUpdatedAt())
                .reviewHistory(reviewHistory)
                .build();
    }
}
