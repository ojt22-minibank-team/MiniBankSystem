package com.corebanking.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class PaymentDetailsResponse {

    @JsonAlias({"businessName", "merchant_name"})
    private String merchantName;

    private String merchantAccountNumber;
    private String orderId;
    private String description;
    private BigDecimal amount;
    private String currency;
    private String status;
}