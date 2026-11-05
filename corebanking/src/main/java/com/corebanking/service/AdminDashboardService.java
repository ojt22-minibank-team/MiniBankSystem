package com.corebanking.service;

import com.corebanking.dto.AdminDashboardResponseDTO;
import com.corebanking.dto.AnnouncementResponse;
import com.corebanking.dto.StaffResponse;
import com.corebanking.entity.enums.AccountStatus;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.repository.AccountRepository;
import com.corebanking.repository.AnnouncementsRepository;
import com.corebanking.repository.CustomerRepository;
import com.corebanking.repository.StaffUsersRepository;
import com.corebanking.repository.SystemParametersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final StaffUsersRepository staffUsersRepository;
    private final CustomerRepository customerRepository;
    private final AccountRepository accountRepository;
    private final SystemParametersRepository systemParametersRepository;
    private final AnnouncementsRepository announcementsRepository;
    private final StaffManagementService staffManagementService;
    private final AnnouncementService announcementService;

    @Transactional(readOnly = true)
    public AdminDashboardResponseDTO getDashboardSummary() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean canViewStaff = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()) || "ROLE_AUDITOR".equals(a.getAuthority()));
        boolean isTeller = auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> "ROLE_TELLER".equals(a.getAuthority()));

        long totalStaff = 0;
        long activeStaff = 0;
        List<StaffResponse> recentStaff = Collections.emptyList();

        if (canViewStaff) {
            totalStaff = staffUsersRepository.count();
            activeStaff = staffUsersRepository.countByStatus(StaffUserStatus.ACTIVE);
            recentStaff = staffUsersRepository.findTop5ByOrderByCreatedAtDesc()
                    .stream()
                    .map(staffManagementService::toResponse)
                    .toList();
        }

        long totalCustomers = customerRepository.count();

        long totalAccounts = accountRepository.count();
        long activeAccounts = accountRepository.countByStatus(AccountStatus.ACTIVE);

        long totalParameters = systemParametersRepository.count();

        long activeAnnouncements = announcementsRepository.countByIsActiveTrue();

        List<AnnouncementResponse> recentAnnouncements;
        if (isTeller && !canViewStaff) {
            recentAnnouncements = announcementService.getActiveAnnouncements()
                    .stream()
                    .limit(4)
                    .toList();
        } else {
            recentAnnouncements = announcementsRepository.findTop4ByOrderByCreatedAtDesc()
                    .stream()
                    .map(announcementService::toResponse)
                    .toList();
        }

        return AdminDashboardResponseDTO.builder()
                .totalStaff(totalStaff)
                .activeStaff(activeStaff)
                .totalCustomers(totalCustomers)
                .totalAccounts(totalAccounts)
                .activeAccounts(activeAccounts)
                .totalParameters(totalParameters)
                .activeAnnouncements(activeAnnouncements)
                .recentStaff(recentStaff)
                .recentAnnouncements(recentAnnouncements)
                .build();
    }
}
