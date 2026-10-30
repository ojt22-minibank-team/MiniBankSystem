package com.corebanking.dto;

import com.corebanking.entity.enums.StaffUserStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StaffResponse {

    private UUID staffId;
    private String staffNo;
    private String username;
    private String fullName;
    private String email;
    private String phone;
    private boolean mustChangePassword;
    private StaffUserStatus status;
    private LocalDateTime lastLoginAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Role information
    private Integer roleId;
    private String roleCode;
    private String roleName;

    public StaffResponse(
            UUID staffId,
            String staffNo,
            String username,
            String fullName,
            String email,
            String phone,
            boolean mustChangePassword,
            StaffUserStatus status,
            LocalDateTime lastLoginAt,
            LocalDateTime createdAt,
            LocalDateTime updatedAt
    ) {
        this.staffId = staffId;
        this.staffNo = staffNo;
        this.username = username;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.mustChangePassword = mustChangePassword;
        this.status = status;
        this.lastLoginAt = lastLoginAt;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }
}
