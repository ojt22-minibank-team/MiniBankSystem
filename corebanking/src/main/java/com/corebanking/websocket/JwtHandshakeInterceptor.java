package com.corebanking.websocket;

import com.corebanking.service.CusJwtService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.server.ServletServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.server.HandshakeInterceptor;

import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtHandshakeInterceptor implements HandshakeInterceptor {

    private final CusJwtService cusJwtService;

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
                return false;
            }

            Claims claims = cusJwtService.getClaims(token);
            String customerId = claims.getSubject();

            if (customerId == null || customerId.isBlank()) {
                log.warn("WebSocket handshake rejected: Token does not contain customer identifier");
                return false;
            }

            attributes.put("customerId", customerId);
            attributes.put("customerCode", claims.get("customerCode"));
            log.info("WebSocket handshake authenticated successfully for CustomerId: {}", customerId);
            return true;

        } catch (Exception e) {
            log.warn("WebSocket handshake rejected - Token validation failed: {}", e.getMessage());
            return false;
        }
    }

    @Override
    public void afterHandshake(ServerHttpRequest request, ServerHttpResponse response,
                               WebSocketHandler wsHandler, Exception exception) {
        // Handshake completion callback
    }
}
