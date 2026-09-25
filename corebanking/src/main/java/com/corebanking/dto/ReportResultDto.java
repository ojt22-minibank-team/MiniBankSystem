package com.corebanking.dto;

import java.util.ArrayList;
import java.util.List;

import lombok.Getter;
import lombok.Setter;

@Getter@Setter
public class ReportResultDto {
    private List<TransactionSummaryDto> summaries = new ArrayList<>();
    private List<TransactionDetailDto> details = new ArrayList<>();
}