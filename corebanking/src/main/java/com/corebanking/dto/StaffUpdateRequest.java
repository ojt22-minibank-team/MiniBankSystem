package com.corebanking.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class StaffUpdateRequest {

    private String full_name;
    private String email;
    private String phone;
}