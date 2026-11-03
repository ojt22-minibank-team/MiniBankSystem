package com.corebanking.controller;

import com.corebanking.dto.CustomerDTO;
import com.corebanking.dto.CustomerDetailResponseDTO;
import com.corebanking.dto.CustomerResponseDTO;
import com.corebanking.dto.CustomerUpdateDTO;
import com.corebanking.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    
    @PostMapping
    public ResponseEntity<CustomerResponseDTO> createCustomer(@Valid @RequestBody CustomerDTO customerDto) {
        CustomerResponseDTO response = customerService.createCustomer(customerDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/personal")
    public ResponseEntity<CustomerResponseDTO> createPersonalCustomer(@Valid @RequestBody CustomerDTO customerDto) {
        if (customerDto.getCustomerType() == null || customerDto.getCustomerType().isBlank()) {
            customerDto.setCustomerType("PERSONAL");
        }
        CustomerResponseDTO response = customerService.createCustomer(customerDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/company")
    public ResponseEntity<CustomerResponseDTO> createCompanyCustomer(@Valid @RequestBody CustomerDTO customerDto) {
        if (customerDto.getCustomerType() == null || customerDto.getCustomerType().isBlank()) {
            customerDto.setCustomerType("COMPANY");
        }
        CustomerResponseDTO response = customerService.createCustomer(customerDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    
    @GetMapping
    public ResponseEntity<List<CustomerResponseDTO>> getAllCustomers() {
        List<CustomerResponseDTO> customers = customerService.getAllCustomers();
        return ResponseEntity.ok(customers);
    }

    
    @GetMapping("/{customerCode}")
    public ResponseEntity<CustomerDetailResponseDTO> getCustomerByCode(@PathVariable String customerCode) {
        CustomerDetailResponseDTO customer = customerService.getCustomerByCode(customerCode);
        return ResponseEntity.ok(customer);
    }

    
    @PutMapping("/{customerCode}")
    public ResponseEntity<?> updateCustomer(
            @PathVariable String customerCode,
            @RequestHeader(value = "X-Staff-Id", defaultValue = "1") Long staffId,
            @Valid @RequestBody CustomerUpdateDTO updateDto) {

        customerService.updateCustomer(customerCode, updateDto, staffId);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Customer updated successfully",
                "customerCode", customerCode
        ));
    }
    
    @PatchMapping("/{customerCode}/kyc-status")
    public ResponseEntity<?> updateKycStatus(
            @PathVariable String customerCode,
            @RequestBody Map<String, String> payload) {
        
        String newStatus = payload.get("status"); // "ACTIVE" (VERIFIED) သို့မဟုတ် "REJECTED"
        customerService.updateCustomerKycStatus(customerCode, newStatus);
        
        return ResponseEntity.ok(Map.of(
            "message", "Customer KYC status updated successfully",
            "customerCode", customerCode,
            "status", newStatus
        ));
    }
}