package com.corebanking.service;

import com.corebanking.util.DataMaskingUtil;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Unit Test suite for {@link DataMaskingUtil}.
 * Validates PII masking rules across NRC, account numbers, phone numbers, and email addresses.
 */
class DataMaskingUtilTest {

    @Test
    @DisplayName("Should mask NRC retaining region/type and last 4 digits")
    void maskNrc_ValidNrc_Success() {
        String input = "12/OUKAMA(N)123456";
        String masked = DataMaskingUtil.maskNrc(input);

        assertThat(masked).isNotNull();
        assertThat(masked).endsWith("3456");
        assertThat(masked).contains("*");
        assertThat(masked.length()).isEqualTo(input.length());
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "\t"})
    @DisplayName("Should safely handle null and blank NRC inputs")
    void maskNrc_NullOrBlank_ReturnsEmpty(String input) {
        assertThat(DataMaskingUtil.maskNrc(input)).isEmpty();
    }

    @Test
    @DisplayName("Should mask account number retaining last 4 digits only")
    void maskAccountNumber_ValidInput_Success() {
        String input = "1009876543";
        String masked = DataMaskingUtil.maskAccountNumber(input);

        assertThat(masked).isEqualTo("******6543");
        assertThat(masked.length()).isEqualTo(10);
    }

    @Test
    @DisplayName("Should handle short account number without crashing")
    void maskAccountNumber_ShortInput_MasksAll() {
        assertThat(DataMaskingUtil.maskAccountNumber("123")).isEqualTo("***");
        assertThat(DataMaskingUtil.maskAccountNumber("1234")).isEqualTo("****");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @DisplayName("Should safely handle null and blank account number inputs")
    void maskAccountNumber_NullOrBlank_ReturnsEmpty(String input) {
        assertThat(DataMaskingUtil.maskAccountNumber(input)).isEmpty();
    }

    @Test
    @DisplayName("Should mask local and international phone numbers correctly")
    void maskPhone_ValidInputs_Success() {
        String local = DataMaskingUtil.maskPhone("09987654321");
        assertThat(local).startsWith("099").endsWith("4321").contains("*");

        String intl = DataMaskingUtil.maskPhone("+95912345678");
        assertThat(intl).startsWith("+959").endsWith("5678").contains("*");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @DisplayName("Should safely handle null and blank phone inputs")
    void maskPhone_NullOrBlank_ReturnsEmpty(String input) {
        assertThat(DataMaskingUtil.maskPhone(input)).isEmpty();
    }

    @Test
    @DisplayName("Should mask email username while preserving domain")
    void maskEmail_ValidInput_Success() {
        String masked = DataMaskingUtil.maskEmail("john.doe@gmail.com");

        assertThat(masked).startsWith("j").endsWith("@gmail.com");
        assertThat(masked).contains("*");
        assertThat(masked).doesNotContain("john.doe");
    }

    @Test
    @DisplayName("Should handle short username email safely")
    void maskEmail_ShortUsername_Success() {
        String masked = DataMaskingUtil.maskEmail("ab@example.com");
        assertThat(masked).isEqualTo("a*@example.com");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @DisplayName("Should safely handle null and blank email inputs")
    void maskEmail_NullOrBlank_ReturnsEmpty(String input) {
        assertThat(DataMaskingUtil.maskEmail(input)).isEmpty();
    }
}
