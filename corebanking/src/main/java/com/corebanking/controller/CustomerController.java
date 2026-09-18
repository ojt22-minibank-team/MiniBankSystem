package com.corebanking.controller;



import com.corebanking.dto.CustomerDTO;
import com.corebanking.service.CustomerService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/customers")
@Tag(name = "Customer Management", description = "Customer onboarding and lifecycle APIs")
public class CustomerController {

    private final CustomerService customerService;

    public CustomerController(CustomerService customerService) {
        this.customerService = customerService;
    }

    @PostMapping
    @Operation(summary = "Create Customer", description = "Creates a new PERSONAL or COMPANY customer linked with the active staff user.")
    public ResponseEntity<?> createCustomer(
            @RequestHeader(value = "X-Staff-Id", defaultValue = "1") Long staffId,
            @RequestBody CustomerDTO customerDto) {

        String customerCode = customerService.createCustomer(customerDto, staffId);

        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                "status", "SUCCESS",
                "message", "Customer registered successfully",
                "customerCode", customerCode
        ));
    }
}
