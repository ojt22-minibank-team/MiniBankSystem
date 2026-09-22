package com.corebanking.controller;

import com.corebanking.dto.CustomerDTO;
import com.corebanking.dto.CustomerResponseDTO;
import com.corebanking.service.CustomerService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/customers")
public class CustomerController {

    private final CustomerService customerService;

    // Constructor Injection ဖြင့် Service ကို ချိတ်ဆက်ခြင်း
    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    /**
     * Customer အသစ် ဖန်တီးသော Endpoint
     * Postman URL: POST http://localhost:8080/api/customers
     */
    @PostMapping
    public ResponseEntity<?> createCustomer(
            @RequestHeader(value = "X-Staff-Id", defaultValue = "1") Long staffId,
            @RequestBody CustomerDTO customerDto) {

        // Service မှ Customer Code ထုတ်ယူခြင်း
        String customerCode = customerService.createCustomer(customerDto, staffId);

        // Postman သို့ JSON တုံ့ပြန်မှု ပေးပို့ခြင်း
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "status", "SUCCESS",
                "message", "Customer registered successfully",
                "customerCode", customerCode
        ));
    }
    
 // ၂။ Customer List ရယူသော Endpoint (GET http://localhost:8080/api/customers)
    @GetMapping
    public ResponseEntity<List<CustomerResponseDTO>> getAllCustomers() {
        List<CustomerResponseDTO> customers = customerService.getAllCustomers();
        return ResponseEntity.ok(customers);
    }
    
 // ၃။ Customer Update Endpoint (PUT http://localhost:8080/api/customers/{customerCode})
    @PutMapping("/{customerCode}")
    public ResponseEntity<?> updateCustomer(
            @PathVariable String customerCode,
            @RequestHeader(value = "X-Staff-Id", defaultValue = "1") Long staffId,
            @RequestBody com.corebanking.dto.CustomerUpdateDTO updateDto) {

        customerService.updateCustomer(customerCode, updateDto, staffId);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Customer updated successfully",
                "customerCode", customerCode
        ));
    }
 // ၄။ Customer Code ဖြင့် Search ပြုလုပ်သော Endpoint (GET http://localhost:8080/api/customers/{customerCode})
    @GetMapping("/{customerCode}")
    public ResponseEntity<com.corebanking.dto.CustomerDetailResponseDTO> getCustomerByCode(@PathVariable String customerCode) {
        com.corebanking.dto.CustomerDetailResponseDTO customer = customerService.getCustomerByCode(customerCode);
        return ResponseEntity.ok(customer);
    }
}
