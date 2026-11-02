package com.corebanking.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/** Corporate-only activity writes. Never merge a previously validated AuthSession. */
@Repository
@RequiredArgsConstructor
public class CusCorporateSessionActivityRepository {
    private final JdbcTemplate jdbc;

    @Transactional
    public int touchIfActive(String sessionUuid, long tokenVersion) {
        // Acquire the row before sampling time. Use the same application-local clock
        // as authoritative session validation, sampled after any lock wait.
        var rows = jdbc.queryForList("""
                SELECT session_uuid FROM auth_sessions
                 WHERE session_uuid = ? AND subject_type = 'CORPORATE_USER'
                 FOR UPDATE
                """, String.class, sessionUuid);
        if (rows.isEmpty()) return 0;
        LocalDateTime now = LocalDateTime.now();
        return jdbc.update("""
                UPDATE auth_sessions
                   SET last_seen_at = GREATEST(last_seen_at, ?),
                       updated_at = ?,
                       updated_by_type = 'CORPORATE_USER',
                       updated_by_id = corporate_user_id
                 WHERE session_uuid = ?
                   AND subject_type = 'CORPORATE_USER'
                   AND corporate_user_id IS NOT NULL
                   AND token_version_at_issue = ?
                   AND revoked_at IS NULL
                   AND refresh_expires_at > ?
                   AND TIMESTAMPADD(HOUR, 24, issued_at) > ?
                   AND TIMESTAMPADD(MINUTE, idle_timeout_minutes, last_seen_at) > ?
                """, now, now, sessionUuid, tokenVersion, now, now, now);
    }
}
