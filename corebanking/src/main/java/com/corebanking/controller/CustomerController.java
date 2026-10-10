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
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    /**
     * ၁။ Customer အသစ် ဖန်တီးသော Endpoint
     * POST http://localhost:8080/api/customers
     */
    @PostMapping
    public ResponseEntity<CustomerResponseDTO> createCustomer(@Valid @RequestBody CustomerDTO customerDto) {
        CustomerResponseDTO response = customerService.createCustomer(customerDto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * ၂။ Customer စာရင်းအားလုံး ရယူသော Endpoint
     * GET http://localhost:8080/api/customers
     */
    @GetMapping
    public ResponseEntity<List<CustomerResponseDTO>> getAllCustomers() {
        List<CustomerResponseDTO> customers = customerService.getAllCustomers();
        return ResponseEntity.ok(customers);
    }

    /**
     * ၃။ Customer Code ဖြင့် တစ်ဦးချင်း အသေးစိတ် အချက်အလက် စုံစမ်းသော Endpoint
     * GET http://localhost:8080/api/customers/{customerCode}
     */
    @GetMapping("/{customerCode}")
    public ResponseEntity<CustomerDetailResponseDTO> getCustomerByCode(@PathVariable String customerCode) {
        CustomerDetailResponseDTO customer = customerService.getCustomerByCode(customerCode);
        return ResponseEntity.ok(customer);
    }

    /**
     * ၄။ Customer အချက်အလက် ပြင်ဆင်မွမ်းမံသော Endpoint
     * PUT http://localhost:8080/api/customers/{customerCode}
     */
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
}