package com.corebanking.controller;

import com.corebanking.dto.CustomerDTO;
import com.corebanking.dto.CustomerResponseDTO;
import com.corebanking.exception.GlobalExceptionHandler;
import com.corebanking.service.CustomerService;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.entity.StaffUsers;
import com.corebanking.dto.CustomerUpdateDTO;
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
import static org.mockito.Mockito.doNothing;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.nullable;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;


@ExtendWith(MockitoExtension.class)
class CustomerControllerTest {

    @Mock
    private CustomerService customerService;

    @Mock
    private StaffUsersRepository staffUsersRepository;

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
                .email("yoon@gmail.com")
                .phone("09123456789")
                .status("ACTIVE")
                .build();

        when(customerService.createCustomer(any(CustomerDTO.class))).thenReturn(responseDto);

        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "12/DAGANA(N)123456",
                    "email": "yoon@gmail.com",
                    "phone": "09123456789",
                    "dateOfBirth": "1995-05-20",
                    "address": "No. 123, Bogyoke Road, Yangon",
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
                .email("info.acetech@gmail.com")
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
                    "email": "info.acetech@gmail.com",
                    "phone": "09123456789",
                    "dateOfBirth": "1995-05-20",
                    "address": "Tower A, Level 15, Hledan Centre, Yangon",
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
        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "12/DAGANA(N)123456",
                    "email": "yoon@gmail.com",
                    "phone": "091234567",
                    "address": "No. 123, Bogyoke Road, Yangon",
                    "customerType": "PERSONAL"
                }
                """;

        mockMvc.perform(post("/api/customers/personal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message", containsString("Phone number must be exactly 11 digits starting with 09")));
    }

   
    @Test
    @DisplayName("testCreateCustomer_DuplicateEntry_ReturnsConflictOrBadRequest: Duplicate service exception returns client error")
    void testCreateCustomer_DuplicateEntry_ReturnsConflictOrBadRequest() throws Exception {
        when(customerService.createCustomer(any(CustomerDTO.class)))
                .thenThrow(new IllegalArgumentException("Email address is already registered in the system: duplicate@gmail.com"));

        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "12/DAGANA(N)123456",
                    "email": "duplicate@gmail.com",
                    "phone": "09123456789",
                    "dateOfBirth": "1995-05-20",
                    "address": "No. 123, Bogyoke Road, Yangon",
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

    @Test
    @DisplayName("testCreateCustomer_NonGmailEmail_Returns400ValidationError: Non-gmail address is rejected by @Pattern")
    void testCreateCustomer_NonGmailEmail_Returns400ValidationError() throws Exception {
        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "12/DAGANA(N)123456",
                    "email": "user@yahoo.com",
                    "phone": "09123456789",
                    "address": "No. 123, Bogyoke Road, Yangon",
                    "customerType": "PERSONAL"
                }
                """;

        mockMvc.perform(post("/api/customers/personal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message", containsString("Email must be a valid @gmail.com address")));
    }

    @Test
    @DisplayName("testCreateCustomer_InvalidEmailHost_Returns400InvalidEmail: Host deliverability failure returns 400")
    void testCreateCustomer_InvalidEmailHost_Returns400InvalidEmail() throws Exception {
        when(customerService.createCustomer(any(CustomerDTO.class)))
                .thenThrow(new com.corebanking.exception.InvalidEmailException("The provided email address does not have a reachable mail server."));

        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "12/DAGANA(N)123456",
                    "email": "nonexistent@gmail.com",
                    "phone": "09123456789",
                    "dateOfBirth": "1995-05-20",
                    "address": "No. 123, Bogyoke Road, Yangon",
                    "customerType": "PERSONAL"
                }
                """;

        mockMvc.perform(post("/api/customers/personal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_EMAIL"))
                .andExpect(jsonPath("$.message").value("The provided email address does not have a reachable mail server."));
    }

    @Test
    @DisplayName("testCreateCustomer_InvalidNrcFormat_Returns400ValidationError: Invalid NRC format is rejected by @Pattern")
    void testCreateCustomer_InvalidNrcFormat_Returns400ValidationError() throws Exception {
        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "99/INVALID(X)123",
                    "email": "yoon@gmail.com",
                    "phone": "09123456789",
                    "dateOfBirth": "1995-05-20",
                    "address": "No. 123, Bogyoke Road, Yangon",
                    "customerType": "PERSONAL"
                }
                """;

        mockMvc.perform(post("/api/customers/personal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message", containsString("Invalid Myanmar NRC format")));
    }

    @Test
    @DisplayName("testCreateCustomer_MissingDateOfBirth_Returns400ValidationError: Null dateOfBirth is rejected by @NotNull")
    void testCreateCustomer_MissingDateOfBirth_Returns400ValidationError() throws Exception {
        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "12/DAGANA(N)123456",
                    "email": "yoon@gmail.com",
                    "phone": "09123456789",
                    "address": "No. 123, Bogyoke Road, Yangon",
                    "customerType": "PERSONAL"
                }
                """;

        mockMvc.perform(post("/api/customers/personal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message", containsString("Date of birth is required")));
    }

    @Test
    @DisplayName("testCreateCustomer_FutureDateOfBirth_Returns400ValidationError: Future dateOfBirth is rejected by @Past")
    void testCreateCustomer_FutureDateOfBirth_Returns400ValidationError() throws Exception {
        String jsonPayload = """
                {
                    "fullName": "Daw Yoon",
                    "nrc": "12/DAGANA(N)123456",
                    "email": "yoon@gmail.com",
                    "phone": "09123456789",
                    "dateOfBirth": "2099-01-01",
                    "address": "No. 123, Bogyoke Road, Yangon",
                    "customerType": "PERSONAL"
                }
                """;

        mockMvc.perform(post("/api/customers/personal")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.message", containsString("Date of birth must be a past date")));
    }

    @Test
    @DisplayName("testUpdateCustomerProfile_Success: PUT /api/customers/{code} updates profile and returns 200 OK")
    void testUpdateCustomerProfile_Success() throws Exception {
        String customerCode = "CUST-20261102-1001";
        doNothing().when(customerService).updateCustomerProfile(eq(customerCode), any(CustomerUpdateDTO.class), nullable(StaffUsers.class));

        String jsonPayload = """
                {
                    "phone": "09123456789",
                    "occupation": "Software Architect",
                    "dateOfBirth": "1990-01-01"
                }
                """;

        mockMvc.perform(put("/api/customers/" + customerCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUCCESS"))
                .andExpect(jsonPath("$.customerCode").value(customerCode))
                .andExpect(jsonPath("$.message").value("Customer updated successfully"));
    }

    @Test
    @DisplayName("testUpdateCustomerProfile_InvalidPhone_Returns400: PUT with invalid phone format returns 400 Bad Request")
    void testUpdateCustomerProfile_InvalidPhone_Returns400() throws Exception {
        String customerCode = "CUST-20261102-1001";

        // Invalid phone with letters
        String jsonPayload = """
                {
                    "phone": "invalid-phone-123"
                }
                """;

        mockMvc.perform(put("/api/customers/" + customerCode)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(jsonPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"));
    }
}
