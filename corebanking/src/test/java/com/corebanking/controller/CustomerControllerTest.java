package com.corebanking.controller;

import com.corebanking.dto.CustomerDTO;
import com.corebanking.dto.CustomerResponseDTO;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.CustomerService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@ExtendWith(MockitoExtension.class)
class CustomerControllerTest {

    @Mock
    private CustomerService customerService;

    @InjectMocks
    private CustomerController customerController;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(customerController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

   
    @Test
    @DisplayName("testCreatePersonalCustomer_ValidPayload_Returns201: POST /api/customers/personal returns 201 and customer code")
    void testCreatePersonalCustomer_ValidPayload_Returns201() throws Exception {
        CustomerResponseDTO responseDto = CustomerResponseDTO.builder()
                .customerCode("CUST-20261102-1001")
                .customerType("PERSONAL")
                .fullName("Daw Yoon")
                .email("yoon@test.com")
                .phone("09123456789")
                .status("ACTIVE")
                .build();

        when(customerService.createCustomer(any(CustomerDTO.class))).thenReturn(responseDto);

        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "12/DAGANA(N)123456",
                    "email": "yoon@test.com",
                    "phone": "09123456789",
                    "customerType": "PERSONAL"
                }
                """;

        mockMvc.perform(post("/api/customers/personal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customerCode").value("CUST-20261102-1001"))
                .andExpect(jsonPath("$.fullName").value("Daw Yoon"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.customerType").value("PERSONAL"));
    }

    
    @Test
    @DisplayName("testCreateCompanyCustomer_ValidPayload_Returns201: POST /api/customers/company returns 201")
    void testCreateCompanyCustomer_ValidPayload_Returns201() throws Exception {
        CustomerResponseDTO responseDto = CustomerResponseDTO.builder()
                .customerCode("COMP-20261102-5001")
                .customerType("COMPANY")
                .fullName("Ace Tech Co., Ltd")
                .email("info@acetech.com")
                .phone("09123456789")
                .status("ACTIVE")
                .build();

        when(customerService.createCustomer(any(CustomerDTO.class))).thenReturn(responseDto);

        String jsonPayload = """
                {
                    "companyName": "Ace Tech Co., Ltd",
                    "registrationNumber": "REG-2026-9988",
                    "taxId": "TAX-998877",
                    "businessType": "FINTECH",
                    "email": "info@acetech.com",
                    "phone": "09123456789",
                    "customerType": "COMPANY"
                }
                """;

        mockMvc.perform(post("/api/customers/company")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.customerCode").value("COMP-20261102-5001"))
                .andExpect(jsonPath("$.fullName").value("Ace Tech Co., Ltd"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.customerType").value("COMPANY"));
    }

   
    @Test
    @DisplayName("testCreateCustomer_InvalidPhone_Returns400: 9-digit phone triggers validation error and 400 Bad Request")
    void testCreateCustomer_InvalidPhone_Returns400() throws Exception {
        when(customerService.createCustomer(any(CustomerDTO.class)))
                .thenThrow(new IllegalArgumentException("Phone number must be exactly 11 digits long: 091234567"));

        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "12/DAGANA(N)123456",
                    "email": "yoon@test.com",
                    "phone": "091234567",
                    "customerType": "PERSONAL"
                }
                """;

        mockMvc.perform(post("/api/customers/personal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message", containsString("Phone number must be exactly 11 digits long")));
    }

   
    @Test
    @DisplayName("testCreateCustomer_DuplicateEntry_ReturnsConflictOrBadRequest: Duplicate service exception returns client error")
    void testCreateCustomer_DuplicateEntry_ReturnsConflictOrBadRequest() throws Exception {
        when(customerService.createCustomer(any(CustomerDTO.class)))
                .thenThrow(new IllegalArgumentException("Email address is already registered in the system: duplicate@test.com"));

        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "12/DAGANA(N)123456",
                    "email": "duplicate@test.com",
                    "phone": "09123456789",
                    "customerType": "PERSONAL"
                }
                """;

        mockMvc.perform(post("/api/customers/personal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().is4xxClientError())
                .andExpect(jsonPath("$.code").value("BAD_REQUEST"))
                .andExpect(jsonPath("$.message", containsString("Email address is already registered")));
    }
}