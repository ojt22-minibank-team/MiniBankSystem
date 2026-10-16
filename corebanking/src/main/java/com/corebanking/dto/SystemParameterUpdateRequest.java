package com.corebanking.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class SystemParameterUpdateRequest {

    @NotBlank(message = "Parameter value is required")
    @Size(max = 255, message = "Parameter value must not exceed 255 characters")
    private String parameterValue;

    @Size(max = 255, message = "Description must not exceed 255 characters")
    private String description;
}