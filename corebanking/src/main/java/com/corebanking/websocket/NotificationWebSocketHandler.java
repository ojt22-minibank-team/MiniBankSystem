package com.corebanking.websocket;

import com.corebanking.dto.NotificationResponseDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Component
public class NotificationWebSocketHandler extends TextWebSocketHandler {

    // Thread-safe map: CustomerId (UUID string) -> Set of active WebSocket sessions
    private final Map<String, Set<WebSocketSession>> userSessions = new ConcurrentHashMap<>();

    private final ObjectMapper objectMapper;

    public NotificationWebSocketHandler() {
        this.objectMapper = new ObjectMapper();
        this.objectMapper.registerModule(new JavaTimeModule());
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) {
        String customerId = (String) session.getAttributes().get("customerId");
        if (customerId != null) {
            userSessions.computeIfAbsent(customerId, k -> ConcurrentHashMap.newKeySet()).add(session);
            log.info("WebSocket connected for CustomerId: {} [SessionId: {}, Total active sessions for user: {}]",
                    customerId, session.getId(), userSessions.get(customerId).size());

            // Send initial connection acknowledgement
            sendDirectMessage(session, Map.of(
                    "type", "CONNECTED",
                    "message", "Real-time notification channel established."
            ));
        } else {
            log.warn("WebSocket session {} rejected: customerId attribute missing", session.getId());
            try {
                session.close(CloseStatus.POLICY_VIOLATION);
            } catch (IOException ignored) {}
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String customerId = (String) session.getAttributes().get("customerId");
        if (customerId != null) {
            Set<WebSocketSession> sessions = userSessions.get(customerId);
            if (sessions != null) {
                sessions.remove(session);
                if (sessions.isEmpty()) {
                    userSessions.remove(customerId);
                }
            }
            log.info("WebSocket disconnected for CustomerId: {} [SessionId: {}, CloseStatus: {}]",
                    customerId, session.getId(), status);
        }
    }

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        String payload = message.getPayload().trim();
        // Client heartbeat handling (PING -> PONG)
        if ("PING".equalsIgnoreCase(payload)) {
            sendDirectMessage(session, Map.of("type", "PONG"));
        }
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) {
        log.error("WebSocket transport error for session {}: {}", session.getId(), exception.getMessage());
        try {
            session.close(CloseStatus.SERVER_ERROR);
        } catch (IOException ignored) {}
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

        try {
            Map<String, Object> messagePayload = Map.of(
                    "type", "NOTIFICATION",
                    "data", notification
            );
            String json = objectMapper.writeValueAsString(messagePayload);
            TextMessage textMessage = new TextMessage(json);

            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    try {
                        synchronized (session) {
                            session.sendMessage(textMessage);
                        }
                        log.info("Dispatched real-time notification to CustomerId: {} [SessionId: {}]", customerId, session.getId());
                    } catch (IOException e) {
                        log.error("Failed to send WebSocket message to session {}: {}", session.getId(), e.getMessage());
                    }
                }
            }
        } catch (Exception e) {
            log.error("Failed to serialize and dispatch notification for CustomerId: {}", customerId, e);
        }
    }

    private void sendDirectMessage(WebSocketSession session, Object payload) {
        try {
            String json = objectMapper.writeValueAsString(payload);
            synchronized (session) {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(json));
                }
            }
        } catch (Exception e) {
            log.error("Failed to send direct message to session {}: {}", session.getId(), e.getMessage());
        }
    }

    public Set<WebSocketSession> getActiveSessions(String customerId) {
        return userSessions.getOrDefault(customerId, Collections.emptySet());
    }
}
