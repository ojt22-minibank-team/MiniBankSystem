package com.corebanking.websocket;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final CustomerWebSocketSessionValidator validator;

    @Override
    public boolean beforeHandshake(ServerHttpRequest request, ServerHttpResponse response,
                                   WebSocketHandler wsHandler, Map<String, Object> attributes) {
        try {
            String token = null;

            // 1. Try query parameter (e.g. ws://.../ws/notifications?token=...)
            if (request instanceof ServletServerHttpRequest servletRequest) {
                token = servletRequest.getServletRequest().getParameter("token");
            }

            // 2. Fallback to Authorization Header
            if (token == null || token.isBlank()) {
                String authHeader = request.getHeaders().getFirst("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    token = authHeader.substring(7);
                }
            }

            if (token == null || token.isBlank()) {
                log.warn("WebSocket handshake rejected: Missing authentication token");
                response.setStatusCode(HttpStatus.UNAUTHORIZED);
                return false;
            }

            var connection = validator.authenticate(token);
            attributes.put(CustomerWebSocketSessionValidator.AUTHENTICATION_ATTRIBUTE, connection);
            attributes.put("customerId", connection.customerId());
            if (connection.customerCode() != null) attributes.put("customerCode", connection.customerCode());
            return true;

        } catch (Exception e) {
            // JWT parser errors may contain sensitive token data; never log the exception.
            log.warn("WebSocket handshake rejected: Invalid customer authentication");
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // Handshake completion callback
    }
}
