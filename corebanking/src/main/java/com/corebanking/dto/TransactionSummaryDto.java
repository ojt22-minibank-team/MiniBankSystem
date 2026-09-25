package com.corebanking.dto;

import java.math.BigDecimal;

import lombok.Getter;
import lombok.Setter;
@Getter
@Setter
public class TransactionSummaryDto {
	    private Long filteredTransactionCount;
	    private BigDecimal filteredTotalAmount;
	    private BigDecimal filteredTotalFee;
	    private String currency;
	}

