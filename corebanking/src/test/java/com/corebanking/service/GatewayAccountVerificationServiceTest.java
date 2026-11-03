package com.corebanking.service;

import com.corebanking.dto.GatewayAccountVerificationResponseDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.Customers;
import com.corebanking.entity.enums.AccountCategory;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.CustomerType;
import com.corebanking.exception.AccountNotFoundException;
import com.corebanking.repository.AccountRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GatewayAccountVerificationServiceTest {

    @Mock
    private AccountRepository accountRepository;

    @InjectMocks
    private GatewayAccountVerificationService verificationService;

    private Accounts corporateAccount;
    private Accounts retailAccount;

    @BeforeEach
    void setUp() {
        CompanyInfo companyInfo = CompanyInfo.builder()
                .companyName("ABC Trading Co., Ltd.")
                .registrationNumber("REG-123456")
                .taxId("TAX-999")
                .build();

        Customers corporateCustomer = Customers.builder()
                .customerType(CustomerType.COMPANY)
                .fullName("ABC Trading Co., Ltd.")
                .companyInfo(companyInfo)
                .build();

        corporateAccount = Accounts.builder()
                .accountNumber("ACC-CORP-001")
                .accountCategory(AccountCategory.CORPORATE)
                .status(AccountStatus.ACTIVE)
                .currency("MMK")
                .customer(corporateCustomer)
                .build();

        Customers retailCustomer = Customers.builder()
                .customerType(CustomerType.INDIVIDUAL)
                .fullName("John Doe")
                .build();

        retailAccount = Accounts.builder()
                .accountNumber("ACC-RETAIL-002")
                .accountCategory(AccountCategory.RETAIL)
                .status(AccountStatus.ACTIVE)
                .currency("MMK")
                .customer(retailCustomer)
                .build();
    }

    @Test
    void verifyCorporateAccount_Success() {
        when(accountRepository.findByAccountNumberWithCustomerAndCompany("ACC-CORP-001"))
                .thenReturn(Optional.of(corporateAccount));

        GatewayAccountVerificationResponseDto response = verificationService.verifyCorporateAccount("ACC-CORP-001");

        assertNotNull(response);
        assertEquals("ACC-CORP-001", response.getAccountNumber());
        assertEquals("ABC Trading Co., Ltd.", response.getCompanyName());
        assertTrue(response.isCorporate());
        assertTrue(response.isVerified());
        assertEquals("CORPORATE", response.getAccountCategory());
        assertEquals("ACTIVE", response.getStatus());
    }

    @Test
    void verifyCorporateAccount_RetailAccount_ReturnsNotCorporate() {
        when(accountRepository.findByAccountNumberWithCustomerAndCompany("ACC-RETAIL-002"))
                .thenReturn(Optional.of(retailAccount));

        GatewayAccountVerificationResponseDto response = verificationService.verifyCorporateAccount("ACC-RETAIL-002");

        assertNotNull(response);
        assertEquals("ACC-RETAIL-002", response.getAccountNumber());
        assertFalse(response.isCorporate());
        assertFalse(response.isVerified());
        assertEquals("RETAIL", response.getAccountCategory());
    }

    @Test
    void verifyCorporateAccount_AccountNotFound_ThrowsException() {
        when(accountRepository.findByAccountNumberWithCustomerAndCompany("NON_EXISTENT"))
                .thenReturn(Optional.empty());

        assertThrows(AccountNotFoundException.class, () -> verificationService.verifyCorporateAccount("NON_EXISTENT"));
    }
}
