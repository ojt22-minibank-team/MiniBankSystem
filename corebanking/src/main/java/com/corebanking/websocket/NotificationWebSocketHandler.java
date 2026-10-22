package com.corebanking.websocket;

import com.corebanking.dto.NotificationResponseDto;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.exception.CusSessionExpiredException;
import io.jsonwebtoken.JwtException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    // Thread-safe map: CustomerId (UUID string) -> Set of active WebSocket sessions
    private final Map<String, Set<WebSocketSession>> userSessions = new ConcurrentHashMap<>();
    private final Map<WebSocketSession, CustomerWebSocketSessionValidator.Connection> connections = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;
    private final CustomerWebSocketSessionValidator validator;

    public NotificationWebSocketHandler(CustomerWebSocketSessionValidator validator) {
        this.validator = validator;
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        synchronized (session) {
            if (!(session.getAttributes().get(CustomerWebSocketSessionValidator.AUTHENTICATION_ATTRIBUTE)
                    instanceof CustomerWebSocketSessionValidator.Connection connection)) {
                close(session, CloseStatus.POLICY_VIOLATION);
                return;
            }
            connections.put(session, connection);
            userSessions.compute(connection.customerId(), (id, sessions) -> {
                if (sessions == null) sessions = ConcurrentHashMap.newKeySet();
                sessions.add(session);
                return sessions;
            });
            sendAuthorized(session, connection.customerId(), Map.of(
                    "type", "CONNECTED", "message", "Real-time notification channel established."));
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        synchronized (session) { remove(session); }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload().trim();
        // Client heartbeat handling (PING -> PONG)
        if ("PING".equalsIgnoreCase(payload)) {
            sendAuthorized(session, null, Map.of("type", "PONG"));
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        close(session, CloseStatus.SERVER_ERROR);
    }

    /**
     * Broadcasts a real-time notification to all active sessions of a given customer.
     *
     * @param customerId UUID string of recipient customer
     * @param notification Notification DTO payload
     */
    public void sendNotification(String customerId, NotificationResponseDto notification) {
        if (customerId == null || notification == null) {
            return;
        }

        Set<WebSocketSession> sessions = userSessions.get(customerId);
        if (sessions == null || sessions.isEmpty()) {
            log.debug("No active WebSocket sessions found for CustomerId: {}. Notification stored in DB only.", customerId);
            return;
        }

        for (WebSocketSession session : sessions) {
            sendAuthorized(session, customerId, Map.of("type", "NOTIFICATION", "data", notification));
        }
    }

    private void sendAuthorized(WebSocketSession session, String customerId, Object payload) {
        synchronized (session) {
            var connection = connections.get(session);
            if (!session.isOpen() || connection == null
                    || (customerId != null && !customerId.equals(connection.customerId()))) {
                close(session, CloseStatus.POLICY_VIOLATION);
                return;
            }
            try {
                validator.revalidate(connection);
                session.sendMessage(new TextMessage(objectMapper.writeValueAsString(payload)));
            } catch (CusAuthenticationException | CusSessionExpiredException | JwtException | IllegalArgumentException authenticationFailure) {
                close(session, CloseStatus.POLICY_VIOLATION);
            } catch (IOException | RuntimeException temporaryFailure) {
                close(session, CloseStatus.SERVER_ERROR);
            }
        }
    }

    private void close(WebSocketSession session, CloseStatus status) {
        synchronized (session) {
            remove(session);
            try { session.close(status); }
            catch (IOException | RuntimeException ignored) { /* Registry already cleared. */ }
        }
    }

    private void remove(WebSocketSession session) {
        var connection = connections.remove(session);
        if (connection == null) return;
        userSessions.computeIfPresent(connection.customerId(), (id, sessions) -> {
            sessions.remove(session);
            return sessions.isEmpty() ? null : sessions;
        });
    }

    public Set<WebSocketSession> getActiveSessions(String customerId) {
        var sessions = userSessions.get(customerId);
        return sessions == null ? Set.of() : Set.copyOf(sessions);
    }
}
