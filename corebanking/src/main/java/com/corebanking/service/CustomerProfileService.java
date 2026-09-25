package com.corebanking.service;

import com.corebanking.dto.CustomerProfileResponseDTO;
import com.corebanking.dto.CustomerProfileUpdateDTO;
import com.corebanking.entity.CompanyInfo;
import com.corebanking.entity.Customers;
import com.corebanking.entity.PersonalInfo;
import com.corebanking.repository.CompanyInfoRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.PersonalInfoRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CustomerProfileService {

    private final CustomerRepository customerRepository;
    private final PersonalInfoRepository personalInfoRepository;
    private final CompanyInfoRepository companyInfoRepository;
    private final CloudinaryService cloudinaryService;

    @Transactional(readOnly = true)
    public CustomerProfileResponseDTO getMyProfile() {

        UUID customerId = getAuthenticatedCustomerId();

        Customers customer = customerRepository
                .findById(customerId)
                .orElseThrow(() ->
                        new RuntimeException("Customer not found."));

        PersonalInfo personalInfo =
                personalInfoRepository.findById(customerId)
                        .orElse(null);

        CompanyInfo companyInfo =
                companyInfoRepository.findById(customerId)
                        .orElse(null);

        return mapToResponse(
                customer,
                personalInfo,
                companyInfo
        );
    }

    @Transactional
    public CustomerProfileResponseDTO updateMyProfile(
            CustomerProfileUpdateDTO dto) {

        UUID customerId = getAuthenticatedCustomerId();

        Customers customer = customerRepository
                .findById(customerId)
                .orElseThrow(() ->
                        new RuntimeException("Customer not found."));

        PersonalInfo personalInfo =
                personalInfoRepository.findById(customerId)
                        .orElse(null);

        CompanyInfo companyInfo =
                companyInfoRepository.findById(customerId)
                        .orElse(null);

        if (personalInfo != null) {

            if (dto.getEmail() != null) {
                personalInfo.setEmail(dto.getEmail());
            }

            if (dto.getPhone() != null) {
                personalInfo.setPhone(dto.getPhone());
            }

            if (dto.getOccupation() != null) {
                personalInfo.setOccupation(dto.getOccupation());
            }

            updatePersonalAddress(
                    personalInfo,
                    dto
            );

            personalInfoRepository.save(personalInfo);
        }

        if (companyInfo != null) {

            if (dto.getCompanyPhone() != null) {
                companyInfo.setCompanyPhone(
                        dto.getCompanyPhone()
                );
            }

            if (dto.getCompanyEmail() != null) {
                companyInfo.setCompanyEmail(
                        dto.getCompanyEmail()
                );
            }

            updateCompanyAddress(
                    companyInfo,
                    dto
            );

            companyInfoRepository.save(companyInfo);
        }

        return getMyProfile();
    }

    @Transactional
    public CustomerProfileResponseDTO updateProfileImage(
            MultipartFile file) {

        UUID customerId = getAuthenticatedCustomerId();

        Customers customer = customerRepository
                .findById(customerId)
                .orElseThrow(() ->
                        new RuntimeException("Customer not found."));

        PersonalInfo personalInfo =
                personalInfoRepository.findById(customerId)
                        .orElse(null);

        CompanyInfo companyInfo =
                companyInfoRepository.findById(customerId)
                        .orElse(null);

        String imageUrl =
                cloudinaryService.uploadProfileImage(
                        file,
                        customerId.toString()
                );

        if (personalInfo != null) {

            personalInfo.setProfileImageUrl(imageUrl);

            personalInfoRepository.save(personalInfo);
        }

        if (companyInfo != null) {

            companyInfo.setProfileImageUrl(imageUrl);

            companyInfoRepository.save(companyInfo);
        }

        return getMyProfile();
    }

    private void updatePersonalAddress(
            PersonalInfo personalInfo,
            CustomerProfileUpdateDTO dto) {

        if (dto.getAddress() != null) {
            personalInfo.setAddress(dto.getAddress());
        }

        if (dto.getCity() != null) {
            personalInfo.setCity(dto.getCity());
        }

        if (dto.getStateRegion() != null) {
            personalInfo.setStateRegion(
                    dto.getStateRegion()
            );
        }

        if (dto.getCountry() != null) {
            personalInfo.setCountry(
                    dto.getCountry()
            );
        }
    }

    private void updateCompanyAddress(
            CompanyInfo companyInfo,
            CustomerProfileUpdateDTO dto) {

        if (dto.getAddress() != null) {
            companyInfo.setAddress(dto.getAddress());
        }

        if (dto.getCity() != null) {
            companyInfo.setCity(dto.getCity());
        }

        if (dto.getStateRegion() != null) {
            companyInfo.setStateRegion(
                    dto.getStateRegion()
            );
        }

        if (dto.getCountry() != null) {
            companyInfo.setCountry(
                    dto.getCountry()
            );
        }
    }

    private CustomerProfileResponseDTO mapToResponse(
            Customers customer,
            PersonalInfo personalInfo,
            CompanyInfo companyInfo) {

        CustomerProfileResponseDTO dto =
                CustomerProfileResponseDTO.builder()
                        .customerCode(
                                customer.getCustomerCode()
                        )
                        .customerType(
                                customer.getCustomerType() != null
                                        ? customer.getCustomerType().name()
                                        : null
                        )
                        .status(
                                customer.getStatus() != null
                                        ? customer.getStatus().name()
                                        : null
                        )
                        .build();

        if (personalInfo != null) {

            dto.setFirstName(
                    personalInfo.getFirstName()
            );

            dto.setLastName(
                    personalInfo.getLastName()
            );

            dto.setDateOfBirth(
                    personalInfo.getDateOfBirth()
            );

            dto.setGender(
                    personalInfo.getGender() != null
                            ? personalInfo.getGender().name()
                            : null
            );

            dto.setNrc(
                    personalInfo.getNrc()
            );

            dto.setPassportNumber(
                    personalInfo.getPassportNumber()
            );

            dto.setEmail(
                    personalInfo.getEmail()
            );

            dto.setPhone(
                    personalInfo.getPhone()
            );

            dto.setOccupation(
                    personalInfo.getOccupation()
            );

            dto.setAddress(
                    personalInfo.getAddress()
            );

            dto.setCity(
                    personalInfo.getCity()
            );

            dto.setStateRegion(
                    personalInfo.getStateRegion()
            );

            dto.setCountry(
                    personalInfo.getCountry()
            );

            dto.setProfileImageUrl(
                    personalInfo.getProfileImageUrl()
            );
        }

        if (companyInfo != null) {

            dto.setCompanyName(
                    companyInfo.getCompanyName()
            );

            dto.setRegistrationNumber(
                    companyInfo.getRegistrationNumber()
            );

            dto.setTaxId(
                    companyInfo.getTaxId()
            );

            dto.setBusinessType(
                    companyInfo.getBusinessType()
            );

            dto.setIncorporationDate(
                    companyInfo.getIncorporationDate()
            );

            dto.setCompanyPhone(
                    companyInfo.getCompanyPhone()
            );

            dto.setCompanyEmail(
                    companyInfo.getCompanyEmail()
            );

            dto.setAddress(
                    companyInfo.getAddress()
            );

            dto.setCity(
                    companyInfo.getCity()
            );

            dto.setStateRegion(
                    companyInfo.getStateRegion()
            );

            dto.setCountry(
                    companyInfo.getCountry()
            );

            dto.setProfileImageUrl(
                    companyInfo.getProfileImageUrl()
            );
        }

        return dto;
    }

    private UUID getAuthenticatedCustomerId() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        if (authentication == null ||
                !authentication.isAuthenticated()) {

            throw new RuntimeException(
                    "Customer authentication is required."
            );
        }

        if (!authentication.getAuthorities()
                .stream()
                .anyMatch(authority ->
                        authority.getAuthority()
                                .equals("ROLE_CUSTOMER"))) {

            throw new RuntimeException(
                    "Customer access is required."
            );
        }

        try {

            return UUID.fromString(
                    authentication.getName()
            );

        } catch (IllegalArgumentException e) {

            throw new RuntimeException(
                    "Invalid customer authentication."
            );
        }
    }
}