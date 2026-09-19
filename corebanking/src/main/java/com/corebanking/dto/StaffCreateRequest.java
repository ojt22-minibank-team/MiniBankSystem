package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StaffCreateRequest {

    private String staffNo;
    private String username;
    private String fullName;
    private String email;
    private String phone;

    private String password;

    private Integer roleId;
}