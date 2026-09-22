package com.corebanking.dto;

import com.corebanking.entity.enums.AnnouncementAudience;
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

    private AnnouncementAudience audience;

    private LocalDateTime startsAt;

    private LocalDateTime endsAt;
}