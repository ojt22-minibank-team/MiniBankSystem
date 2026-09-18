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
public class AnnouncementCreateRequest {

    private String title;

    private String message;

    private String audience;

    private LocalDateTime starts_at;

    private LocalDateTime ends_at;
}