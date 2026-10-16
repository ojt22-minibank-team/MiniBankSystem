package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

import com.corebanking.entity.enums.CustomerType;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CusDashboardResponseDTO {

    private String customerCode;

    private String fullName;
    
    private CustomerType customerType;

    private BigDecimal totalBalance;

    private int accountCount;

    private List<CusDashboardAccountDTO> accounts;
}