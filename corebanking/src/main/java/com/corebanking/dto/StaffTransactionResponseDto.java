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
import java.util.UUID;

/**
 * Summary DTO for displaying paginated transactions in Staff/Admin portal.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StaffTransactionResponseDto {

    private UUID transactionId;
    private String transactionRef;
    private TransactionType transactionType;
    private TransactionStatus status;
    private TransactionChannel channel;

    private BigDecimal amount;
    private BigDecimal serviceFee;
    private String currency;

    private String sourceAccountNo;
    private String sourceCustomerName;

    private String destAccountNo;
    private String destCustomerName;

    private InitiatedByType initiatedByType;
    private String initiatedByName;

    private String description;
    private LocalDateTime initiatedAt;
    private LocalDateTime completedAt;

    public static StaffTransactionResponseDto fromEntity(BankTransactions tx) {
        if (tx == null) return null;

        String sourceAccNo = tx.getSourceAccount() != null ? tx.getSourceAccount().getAccountNumber() : null;
        String sourceCustName = (tx.getSourceAccount() != null && tx.getSourceAccount().getCustomer() != null)
                ? tx.getSourceAccount().getCustomer().getFullName() : null;

        String destAccNo = tx.getDestinationAccount() != null ? tx.getDestinationAccount().getAccountNumber() : null;
        String destCustName = (tx.getDestinationAccount() != null && tx.getDestinationAccount().getCustomer() != null)
                ? tx.getDestinationAccount().getCustomer().getFullName() : null;

        String initiatorName = "System";
        if (tx.getInitiatedByStaff() != null) {
            initiatorName = tx.getInitiatedByStaff().getFullName() != null 
                    ? tx.getInitiatedByStaff().getFullName() 
                    : tx.getInitiatedByStaff().getUsername();
        } else if (tx.getInitiatedByCustomer() != null) {
            initiatorName = tx.getInitiatedByCustomer().getFullName();
        } else if (tx.getInitiatedByCorporateUser() != null) {
            initiatorName = tx.getInitiatedByCorporateUser().getFullName() != null 
                    ? tx.getInitiatedByCorporateUser().getFullName() 
                    : tx.getInitiatedByCorporateUser().getCorporateUserCode();
        }

        return StaffTransactionResponseDto.builder()
                .transactionId(tx.getTransactionId())
                .transactionRef(tx.getTransactionRef())
                .transactionType(tx.getTransactionType())
                .status(tx.getStatus())
                .channel(tx.getChannel())
                .amount(tx.getAmount())
                .serviceFee(tx.getServiceFee() != null ? tx.getServiceFee() : BigDecimal.ZERO)
                .currency(tx.getCurrency() != null ? tx.getCurrency() : "MMK")
                .sourceAccountNo(sourceAccNo)
                .sourceCustomerName(sourceCustName)
                .destAccountNo(destAccNo)
                .destCustomerName(destCustName)
                .initiatedByType(tx.getInitiatedByType())
                .initiatedByName(initiatorName)
                .description(tx.getDescription())
                .initiatedAt(tx.getInitiatedAt())
                .completedAt(tx.getCompletedAt())
                .build();
    }
}
