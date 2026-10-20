package com.corebanking.repository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfSystemProperty;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DataSourceTransactionManager;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.transaction.support.TransactionTemplate;

import java.sql.Connection;
import java.sql.Timestamp;
import java.util.List;
import java.util.concurrent.*;

import static org.junit.jupiter.api.Assertions.*;

/** Actual MySQL/InnoDB, two independent connections, production Corporate SQL.
 * Requires an explicitly supplied loopback URL to the disposable test database.
 * No Spring Boot context, application properties, JPA entities, or real customer data.
 */
@EnabledIfSystemProperty(named = "corporate.test.jdbcUrl",
        matches = "jdbc:mysql://127\\.0\\.0\\.1:[0-9]+/corporate_session_race_test\\?.*")
class CusCorporateSessionActivityConcurrencyTest {
    private static final String SID = "11111111-1111-4111-8111-111111111111";
    private DriverManagerDataSource dataSource;
    private JdbcTemplate jdbc;
    private TransactionTemplate transactions;

    @BeforeEach
    void isolatedDatabase() {
        dataSource = new DriverManagerDataSource(System.getProperty("corporate.test.jdbcUrl"), "root", "test-only-corporate-race");
        jdbc = new JdbcTemplate(dataSource);
        transactions = new TransactionTemplate(new DataSourceTransactionManager(dataSource));
        jdbc.execute("""
                CREATE TABLE IF NOT EXISTS auth_sessions (
                  session_uuid VARCHAR(36) PRIMARY KEY, subject_type VARCHAR(32),
                  corporate_user_id BINARY(16), token_version_at_issue BIGINT,
                  refresh_token_hash VARCHAR(255), issued_at DATETIME(6), last_seen_at DATETIME(6),
                  refresh_expires_at DATETIME(6), idle_timeout_minutes INT,
                  revoked_at DATETIME(6), revoke_reason VARCHAR(255),
                  updated_at DATETIME(6), updated_by_type VARCHAR(32), updated_by_id BINARY(16)
                ) ENGINE=InnoDB
                """);
        jdbc.update("DELETE FROM auth_sessions");
        jdbc.update("""
                INSERT INTO auth_sessions VALUES (?, 'CORPORATE_USER', UNHEX(REPEAT('11', 16)), 7, 'original-hash',
                  CURRENT_TIMESTAMP(6) - INTERVAL 1 HOUR, CURRENT_TIMESTAMP(6) - INTERVAL 1 MINUTE,
                  CURRENT_TIMESTAMP(6) + INTERVAL 23 HOUR, 5, NULL, NULL,
                  CURRENT_TIMESTAMP(6) - INTERVAL 1 MINUTE, 'CORPORATE_USER', UNHEX(REPEAT('11',16)))
                """, SID);
    }

    private int touch(JdbcTemplate template) {
        return transactions.execute(status -> new CusCorporateSessionActivityRepository(template).touchIfActive(SID, 7L));
    }

    @Test
    void activityChangesOnlyActivityMetadata() {
        var before = jdbc.queryForMap("SELECT * FROM auth_sessions WHERE session_uuid = ?", SID);
        assertEquals(1, touch(jdbc));
        var after = jdbc.queryForMap("SELECT * FROM auth_sessions WHERE session_uuid = ?", SID);
        for (String key : List.of("issued_at", "refresh_expires_at", "refresh_token_hash", "token_version_at_issue", "revoked_at", "revoke_reason"))
            assertEquals(before.get(key), after.get(key), key);
        assertTrue(((java.time.LocalDateTime) after.get("last_seen_at")).isAfter((java.time.LocalDateTime) before.get("last_seen_at")));
        assertEquals("CORPORATE_USER", after.get("updated_by_type"));
        assertArrayEquals((byte[]) after.get("corporate_user_id"), (byte[]) after.get("updated_by_id"));
    }

    @Test
    void revokedSessionCannotBeReactivatedByWaitingActivity() throws Exception {
        waitingActivityAfter("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP(6), revoke_reason = 'LOGOUT' WHERE session_uuid = ?", 0);
        assertNotNull(jdbc.queryForObject("SELECT revoked_at FROM auth_sessions", Timestamp.class));
        assertEquals("LOGOUT", jdbc.queryForObject("SELECT revoke_reason FROM auth_sessions", String.class));
    }

    @Test
    void waitingActivityCannotOverwriteRotatedHash() throws Exception {
        waitingActivityAfter("UPDATE auth_sessions SET refresh_token_hash = 'rotated-hash', last_seen_at = CURRENT_TIMESTAMP(6) WHERE session_uuid = ?", 1);
        assertEquals("rotated-hash", jdbc.queryForObject("SELECT refresh_token_hash FROM auth_sessions", String.class));
    }

    @Test
    void expirationWhileWaitingForRowLockIsRechecked() throws Exception {
        waitingActivityAfter("UPDATE auth_sessions SET refresh_expires_at = CURRENT_TIMESTAMP(6) - INTERVAL 1 MICROSECOND WHERE session_uuid = ?", 0);
        assertEquals("original-hash", jdbc.queryForObject("SELECT refresh_token_hash FROM auth_sessions", String.class));
    }

    @Test
    void idleAndAbsoluteExpirationCannotUpdateActivity() {
        Timestamp before = jdbc.queryForObject("SELECT last_seen_at FROM auth_sessions", Timestamp.class);
        jdbc.update("UPDATE auth_sessions SET issued_at = CURRENT_TIMESTAMP(6) - INTERVAL 24 HOUR");
        assertEquals(0, touch(jdbc));
        assertEquals(before, jdbc.queryForObject("SELECT last_seen_at FROM auth_sessions", Timestamp.class));
        jdbc.update("UPDATE auth_sessions SET issued_at = CURRENT_TIMESTAMP(6) - INTERVAL 1 HOUR, last_seen_at = CURRENT_TIMESTAMP(6) - INTERVAL 5 MINUTE");
        before = jdbc.queryForObject("SELECT last_seen_at FROM auth_sessions", Timestamp.class);
        assertEquals(0, touch(jdbc));
        assertEquals(before, jdbc.queryForObject("SELECT last_seen_at FROM auth_sessions", Timestamp.class));
    }

    @Test
    void individualRowsAndVersionMismatchesAreNeverTouched() {
        jdbc.update("UPDATE auth_sessions SET subject_type = 'CUSTOMER'");
        assertEquals(0, touch(jdbc));
        jdbc.update("UPDATE auth_sessions SET subject_type = 'CORPORATE_USER', token_version_at_issue = 8");
        assertEquals(0, touch(jdbc));
    }

    @Test
    void logoutAfterActivityCommitRemainsRevoked() throws Exception {
        writeAfterActivity("UPDATE auth_sessions SET revoked_at = CURRENT_TIMESTAMP(6), revoke_reason = 'LOGOUT' WHERE session_uuid = ?");
        assertNotNull(jdbc.queryForObject("SELECT revoked_at FROM auth_sessions", Timestamp.class));
        assertEquals(0, touch(jdbc));
    }

    @Test
    void rotationAfterActivityCommitPreservesNewHash() throws Exception {
        writeAfterActivity("UPDATE auth_sessions SET refresh_token_hash = 'newer-hash' WHERE session_uuid = ? AND refresh_token_hash = 'original-hash' AND revoked_at IS NULL");
        assertEquals("newer-hash", jdbc.queryForObject("SELECT refresh_token_hash FROM auth_sessions", String.class));
    }

    private void waitingActivityAfter(String change, int expected) throws Exception {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        CountDownLatch attemptingLock = new CountDownLatch(1);
        JdbcTemplate signalling = new JdbcTemplate(dataSource) {
            @Override public <T> List<T> queryForList(String sql, Class<T> type, Object... args) {
                attemptingLock.countDown();
                return super.queryForList(sql, type, args);
            }
        };
        try (Connection owner = dataSource.getConnection()) {
            owner.setAutoCommit(false);
            try (var statement = owner.prepareStatement("SELECT session_uuid FROM auth_sessions WHERE session_uuid = ? FOR UPDATE")) {
                statement.setString(1, SID); try (var result = statement.executeQuery()) { assertTrue(result.next()); }
            }
            Future<Integer> waiting = executor.submit(() -> touch(signalling));
            assertTrue(attemptingLock.await(5, TimeUnit.SECONDS));
            awaitDatabaseLockWait();
            try (var statement = owner.prepareStatement(change)) { statement.setString(1, SID); assertEquals(1, statement.executeUpdate()); }
            owner.commit();
            assertEquals(expected, waiting.get(5, TimeUnit.SECONDS));
        } finally { executor.shutdownNow(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS)); }
    }

    private void awaitDatabaseLockWait() {
        long limit = System.nanoTime() + TimeUnit.SECONDS.toNanos(5);
        do {
            Integer waiting = jdbc.queryForObject("""
                    SELECT COUNT(*) FROM performance_schema.data_lock_waits w
                    JOIN performance_schema.data_locks l ON w.REQUESTING_ENGINE_LOCK_ID = l.ENGINE_LOCK_ID
                    WHERE l.OBJECT_SCHEMA = DATABASE() AND l.OBJECT_NAME = 'auth_sessions'
                    """, Integer.class);
            if (waiting != null && waiting > 0) return;
            java.util.concurrent.locks.LockSupport.parkNanos(TimeUnit.MILLISECONDS.toNanos(10));
        } while (System.nanoTime() < limit);
        fail("Expected an actual InnoDB row-lock wait between independent connections");
    }

    private void writeAfterActivity(String sql) throws Exception {
        ExecutorService executor = Executors.newSingleThreadExecutor();
        CountDownLatch writing = new CountDownLatch(1);
        java.util.concurrent.atomic.AtomicReference<Future<Integer>> writer = new java.util.concurrent.atomic.AtomicReference<>();
        try {
            transactions.executeWithoutResult(status -> {
                assertEquals(1, new CusCorporateSessionActivityRepository(jdbc).touchIfActive(SID, 7L));
                Future<Integer> concurrent = executor.submit(() -> { writing.countDown(); return jdbc.update(sql, SID); });
                writer.set(concurrent);
                try {
                    assertTrue(writing.await(5, TimeUnit.SECONDS));
                    // The row is still locked by this transaction. The other writer
                    // can commit only after this callback returns.
                    awaitDatabaseLockWait();
                    assertFalse(concurrent.isDone());
                } catch (InterruptedException e) { Thread.currentThread().interrupt(); throw new AssertionError(e); }
            });
            assertEquals(1, writer.get().get(5, TimeUnit.SECONDS));
        } finally { executor.shutdown(); assertTrue(executor.awaitTermination(5, TimeUnit.SECONDS)); }
    }
}
