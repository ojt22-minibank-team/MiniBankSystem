package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AdminDashboardResponseDTO {

    private long totalStaff;
    private long activeStaff;

    private long totalCustomers;

    private long totalAccounts;
    private long activeAccounts;

    private long totalParameters;

    private long activeAnnouncements;

    private List<StaffResponse> recentStaff;
    private List<AnnouncementResponse> recentAnnouncements;
}
