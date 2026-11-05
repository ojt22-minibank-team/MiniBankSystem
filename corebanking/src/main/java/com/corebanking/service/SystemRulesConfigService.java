package com.corebanking.service;

import com.corebanking.dto.FeeScheduleCreateRequest;
import com.corebanking.dto.FeeScheduleResponse;
import com.corebanking.dto.FeeScheduleUpdateRequest;
import com.corebanking.dto.SystemParameterCreateRequest;
import com.corebanking.dto.SystemParameterResponse;
import com.corebanking.dto.SystemParameterUpdateRequest;
import com.corebanking.entity.FeeSchedules;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.SystemParameters;
import com.corebanking.entity.enums.UpdatedByType;
import com.corebanking.repository.FeeSchedulesRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.repository.SystemParametersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class SystemRulesConfigService {

    private final SystemParametersRepository systemParametersRepository;
    private final FeeSchedulesRepository feeSchedulesRepository;
    private final StaffUsersRepository staffUsersRepository;


    // =========================================================
    // SYSTEM PARAMETERS
    // =========================================================

    public SystemParameterResponse createParameter(
            SystemParameterCreateRequest request) {

        String key = request.getParameterKey().trim();

        if (systemParametersRepository.existsByParameterKeyIgnoreCase(key)) {
            throw new RuntimeException(
                    "System parameter already exists: " + key
            );
        }

        StaffUsers currentStaff = getCurrentStaff();

        SystemParameters parameter = SystemParameters.builder()
                .parameterKey(key)
                .parameterValue(request.getParameterValue().trim())
                .description(request.getDescription())
                .updatedByStaff(currentStaff)
                .updatedByType(UpdatedByType.STAFF)
                .updatedById(currentStaff.getStaffId())
                .build();

        SystemParameters saved =
                systemParametersRepository.save(parameter);

        return toParameterResponse(saved);
    }


    @Transactional(readOnly = true)
    public List<SystemParameterResponse> getAllParameters() {

        return systemParametersRepository.findAll()
                .stream()
                .map(this::toParameterResponse)
                .toList();
    }


    @Transactional(readOnly = true)
    public SystemParameterResponse getParameterByKey(
            String parameterKey) {

        SystemParameters parameter =
                systemParametersRepository
                        .findByParameterKeyIgnoreCase(parameterKey)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "System parameter not found: "
                                                + parameterKey
                                ));

        return toParameterResponse(parameter);
    }


    public SystemParameterResponse updateParameter(
            String parameterKey,
            SystemParameterUpdateRequest request) {

        SystemParameters parameter =
                systemParametersRepository
                        .findByParameterKeyIgnoreCase(parameterKey)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "System parameter not found: "
                                                + parameterKey
                                ));

        StaffUsers currentStaff = getCurrentStaff();

        parameter.setParameterValue(
                request.getParameterValue().trim()
        );

        parameter.setDescription(request.getDescription());

        parameter.setUpdatedByStaff(currentStaff);
        parameter.setUpdatedByType(UpdatedByType.STAFF);
        parameter.setUpdatedById(currentStaff.getStaffId());

        SystemParameters updated =
                systemParametersRepository.save(parameter);

        return toParameterResponse(updated);
    }


    // =========================================================
    // FEE SCHEDULES
    // =========================================================

    public FeeScheduleResponse createFee(
            FeeScheduleCreateRequest request) {

        String feeCode = request.getFeeCode().trim();

        if (feeSchedulesRepository.existsByFeeCodeIgnoreCase(feeCode)) {
            throw new RuntimeException(
                    "Fee code already exists: " + feeCode
            );
        }

        validateFeeValues(
                request.getFeeValue(),
                request.getMinimumFee(),
                request.getMaximumFee(),
                request.getActiveFrom(),
                request.getActiveUntil()
        );

        StaffUsers currentStaff = getCurrentStaff();

        FeeSchedules fee = FeeSchedules.builder()
                .feeCode(feeCode)
                .transactionType(request.getTransactionType())
                .feeType(request.getFeeType())
                .feeValue(request.getFeeValue())
                .minimumFee(request.getMinimumFee())
                .maximumFee(request.getMaximumFee())
                .currency(
                        request.getCurrency()
                                .trim()
                                .toUpperCase()
                )
                .activeFrom(request.getActiveFrom())
                .activeUntil(request.getActiveUntil())
                .isActive(true)
                .createdByStaff(currentStaff)
               
                .updatedByType(UpdatedByType.STAFF)
                .updatedById(currentStaff.getStaffId())
                .build();

        FeeSchedules saved =
                feeSchedulesRepository.save(fee);

        return toFeeResponse(saved);
    }


    @Transactional(readOnly = true)
    public List<FeeScheduleResponse> getAllFees() {

        return feeSchedulesRepository.findAll()
                .stream()
                .map(this::toFeeResponse)
                .toList();
    }


    @Transactional(readOnly = true)
    public FeeScheduleResponse getFeeById(Integer feeScheduleId) {

        FeeSchedules fee =
                feeSchedulesRepository.findById(feeScheduleId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Fee schedule not found: "
                                                + feeScheduleId
                                ));

        return toFeeResponse(fee);
    }


    public FeeScheduleResponse updateFee(
            Integer feeScheduleId,
            FeeScheduleUpdateRequest request) {

        FeeSchedules fee =
                feeSchedulesRepository.findById(feeScheduleId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Fee schedule not found: "
                                                + feeScheduleId
                                ));

        validateFeeValues(
                request.getFeeValue(),
                request.getMinimumFee(),
                request.getMaximumFee(),
                request.getActiveFrom(),
                request.getActiveUntil()
        );

        StaffUsers currentStaff = getCurrentStaff();

        fee.setTransactionType(request.getTransactionType());
        fee.setFeeType(request.getFeeType());
        fee.setFeeValue(request.getFeeValue());
        fee.setMinimumFee(request.getMinimumFee());
        fee.setMaximumFee(request.getMaximumFee());

        if (request.getCurrency() != null) {
            fee.setCurrency(
                    request.getCurrency()
                            .trim()
                            .toUpperCase()
            );
        }

        fee.setActiveFrom(request.getActiveFrom());
        fee.setActiveUntil(request.getActiveUntil());

        
        fee.setUpdatedByType(UpdatedByType.STAFF);
        fee.setUpdatedById(currentStaff.getStaffId());

        FeeSchedules updated =
                feeSchedulesRepository.save(fee);

        return toFeeResponse(updated);
    }


    public FeeScheduleResponse activateFee(
            Integer feeScheduleId) {

        FeeSchedules fee =
                feeSchedulesRepository.findById(feeScheduleId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Fee schedule not found: "
                                                + feeScheduleId
                                ));

        StaffUsers currentStaff = getCurrentStaff();

        fee.setActive(true);
        
        fee.setUpdatedByType(UpdatedByType.STAFF);
        fee.setUpdatedById(currentStaff.getStaffId());

        return toFeeResponse(
                feeSchedulesRepository.save(fee)
        );
    }


    public FeeScheduleResponse deactivateFee(
            Integer feeScheduleId) {

        FeeSchedules fee =
                feeSchedulesRepository.findById(feeScheduleId)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Fee schedule not found: "
                                                + feeScheduleId
                                ));

        StaffUsers currentStaff = getCurrentStaff();

        fee.setActive(false);
        fee.setUpdatedByType(UpdatedByType.STAFF);
        fee.setUpdatedById(currentStaff.getStaffId());

        return toFeeResponse(
                feeSchedulesRepository.save(fee)
        );
    }


    // =========================================================
    // VALIDATION
    // =========================================================

    private void validateFeeValues(
            BigDecimal feeValue,
            BigDecimal minimumFee,
            BigDecimal maximumFee,
            java.time.LocalDateTime activeFrom,
            java.time.LocalDateTime activeUntil) {

        if (feeValue == null || feeValue.compareTo(BigDecimal.ZERO) < 0) {
            throw new RuntimeException(
                    "Fee value cannot be negative"
            );
        }

        if (minimumFee != null
                && minimumFee.compareTo(BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Minimum fee cannot be negative"
            );
        }

        if (maximumFee != null
                && maximumFee.compareTo(BigDecimal.ZERO) < 0) {

            throw new RuntimeException(
                    "Maximum fee cannot be negative"
            );
        }

        if (minimumFee != null
                && maximumFee != null
                && minimumFee.compareTo(maximumFee) > 0) {

            throw new RuntimeException(
                    "Minimum fee cannot be greater than maximum fee"
            );
        }

        if (activeUntil != null
                && activeFrom != null
                && activeUntil.isBefore(activeFrom)) {

            throw new RuntimeException(
                    "Active until cannot be before active from"
            );
        }
    }


    // =========================================================
    // CURRENT STAFF
    // =========================================================

    private StaffUsers getCurrentStaff() {

        String username =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication()
                        .getName();

        return staffUsersRepository
                .findByUsername(username)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Authenticated staff user not found"
                        ));
    }


    // =========================================================
    // RESPONSE MAPPING
    // =========================================================

    private SystemParameterResponse toParameterResponse(
            SystemParameters parameter) {

        return SystemParameterResponse.builder()
                .parameterId(parameter.getParameterId())
                .parameterKey(parameter.getParameterKey())
                .parameterValue(parameter.getParameterValue())
                .description(parameter.getDescription())
                .updatedById(parameter.getUpdatedById())
                .updatedByType(
                        parameter.getUpdatedByType() != null
                                ? parameter.getUpdatedByType().name()
                                : null
                )
                .updatedAt(parameter.getUpdatedAt())
                .build();
    }


    private FeeScheduleResponse toFeeResponse(
            FeeSchedules fee) {

        return FeeScheduleResponse.builder()
                .feeScheduleId(fee.getFeeScheduleId())
                .feeCode(fee.getFeeCode())
                .transactionType(fee.getTransactionType())
                .feeType(fee.getFeeType())
                .feeValue(fee.getFeeValue())
                .minimumFee(fee.getMinimumFee())
                .maximumFee(fee.getMaximumFee())
                .currency(fee.getCurrency())
                .activeFrom(fee.getActiveFrom())
                .activeUntil(fee.getActiveUntil())
                .active(fee.isActive())
                .createdByStaffId(
                        fee.getCreatedByStaff() != null
                                ? fee.getCreatedByStaff().getStaffId()
                                : null
                )
                .createdAt(fee.getCreatedAt())
                .updatedById(fee.getUpdatedById())
                .updatedByType(
                        fee.getUpdatedByType() != null
                                ? fee.getUpdatedByType().name()
                                : null
                )
                .updatedAt(fee.getUpdatedAt())
                .build();
    }
}