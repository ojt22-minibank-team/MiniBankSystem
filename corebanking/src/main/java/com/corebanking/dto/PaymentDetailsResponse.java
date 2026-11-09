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

    /**
     * Standardizes Order Reference format:
     * - Pure digits (e.g. "40") -> "ORD-2026-0040" (zero-padded to at least 4 digits)
     * - Existing prefixes (e.g. "ORD-", "TXN-") -> preserved as is
     */
    public static String formatOrderId(String raw) {
        if (raw == null || raw.trim().isEmpty()) {
            return raw;
        }
        String trimmed = raw.trim();
        if (trimmed.matches("^\\d+$")) {
            try {
                long num = Long.parseLong(trimmed);
                return String.format("ORD-2026-%04d", num);
            } catch (NumberFormatException e) {
                return "ORD-2026-" + trimmed;
            }
        }
        return trimmed;
    }

    public void setOrderId(String orderId) {
        this.orderId = formatOrderId(orderId);
    }
}
