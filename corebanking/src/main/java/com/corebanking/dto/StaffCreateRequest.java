package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StaffCreateRequest {

    private String staff_no;
    private String username;
    private String full_name;
    private String email;
    private String phone;

    private String password;

    private Integer role_id;
}