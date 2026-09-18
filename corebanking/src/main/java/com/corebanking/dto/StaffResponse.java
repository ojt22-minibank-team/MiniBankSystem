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
}