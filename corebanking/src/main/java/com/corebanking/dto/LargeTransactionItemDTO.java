package com.corebanking.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class LargeTransactionItemDTO {
	private String transactionRef;
	private LocalDateTime transactionTime;
	private String transactionType;
	private String channel;
	private BigDecimal amount;
	private String currency;
	  private String sourceAccountNo;
	    private String sourceCustomerName;
	    private String destAccountNo;
	    private String destCustomerName;
	    private String riskLevel;
}
