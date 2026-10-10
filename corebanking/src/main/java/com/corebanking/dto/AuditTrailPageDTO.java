package com.corebanking.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuditTrailPageDTO {
    private List<AuditTrailLogDTO> logs;
    private long totalCount;
    private int page;
    private int pageSize;
    private int totalPages;
}
