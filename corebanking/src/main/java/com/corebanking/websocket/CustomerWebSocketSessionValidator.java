package com.corebanking.websocket;

import com.corebanking.entity.AuthSession;
import com.corebanking.exception.CusAuthenticationException;
import com.corebanking.repository.CusJwtRevokedTokensRepository;
import com.corebanking.service.CusJwtService;
import com.corebanking.service.CusSessionService;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Individual notification authentication, with no background activity writes. */
@Component
@RequiredArgsConstructor
public class CustomerWebSocketSessionValidator {
    public static final String AUTHENTICATION_ATTRIBUTE = "customerNotificationAuthentication";

    private final CusJwtService jwtService;
    private final CusSessionService sessionService;
    private final CusJwtRevokedTokensRepository revokedTokens;

    public Connection authenticate(String accessToken) {
        Claims claims = jwtService.getClaims(accessToken);
        String jti = claims.getId();
        if (claims.getExpiration() == null || jti == null || jti.isBlank()
                || revokedTokens.existsByJti(jti)) {
            throw new CusAuthenticationException("Invalid notification authentication.");
        }
        // The existing validator owns CUSTOMER/ACCESS, identity, version and lifetime checks.
        // Its write-capable transaction preserves expiration revocation on failure.
        AuthSession session = sessionService.validateAccessSessionWithoutActivity(claims);
        return new Connection(accessToken, session.getCustomer().getCustomerId().toString(),
                session.getSessionUuid(), claims.get("customerCode", String.class));
    }

    public void revalidate(Connection connection) {
        Connection current = authenticate(connection.accessToken);
        if (!current.customerId.equals(connection.customerId)
                || !current.sessionUuid.equals(connection.sessionUuid)) {
            throw new CusAuthenticationException("Notification session has changed.");
        }
    }

    // Constructor is private: a customerId attribute alone cannot create this binding.
    // Deliberately no generated toString(), which could expose the access token in logs.
    public static final class Connection {
        private final String accessToken;
        private final String customerId;
        private final String sessionUuid;
        private final String customerCode;

        private Connection(String accessToken, String customerId, String sessionUuid, String customerCode) {
            this.accessToken = accessToken;
            this.customerId = customerId;
            this.sessionUuid = sessionUuid;
            this.customerCode = customerCode;
        }

        public String customerId() { return customerId; }
        public String sessionUuid() { return sessionUuid; }
        public String customerCode() { return customerCode; }
    }
}
