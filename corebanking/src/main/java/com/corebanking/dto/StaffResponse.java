package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class StaffResponse {

    private Long staff_id;
    private String staff_no;
    private String username;
    private String full_name;
    private String email;
    private String phone;
    private Boolean must_change_password;
    private String status;
    private LocalDateTime last_login_at;
    private LocalDateTime created_at;
    private LocalDateTime updated_at;
}