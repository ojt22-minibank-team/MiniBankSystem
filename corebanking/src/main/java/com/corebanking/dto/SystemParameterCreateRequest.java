package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SystemParameterCreateRequest {

    @NotBlank(message = "Parameter key is required")
    @Size(max = 64, message = "Parameter key must not exceed 64 characters")
    private String parameterKey;

    @NotBlank(message = "Parameter value is required")
    @Size(max = 255, message = "Parameter value must not exceed 255 characters")
    private String parameterValue;

    @Size(max = 255, message = "Description must not exceed 255 characters")
    private String description;
}