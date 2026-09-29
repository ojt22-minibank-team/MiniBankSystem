package com.corebanking.dto;

import java.time.LocalDateTime;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ReportRequestDto {
    private LocalDateTime fromDate;
    private LocalDateTime toDate;
    private String transactionType;
    private String status;
    private String channel;
    private String accountNumber;
    private byte[] staffId; // UUID binary
    private Integer limit;
    private LocalDateTime lastSeenDate;
    private byte[] lastSeenId;
}
