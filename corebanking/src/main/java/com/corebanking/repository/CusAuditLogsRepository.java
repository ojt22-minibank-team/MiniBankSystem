package com.corebanking.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.corebanking.entity.AuditLogs;

public interface CusAuditLogsRepository
        extends JpaRepository<AuditLogs, Long> {
}
