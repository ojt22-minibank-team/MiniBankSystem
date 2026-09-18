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
public class AnnouncementResponse {

    private Long announcement_id;

    private String title;

    private String message;

    private String audience;

    private Boolean is_active;

    private LocalDateTime starts_at;

    private LocalDateTime ends_at;

    private Long created_by_staff_id;

    private LocalDateTime created_at;

    private LocalDateTime updated_at;
}