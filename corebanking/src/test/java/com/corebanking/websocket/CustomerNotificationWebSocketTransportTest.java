package com.corebanking.websocket;

import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.entity.*;
import com.corebanking.entity.enums.*;
import com.corebanking.repository.*;
import com.corebanking.service.CusJwtService;
import com.corebanking.service.CusSessionService;
import org.apache.catalina.startup.Tomcat;
import org.apache.tomcat.websocket.server.WsSci;
import org.junit.jupiter.api.*;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.DispatcherServlet;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;

import java.net.URI;
import java.net.http.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Actual loopback HTTP upgrade and WebSocket frames through production Spring
 * WebSocketConfig/interceptor/handler/validator in embedded Tomcat. Repositories
 * are mocked. No Boot context, application properties, datasource, production DB,
 * or full application Spring Security filter chain is loaded.
 */
class CustomerNotificationWebSocketTransportTest {
    private static final UUID ID = UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final String SID = "22222222-2222-4222-8222-222222222222";
    private Tomcat tomcat;
    private Path directory;
    private AnnotationConfigWebApplicationContext context;
    private CusJwtService jwt;
    private CusAuthSessionsRepository sessions;
    private final AtomicReference<AuthSession> row = new AtomicReference<>();
    private WebSocket client;

    @BeforeEach void isolatedLoopbackServer() throws Exception {
        sessions = mock(CusAuthSessionsRepository.class);
        var credentials = mock(CusCredentialsRepository.class);
        var corporate = mock(CusCorporateCredentialRepository.class);
        var audit = mock(CusAuditLogsRepository.class);
        var revoked = mock(CusJwtRevokedTokensRepository.class);
        Customers customer = Customers.builder().customerId(ID).customerType(CustomerType.PERSONAL).status(CustomerStatus.ACTIVE).build();
        LocalDateTime now = LocalDateTime.now();
        row.set(AuthSession.builder().sessionUuid(SID).subjectType(SessionSubjectType.CUSTOMER).customer(customer)
                .tokenVersionAtIssue(7L).issuedAt(now.minusHours(1)).lastSeenAt(now.minusMinutes(1))
                .refreshExpiresAt(now.plusHours(23)).idleTimeoutMinutes(5).build());
        when(sessions.findBySessionUuid(SID)).thenAnswer(call -> Optional.of(row.get()));
        when(credentials.findById(ID)).thenReturn(Optional.of(CustomerCredentials.builder().customerId(ID).customer(customer).tokenVersion(7L).build()));
        jwt = new CusJwtService();
        ReflectionTestUtils.setField(jwt, "jwtSecret", Base64.getEncoder().encodeToString("synthetic-live-websocket-test-signing-key-01".getBytes(StandardCharsets.UTF_8)));
        ReflectionTestUtils.setField(jwt, "jwtIssuer", "synthetic-loopback-transport");
        ReflectionTestUtils.setField(jwt, "accessTokenExpiration", 900_000L);
        var validation = new CusSessionService(sessions, credentials, audit, corporate);
        context = new AnnotationConfigWebApplicationContext();
        context.addBeanFactoryPostProcessor(factory -> {
            factory.registerSingleton("syntheticJwt", jwt);
            factory.registerSingleton("noTouchSessionValidation", validation);
            factory.registerSingleton("syntheticRevocations", revoked);
        });
        context.register(WebSocketTestConfiguration.class);
        directory = Files.createTempDirectory("minibank-websocket-test-");
        tomcat = new Tomcat(); tomcat.setBaseDir(directory.toString()); tomcat.setPort(0);
        tomcat.getConnector().setProperty("address", "127.0.0.1");
        var web = tomcat.addContext("", directory.toString());
        web.addServletContainerInitializer(new WsSci(), Set.of());
        Tomcat.addServlet(web, "dispatcher", new DispatcherServlet(context)).setLoadOnStartup(1);
        web.addServletMappingDecoded("/", "dispatcher");
        tomcat.start();
        assertEquals(0, context.getBeanNamesForType(javax.sql.DataSource.class).length);
    }

    @AfterEach void cleanup() throws Exception {
        if (client != null) client.abort();
        if (tomcat != null) { tomcat.stop(); tomcat.destroy(); }
        if (context != null && context.isActive()) context.close();
        if (directory != null) try (var files = Files.walk(directory)) {
            for (Path p : files.sorted(Comparator.reverseOrder()).toList()) Files.deleteIfExists(p);
        }
    }

    private URI endpoint(String token) {
        return URI.create("ws://127.0.0.1:" + tomcat.getConnector().getLocalPort() + "/ws/notifications?token=" + token);
    }
    private static class Messages implements WebSocket.Listener {
        final BlockingQueue<String> frames = new LinkedBlockingQueue<>();
        final BlockingQueue<Integer> closed = new LinkedBlockingQueue<>();
        final StringBuilder pending = new StringBuilder();
        @Override public void onOpen(WebSocket ws) { ws.request(1); }
        @Override public CompletionStage<?> onText(WebSocket ws, CharSequence text, boolean last) {
            pending.append(text);
            if (last) { frames.offer(pending.toString()); pending.setLength(0); }
            ws.request(1); return CompletableFuture.completedFuture(null);
        }
        @Override public CompletionStage<?> onClose(WebSocket ws, int code, String reason) {
            closed.offer(code); return CompletableFuture.completedFuture(null);
        }
        String next() throws InterruptedException {
            String frame = frames.poll(5, TimeUnit.SECONDS); assertNotNull(frame, "Expected WebSocket frame"); return frame;
        }
    }

    @Test void realUpgradePingAndNotificationDeliveryPreservePayloadAndLastSeen() throws Exception {
        var messages = new Messages(); LocalDateTime lastSeen = row.get().getLastSeenAt();
        client = HttpClient.newHttpClient().newWebSocketBuilder().buildAsync(endpoint(jwt.generateAccessToken(ID, SID, 7)), messages).get(5, TimeUnit.SECONDS);
        assertTrue(messages.next().contains("CONNECTED"));
        client.sendText("PING", true).get(5, TimeUnit.SECONDS); assertTrue(messages.next().contains("PONG"));
        context.getBean(NotificationWebSocketHandler.class).sendNotification(ID.toString(), NotificationResponseDto.builder().title("Synthetic live notification").build());
        String frame = messages.next(); assertTrue(frame.contains("NOTIFICATION")); assertTrue(frame.contains("Synthetic live notification"));
        assertEquals(lastSeen, row.get().getLastSeenAt()); verify(sessions, never()).save(any());
    }

    @Test void realUpgradeRejectsRefreshTokenWith401() {
        String refresh = jwt.generateRefreshToken(ID, SID, 7, new Date(System.currentTimeMillis() + 3600_000));
        ExecutionException failure = assertThrows(ExecutionException.class, () -> HttpClient.newHttpClient().newWebSocketBuilder()
                .buildAsync(endpoint(refresh), new Messages()).get(5, TimeUnit.SECONDS));
        var handshakeFailure = assertInstanceOf(WebSocketHandshakeException.class, failure.getCause());
        assertEquals(401, handshakeFailure.getResponse().statusCode());
    }

    @Test void realConnectionClosesAfterRevocationWithoutDeliveringNotification() throws Exception {
        var messages = new Messages();
        client = HttpClient.newHttpClient().newWebSocketBuilder().buildAsync(endpoint(jwt.generateAccessToken(ID, SID, 7)), messages).get(5, TimeUnit.SECONDS);
        messages.next();
        AuthSession session = row.get(); session.setRevokedAt(LocalDateTime.now()); row.set(session);
        var handler = context.getBean(NotificationWebSocketHandler.class);
        handler.sendNotification(ID.toString(), NotificationResponseDto.builder().title("Must not deliver").build());
        assertEquals(1008, messages.closed.poll(5, TimeUnit.SECONDS)); assertTrue(messages.frames.isEmpty());
        assertTrue(handler.getActiveSessions(ID.toString()).isEmpty()); verify(sessions, never()).save(any());
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    @Import({WebSocketConfig.class, JwtHandshakeInterceptor.class, NotificationWebSocketHandler.class, CustomerWebSocketSessionValidator.class})
    static class WebSocketTestConfiguration { }
}
