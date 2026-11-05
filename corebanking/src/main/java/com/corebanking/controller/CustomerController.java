package com.corebanking.controller;

import com.corebanking.dto.CustomerDTO;
import com.corebanking.dto.CustomerDetailResponseDTO;
import com.corebanking.dto.CustomerResponseDTO;
import com.corebanking.dto.CustomerUpdateDTO;
import com.corebanking.entity.StaffUsers;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.service.CustomerService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/customers")
@CrossOrigin(origins = {"${app.frontend.base-url:http://localhost:5173}", "http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174"})

public class CustomerController {

    private final CustomerService customerService;
    private final StaffUsersRepository staffUsersRepository; // Changed to final

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

    /**
     * Endpoint to update specific customer profile details (Phone, Occupation, Date of Birth).
     * Restricted to authenticated staff with either TELLER or ADMIN roles.
     * Extracts the acting staff member and persists audit logs on modification.
     */
    @PutMapping("/{customerCode}")
    @PreAuthorize("hasAnyRole('TELLER', 'ADMIN')")
    public ResponseEntity<?> updateCustomerProfile(
            @PathVariable String customerCode,
            @RequestHeader(value = "X-Staff-Id", required = false) Long headerStaffId,
            Authentication authentication,
            @Valid @RequestBody CustomerUpdateDTO dto) {

        StaffUsers staff = resolveStaffUser(authentication);
        customerService.updateCustomerProfile(customerCode, dto, staff);

        return ResponseEntity.ok(Map.of(
                "status", "SUCCESS",
                "message", "Customer updated successfully",
                "customerCode", customerCode
        ));
    }

    /**
     * Backward-compatible updateCustomer method for direct programmatic callers.
     */
    public ResponseEntity<?> updateCustomer(
            String customerCode,
            Long staffId,
            CustomerUpdateDTO updateDto) {
        return updateCustomerProfile(customerCode, staffId, null, updateDto);
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

    /**
     * Resolves authenticated StaffUsers entity from SecurityContext or fallback.
     */
    private StaffUsers resolveStaffUser(Authentication authentication) {
        if (authentication != null && authentication.isAuthenticated() && !"anonymousUser".equalsIgnoreCase(authentication.getName())) {
            String name = authentication.getName();
            if (staffUsersRepository != null && name != null && !name.isBlank()) {
                Optional<StaffUsers> staffOpt = staffUsersRepository.findByUsername(name);
                if (staffOpt.isPresent()) {
                    return staffOpt.get();
                }
                try {
                    UUID uuid = UUID.fromString(name);
                    Optional<StaffUsers> staffById = staffUsersRepository.findById(uuid);
                    if (staffById.isPresent()) {
                        return staffById.get();
                    }
                } catch (Exception ignored) {}
            }
        }
        if (staffUsersRepository != null) {
            return staffUsersRepository.findByUsername("admin.nay")
                    .or(() -> staffUsersRepository.findByUsername("teller.zin"))
                    .or(() -> staffUsersRepository.findByUsername("admin"))
                    .or(() -> staffUsersRepository.findFirstByStatus(com.corebanking.entity.enums.StaffUserStatus.ACTIVE))
                    .orElseGet(() -> staffUsersRepository.findAll().stream().findFirst().orElse(null));
        }
        return null;
    }
}
