
package com.corebanking.dto;

import com.corebanking.entity.enums.AnnouncementAudience;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

    @NotBlank(message = "Title is required")
    @Size(max = 200, message = "Title must not exceed 200 characters")
    private String title;

    @NotBlank(message = "Message is required")
    private String message;

    @NotNull(message = "Audience is required")
    private AnnouncementAudience audience;

    @NotNull(message = "Start date and time are required")
    private LocalDateTime startsAt;

    private LocalDateTime endsAt;
}