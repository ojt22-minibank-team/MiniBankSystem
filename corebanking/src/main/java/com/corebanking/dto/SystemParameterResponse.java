package com.corebanking.dto;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Builder
public class SystemParameterResponse {

    private Integer parameterId;

    private String parameterKey;

    private String parameterValue;

    private String description;

    private UUID updatedById;

    private String updatedByType;

    private LocalDateTime updatedAt;
}