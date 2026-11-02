package com.corebanking.websocket;

import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.repository.*;
import com.corebanking.service.*;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtParserBuilder;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.MockedStatic;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.server.ServletServerHttpResponse;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.socket.*;

import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Real signed JWTs, real JWT parser/session validator/handshake/handler and transfer
 * notification producer. Persistence and WebSocket transport are mocked. Controlled
 * parser and session clocks, no Boot context, application properties, or database.
 * This is not a live HTTP upgrade or Hibernate integration test.
 */
class CustomerNotificationWebSocketSecurityTest {
    private static final UUID A = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID B = UUID.fromString("33333333-3333-4333-8333-333333333333");
    private static final String SID = "22222222-2222-4222-8222-222222222222";
    private static final String SID_B = "44444444-4444-4444-8444-444444444444";
    private static final String KEY = "synthetic-websocket-signing-key-00000000001";
    private static final String ISSUER = "synthetic-notification-tests";
    private final AtomicReference<LocalDateTime> now = new AtomicReference<>();
    private final AtomicReference<Instant> jwtNow = new AtomicReference<>();
    private final Map<String, AuthSession> rows = new HashMap<>();
    private final Map<UUID, CustomerCredentials> credentialRows = new HashMap<>();
    private CusAuthSessionsRepository sessions;
    private CusCredentialsRepository credentials;
    private CusJwtRevokedTokensRepository revoked;
    private CusCorporateCredentialRepository corporate;
    private CusAuditLogsRepository audit;
    private CusJwtService jwt;
    private CusSessionService sessionService;
    private CustomerWebSocketSessionValidator validator;
    private JwtHandshakeInterceptor handshake;
    private NotificationWebSocketHandler handler;
    private MockedStatic<LocalDateTime> sessionClock;
    private MockedStatic<Jwts> jwtClock;
    private AuthSession session;
    private int socketId;

    @BeforeEach void isolatedSecurity() {
        jwtNow.set(Instant.now());
        now.set(LocalDateTime.ofInstant(jwtNow.get(), ZoneId.systemDefault()));
        sessions = mock(CusAuthSessionsRepository.class);
        credentials = mock(CusCredentialsRepository.class);
        revoked = mock(CusJwtRevokedTokensRepository.class);
        corporate = mock(CusCorporateCredentialRepository.class);
        audit = mock(CusAuditLogsRepository.class);
        jwt = signer(KEY, ISSUER, 900_000L);
        sessionService = new CusSessionService(sessions, credentials, audit, corporate);
        validator = new CustomerWebSocketSessionValidator(jwt, sessionService, revoked);
        handshake = new JwtHandshakeInterceptor(validator);
        handler = new NotificationWebSocketHandler(validator);
        session = addSession(A, SID);
        com.corebanking.service.CusSessionActivityTestSupport.wire(sessionService, sessions, () -> session);
        when(sessions.findBySessionUuid(anyString())).thenAnswer(call -> Optional.ofNullable(rows.get(call.getArgument(0))));
        when(credentials.findById(any())).thenAnswer(call -> Optional.ofNullable(credentialRows.get(call.getArgument(0))));
        when(sessions.save(any())).thenAnswer(call -> call.getArgument(0));
        when(sessions.revokeIfActive(anyString(), anyString(), any(), any(), any(), any())).thenAnswer(call -> {
            AuthSession row = rows.get(call.getArgument(0));
            if (row == null || row.getRevokedAt() != null) return 0;
            row.setRevokedAt(call.getArgument(2)); row.setRevokeReason(call.getArgument(1)); return 1;
        });
        sessionClock = mockStatic(LocalDateTime.class, CALLS_REAL_METHODS);
        sessionClock.when(LocalDateTime::now).thenAnswer(call -> now.get());
        jwtClock = mockStatic(Jwts.class, CALLS_REAL_METHODS);
        jwtClock.when(Jwts::parserBuilder).thenAnswer(call ->
                ((JwtParserBuilder) call.callRealMethod()).setClock(() -> Date.from(jwtNow.get())));
    }

    @AfterEach void closeClocks() {
        try { verifyNoInteractions(corporate); }
        finally {
            if (jwtClock != null) jwtClock.close();
            if (sessionClock != null) sessionClock.close();
        }
    }

    private CusJwtService signer(String key, String issuer, long lifetime) {
        var result = new CusJwtService();
        ReflectionTestUtils.setField(result, "jwtSecret", Base64.getEncoder().encodeToString(key.getBytes(StandardCharsets.UTF_8)));
        ReflectionTestUtils.setField(result, "jwtIssuer", issuer);
        ReflectionTestUtils.setField(result, "accessTokenExpiration", lifetime);
        return result;
    }

    private AuthSession addSession(UUID customerId, String sid) {
        Customers customer = Customers.builder().customerId(customerId).customerType(CustomerType.PERSONAL)
                .status(CustomerStatus.ACTIVE).fullName("Synthetic customer").build();
        var row = AuthSession.builder().sessionUuid(sid).subjectType(SessionSubjectType.CUSTOMER).customer(customer)
                .tokenVersionAtIssue(7L).issuedAt(now.get().minusHours(1)).lastSeenAt(now.get().minusMinutes(1))
                .refreshExpiresAt(now.get().plusHours(23)).idleTimeoutMinutes(5).build();
        rows.put(sid, row);
        credentialRows.put(customerId, CustomerCredentials.builder().customerId(customerId).customer(customer).tokenVersion(7L).build());
        return row;
    }

    private String access() { return jwt.generateAccessToken(A, SID, 7L); }
    private NotificationResponseDto notification() {
        return NotificationResponseDto.builder().notificationId(1L).title("Synthetic notification").build();
    }
    private Map<String, Object> authenticate(String token) throws Exception {
        var request = new MockHttpServletRequest("GET", "/ws/notifications");
        if (token != null) request.addParameter("token", token);
        var response = new MockHttpServletResponse();
        Map<String, Object> attributes = new HashMap<>();
        assertTrue(handshake.beforeHandshake(new ServletServerHttpRequest(request), new ServletServerHttpResponse(response), handler, attributes));
        return attributes;
    }
    private void reject(String token) throws Exception {
        var request = new MockHttpServletRequest("GET", "/ws/notifications");
        if (token != null) request.addParameter("token", token);
        var response = new MockHttpServletResponse();
        var attributes = new HashMap<String, Object>();
        assertFalse(handshake.beforeHandshake(new ServletServerHttpRequest(request), new ServletServerHttpResponse(response), handler, attributes));
        assertEquals(401, response.getStatus());
        assertFalse(attributes.containsKey(CustomerWebSocketSessionValidator.AUTHENTICATION_ATTRIBUTE));
        verify(sessions, never()).save(any());
    }
    private TestSocket connect(String token) throws Exception {
        var attributes = authenticate(token);
        var ws = mock(WebSocketSession.class);
        var open = new AtomicBoolean(true);
        List<TextMessage> frames = new ArrayList<>();
        when(ws.getId()).thenReturn("synthetic-socket-" + ++socketId);
        when(ws.getAttributes()).thenReturn(attributes);
        when(ws.isOpen()).thenAnswer(call -> open.get());
        doAnswer(call -> { frames.add(call.getArgument(0)); return null; }).when(ws).sendMessage(any(TextMessage.class));
        doAnswer(call -> { open.set(false); return null; }).when(ws).close(any(CloseStatus.class));
        handler.afterConnectionEstablished(ws);
        assertEquals(1, frames.size());
        assertTrue(frames.getFirst().getPayload().contains("CONNECTED"));
        return new TestSocket(ws, frames, attributes);
    }
    private record TestSocket(WebSocketSession ws, List<TextMessage> frames, Map<String, Object> attributes) { }
    private void deniedDelivery(TestSocket socket) throws Exception {
        int before = socket.frames.size();
        handler.sendNotification(A.toString(), notification());
        assertEquals(before, socket.frames.size());
        verify(socket.ws).close(CloseStatus.POLICY_VIOLATION);
        assertFalse(handler.getActiveSessions(A.toString()).contains(socket.ws));
        verify(sessions, never()).save(any());
    }

    @Test void validCustomerAccessConnectsWithBoundSessionAndNoActivityWrite() throws Exception {
        String token = access(); LocalDateTime lastSeen = session.getLastSeenAt();
        var socket = connect(token);
        var binding = (CustomerWebSocketSessionValidator.Connection) socket.attributes.get(CustomerWebSocketSessionValidator.AUTHENTICATION_ATTRIBUTE);
        assertEquals(A.toString(), binding.customerId()); assertEquals(SID, binding.sessionUuid());
        assertFalse(binding.toString().contains(token));
        assertEquals(lastSeen, session.getLastSeenAt()); verify(sessions, never()).save(any());
    }
    @Test void authorizationHeaderFallbackRemainsSupported() throws Exception {
        var request = new MockHttpServletRequest("GET", "/ws/notifications");
        request.addHeader("Authorization", "Bearer " + access());
        assertTrue(handshake.beforeHandshake(new ServletServerHttpRequest(request),
                new ServletServerHttpResponse(new MockHttpServletResponse()), handler, new HashMap<>()));
    }
    @Test void missingTokenIsRejected() throws Exception { reject(null); }
    @Test void malformedJwtIsRejected() throws Exception { reject("synthetic-not-a-jwt"); }
    @Test void invalidSignatureIsRejected() throws Exception { reject(signer("synthetic-wrong-websocket-key-0000000001", ISSUER, 900_000).generateAccessToken(A, SID, 7)); }
    @Test void wrongIssuerIsRejected() throws Exception { reject(signer(KEY, "synthetic-wrong-issuer", 900_000).generateAccessToken(A, SID, 7)); }
    @Test void expiredRealJwtIsRejected() throws Exception {
        String token = access(); jwtNow.set(jwtNow.get().plusSeconds(901)); reject(token);
    }
    @Test void refreshTokenIsRejected() throws Exception { reject(jwt.generateRefreshToken(A, SID, 7, Date.from(jwtNow.get().plusSeconds(86400)))); }
    @Test void corporateTokenIsRejected() throws Exception { reject(jwt.generateCorporateAccessToken(A, SID, 7)); }
    @Test void revokedJtiIsRejected() throws Exception {
        String token = access(); when(revoked.existsByJti(jwt.getClaims(token).getId())).thenReturn(true); reject(token);
    }
    @Test void revokedSessionIsRejected() throws Exception { session.setRevokedAt(now.get()); reject(access()); }
    @ParameterizedTest @ValueSource(ints = {300, 301})
    void idleExpiredSessionIsRejected(int seconds) throws Exception { session.setLastSeenAt(now.get().minusSeconds(seconds)); reject(access()); }
    @ParameterizedTest @ValueSource(ints = {86400, 86401})
    void absoluteExpiredSessionIsRejected(int seconds) throws Exception {
        session.setIssuedAt(now.get().minusSeconds(seconds)); session.setRefreshExpiresAt(now.get().plusHours(1));
        session.setLastSeenAt(now.get()); reject(access());
    }
    @Test void changedTokenVersionIsRejected() throws Exception { credentialRows.get(A).setTokenVersion(8L); reject(access()); }
    @Test void missingSessionIsRejected() throws Exception { rows.clear(); reject(access()); }
    @Test void customerIdentityMustMatchStoredSession() throws Exception { session.setCustomer(addSession(B, SID_B).getCustomer()); reject(access()); }
    @Test void inactiveCustomerIsRejected() throws Exception { session.getCustomer().setStatus(CustomerStatus.INACTIVE); reject(access()); }
    @Test void signedJwtWithoutExpirationIsRejected() throws Exception {
        String token = Jwts.builder().setSubject(A.toString()).setIssuer(ISSUER).setId(UUID.randomUUID().toString())
                .claim("sid", SID).claim("subjectType", "CUSTOMER").claim("tokenType", "ACCESS").claim("tokenVersion", 7L)
                .signWith(Keys.hmacShaKeyFor(KEY.getBytes(StandardCharsets.UTF_8)), SignatureAlgorithm.HS256).compact();
        reject(token);
    }
    @Test void customerIdAttributeAloneCannotRegisterAConnection() {
        var ws = mock(WebSocketSession.class);
        when(ws.getAttributes()).thenReturn(new HashMap<>(Map.of("customerId", A.toString())));
        handler.afterConnectionEstablished(ws);
        assertTrue(handler.getActiveSessions(A.toString()).isEmpty());
        assertDoesNotThrow(() -> verify(ws).close(CloseStatus.POLICY_VIOLATION));
    }
    @Test void logoutRevocationPreventsDeliveryAndCleansRegistry() throws Exception {
        String token = access(); var socket = connect(token);
        var logout = new CusCustomerSessionService(credentials, sessions, jwt, sessionService, revoked, audit);
        logout.logout("Bearer " + token);
        assertNotNull(session.getRevokedAt()); deniedDelivery(socket);
    }
    @Test void revokedJtiPreventsDeliveryOnAnExistingConnection() throws Exception {
        String token = access(); var socket = connect(token);
        when(revoked.existsByJti(jwt.getClaims(token).getId())).thenReturn(true); deniedDelivery(socket);
    }
    @Test void pingDoesNotMoveIdleDeadlineAndClosesAtFiveMinutes() throws Exception {
        LocalDateTime start = now.get(); session.setLastSeenAt(start); var socket = connect(access());
        now.set(start.plusSeconds(240)); handler.handleTextMessage(socket.ws, new TextMessage("PING"));
        assertTrue(socket.frames.getLast().getPayload().contains("PONG"));
        assertEquals(start, session.getLastSeenAt());
        now.set(start.plusSeconds(300)); int before = socket.frames.size();
        handler.handleTextMessage(socket.ws, new TextMessage("PING"));
        assertEquals(before, socket.frames.size()); verify(socket.ws).close(CloseStatus.POLICY_VIOLATION);
        assertTrue(handler.getActiveSessions(A.toString()).isEmpty()); verify(sessions, never()).save(any());
    }
    @Test void notificationDeliveryDoesNotWriteActivity() throws Exception {
        LocalDateTime lastSeen = session.getLastSeenAt(); var socket = connect(access());
        for (int i = 0; i < 3; i++) handler.sendNotification(A.toString(), notification());
        assertEquals(4, socket.frames.size()); assertEquals(lastSeen, session.getLastSeenAt());
        verify(sessions, never()).save(any());
    }
    @Test void idleExpirationPreventsNotificationDelivery() throws Exception {
        var socket = connect(access()); now.set(session.getLastSeenAt().plusMinutes(5)); deniedDelivery(socket);
    }
    @Test void absoluteExpirationPreventsNotificationDelivery() throws Exception {
        var socket = connect(access()); session.setIssuedAt(now.get().minusHours(24)); session.setLastSeenAt(now.get()); deniedDelivery(socket);
    }
    @Test void accessTokenExpirationPreventsDeliveryEvenWithRecentUserActivity() throws Exception {
        var socket = connect(access()); session.setLastSeenAt(now.get()); jwtNow.set(jwtNow.get().plusSeconds(901)); deniedDelivery(socket);
    }
    @Test void tokenVersionChangePreventsDelivery() throws Exception {
        var socket = connect(access()); credentialRows.get(A).setTokenVersion(8L); deniedDelivery(socket);
    }
    @Test void customerACannotReceiveCustomerBNotifications() throws Exception {
        addSession(B, SID_B); var a = connect(access()); var b = connect(jwt.generateAccessToken(B, SID_B, 7));
        handler.sendNotification(B.toString(), notification());
        assertEquals(1, a.frames.size()); assertEquals(2, b.frames.size());
        assertTrue(b.frames.getLast().getPayload().contains("NOTIFICATION")); verify(sessions, never()).save(any());
    }
    @Test void revokingOneSessionDoesNotCloseAnotherSessionForSameCustomer() throws Exception {
        addSession(A, SID_B); var a = connect(access()); var b = connect(jwt.generateAccessToken(A, SID_B, 7));
        session.setRevokedAt(now.get()); handler.sendNotification(A.toString(), notification());
        assertEquals(1, a.frames.size()); assertEquals(2, b.frames.size());
        assertEquals(Set.of(b.ws), handler.getActiveSessions(A.toString()));
    }
    @Test void mutableLegacyAttributesCannotChangeConnectionIdentityOrCleanupTarget() throws Exception {
        var a = connect(access()); a.attributes.put("customerId", B.toString());
        handler.sendNotification(B.toString(), notification()); assertEquals(1, a.frames.size());
        handler.afterConnectionClosed(a.ws, CloseStatus.NORMAL);
        assertTrue(handler.getActiveSessions(A.toString()).isEmpty()); assertTrue(handler.getActiveSessions(B.toString()).isEmpty());
    }
    @Test void olderConnectionCleanupPreservesNewerConnection() throws Exception {
        var a = connect(access()); var newer = connect(access());
        handler.afterConnectionClosed(a.ws, CloseStatus.NORMAL);
        assertEquals(Set.of(newer.ws), handler.getActiveSessions(A.toString()));
        handler.sendNotification(A.toString(), notification()); assertEquals(2, newer.frames.size());
    }
    @Test void failingTransportDoesNotPreventOtherCustomersOrConnectionsReceiving() throws Exception {
        var broken = connect(access()); var healthy = connect(access());
        doThrow(new IOException("Synthetic offline transport")).when(broken.ws).sendMessage(any(TextMessage.class));
        handler.sendNotification(A.toString(), notification());
        verify(broken.ws).close(CloseStatus.SERVER_ERROR);
        assertEquals(2, healthy.frames.size()); assertEquals(Set.of(healthy.ws), handler.getActiveSessions(A.toString()));
    }
    @Test void realUserKeepAliveStillUpdatesActivityWhileWebSocketTrafficDoesNot() throws Exception {
        String token = access(); var socket = connect(token); LocalDateTime before = session.getLastSeenAt();
        handler.handleTextMessage(socket.ws, new TextMessage("PING")); assertEquals(before, session.getLastSeenAt());
        sessionService.validateAccessSession(jwt.getClaims(token)); assertEquals(now.get(), session.getLastSeenAt());
        handler.sendNotification(A.toString(), notification());
        verify(sessions, times(1)).touchIfValid(eq(SID), eq(SessionSubjectType.CUSTOMER), eq(A), eq(7L), any(), any());
        verify(sessions, never()).save(any());
    }
    @Test void transientPersistenceFailureClosesWithoutDataAndAllowsNormalClientTransportRecovery() throws Exception {
        var socket = connect(access());
        when(sessions.findBySessionUuid(SID)).thenThrow(new org.springframework.dao.DataAccessResourceFailureException("Synthetic database outage"));
        handler.sendNotification(A.toString(), notification());
        assertEquals(1, socket.frames.size());
        verify(socket.ws).close(CloseStatus.SERVER_ERROR);
        assertTrue(handler.getActiveSessions(A.toString()).isEmpty());
    }
    @Test void group2TransferProducerKeepsItsExistingPayloadAndSendInterface() throws Exception {
        AuthSession receiver = addSession(B, SID_B);
        var senderSocket = connect(access()); var receiverSocket = connect(jwt.generateAccessToken(B, SID_B, 7));
        var notificationRepository = mock(NotificationRepository.class);
        when(notificationRepository.save(any(Notifications.class))).thenAnswer(call -> call.getArgument(0));
        var producer = new AsyncNotificationService(notificationRepository, handler);
        var transaction = BankTransactions.builder().transactionRef("SYNTHETIC-REF")
                .amount(new BigDecimal("100.00")).serviceFee(new BigDecimal("2.00")).currency("MMK")
                .sourceAccount(Accounts.builder().accountNumber("SYNTHETIC-A").customer(session.getCustomer()).build())
                .destinationAccount(Accounts.builder().accountNumber("SYNTHETIC-B").customer(receiver.getCustomer()).build()).build();
        producer.sendTransferNotificationsAsync(session.getCustomer(), receiver.getCustomer(), transaction);
        assertEquals(2, senderSocket.frames.size()); assertEquals(2, receiverSocket.frames.size());
        assertTrue(senderSocket.frames.getLast().getPayload().contains("\"transferDirection\":\"SENT\""));
        assertTrue(receiverSocket.frames.getLast().getPayload().contains("\"transferDirection\":\"RECEIVED\""));
        producer.sendFailedTransferNotificationAsync(session.getCustomer(), "SYNTHETIC-B", BigDecimal.ONE, "MMK", "Synthetic failure");
        assertEquals(3, senderSocket.frames.size()); assertTrue(senderSocket.frames.getLast().getPayload().contains("Transfer Failed"));
        verify(notificationRepository, times(3)).save(any(Notifications.class)); verify(sessions, never()).save(any());
    }
}
