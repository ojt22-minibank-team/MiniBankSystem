package com.corebanking.service;

import com.corebanking.dto.BeneficiaryRequestDto;
import com.corebanking.dto.BeneficiaryResponseDto;
import com.corebanking.entity.Accounts;
import com.corebanking.entity.Beneficiaries;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.BeneficiaryRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class BeneficiaryService {

    private final BeneficiaryRepository beneficiaryRepository;
    private final AccountRepository accountRepository;

    @Transactional(readOnly = true)
    public List<BeneficiaryResponseDto> getMyBeneficiaries(String authCustomerId) {
        UUID customerId = UUID.fromString(authCustomerId);
        return beneficiaryRepository.findActiveByCustomerId(customerId)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Transactional
    public BeneficiaryResponseDto addBeneficiary(String authCustomerId, BeneficiaryRequestDto request) {
        UUID customerId = UUID.fromString(authCustomerId);

        // 1. Get customer accounts
        List<Accounts> ownerAccounts = accountRepository.findByCustomerCustomerId(customerId);
        if (ownerAccounts.isEmpty()) {
            throw new RuntimeException("No active account found for your profile.");
        }

        // 2. Select owner account
        Accounts ownerAccount;
        if (request.getOwnerAccountNumber() != null && !request.getOwnerAccountNumber().isBlank()) {
            ownerAccount = ownerAccounts.stream()
                    .filter(a -> a.getAccountNumber().equalsIgnoreCase(request.getOwnerAccountNumber().trim()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Source account not owned by customer: " + request.getOwnerAccountNumber()));
        } else {
            ownerAccount = ownerAccounts.stream()
                    .filter(a -> a.getStatus() == AccountStatus.ACTIVE)
                    .findFirst()
                    .orElse(ownerAccounts.get(0));
        }

        // 3. Find beneficiary account
        Accounts beneficiaryAccount = accountRepository.findByAccountNumber(request.getBeneficiaryAccountNumber().trim())
                .orElseThrow(() -> new RuntimeException("Beneficiary account not found: " + request.getBeneficiaryAccountNumber()));

        // 4. Validate not own account
        if (ownerAccount.getAccountNumber().equalsIgnoreCase(beneficiaryAccount.getAccountNumber())) {
            throw new RuntimeException("You cannot add your own account as a beneficiary.");
        }

        // 5. Determine nickname
        String beneficiaryName = (beneficiaryAccount.getCustomer() != null && beneficiaryAccount.getCustomer().getFullName() != null)
                ? beneficiaryAccount.getCustomer().getFullName()
                : "Beneficiary";

        String finalNickname = (request.getNickname() != null && !request.getNickname().isBlank())
                ? request.getNickname().trim()
                : beneficiaryName;

        // 6. Check existing record
        Optional<Beneficiaries> existing = beneficiaryRepository.findByOwnerAccountAndBeneficiaryAccount(ownerAccount, beneficiaryAccount);
        if (existing.isPresent()) {
            Beneficiaries b = existing.get();
            if (b.isActive()) {
                throw new RuntimeException("This account is already in your beneficiaries list.");
            }
            b.setActive(true);
            b.setNickname(finalNickname);
            b.setUpdatedAt(LocalDateTime.now());
            b.setUpdatedByType(UpdatedByType.CUSTOMER);
            b.setUpdatedById(customerId);
            return mapToDto(beneficiaryRepository.save(b));
        }

        // 7. Create new record
        Beneficiaries newBeneficiary = Beneficiaries.builder()
                .ownerAccount(ownerAccount)
                .beneficiaryAccount(beneficiaryAccount)
                .nickname(finalNickname)
                .isActive(true)
                .updatedByType(UpdatedByType.CUSTOMER)
                .updatedById(customerId)
                .build();

        return mapToDto(beneficiaryRepository.save(newBeneficiary));
    }

    @Transactional
    public void deleteBeneficiary(String authCustomerId, UUID beneficiaryId) {
        UUID customerId = UUID.fromString(authCustomerId);
        Beneficiaries b = beneficiaryRepository.findByIdAndCustomerId(beneficiaryId, customerId)
                .orElseThrow(() -> new RuntimeException("Beneficiary not found."));

        b.setActive(false);
        b.setUpdatedAt(LocalDateTime.now());
        b.setUpdatedByType(UpdatedByType.CUSTOMER);
        b.setUpdatedById(customerId);
        beneficiaryRepository.save(b);
    }

    private BeneficiaryResponseDto mapToDto(Beneficiaries b) {
        Accounts ba = b.getBeneficiaryAccount();
        String accountName = (ba != null && ba.getCustomer() != null && ba.getCustomer().getFullName() != null)
                ? ba.getCustomer().getFullName()
                : "N/A";

        return BeneficiaryResponseDto.builder()
                .beneficiaryId(b.getBeneficiaryId())
                .beneficiaryAccountNumber(ba != null ? ba.getAccountNumber() : null)
                .beneficiaryAccountName(accountName)
                .beneficiaryAccountType(ba != null && ba.getAccountType() != null ? ba.getAccountType().name() : null)
                .nickname(b.getNickname())
                .ownerAccountNumber(b.getOwnerAccount() != null ? b.getOwnerAccount().getAccountNumber() : null)
                .isActive(b.isActive())
                .createdAt(b.getCreatedAt())
                .build();
    }
}