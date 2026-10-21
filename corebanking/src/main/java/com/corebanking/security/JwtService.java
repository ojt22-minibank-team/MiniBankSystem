
package com.corebanking.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class JwtService {

    private static final String AUDIENCE = "StaffPortalApp";
    private static final String CLAIM_STAFF_ID = "staff_id";
    private static final String CLAIM_TOKEN_VERSION = "token_version";
    private static final String CLAIM_ROLES = "roles";
    private static final String CLAIM_PERMISSIONS = "permissions";
    private static final int MINIMUM_HS256_KEY_BYTES = 32;

    @Value("${application.security.jwt.secret-key}")
    private String secretKey;

    @Value("${application.security.jwt.expiration}")
    private long jwtExpiration;

    @Value("${application.security.jwt.issuer:CoreBankingSystem}")
    private String jwtIssuer;

    private Key getSigningKey() {
        if (!StringUtils.hasText(secretKey)) {
            throw new IllegalStateException(
                "JWT secret key must not be empty"
            );
        }

        byte[] keyBytes =
            secretKey.getBytes(StandardCharsets.UTF_8);

        if (keyBytes.length < MINIMUM_HS256_KEY_BYTES) {
            throw new IllegalStateException(
                "JWT secret key must be at least 32 bytes for HS256"
            );
        }

        return Keys.hmacShaKeyFor(keyBytes);
    }

    public String generateToken(
            UUID staffId,
            String username,
            long tokenVersion,
            List<String> roles,
            List<String> permissions) {

        if (staffId == null) {
            throw new IllegalArgumentException(
                "Staff ID must not be null"
            );
        }

        if (!StringUtils.hasText(username)) {
            throw new IllegalArgumentException(
                "Username must not be empty"
            );
        }

        if (tokenVersion < 0) {
            throw new IllegalArgumentException(
                "Token version must not be negative"
            );
        }

        if (roles == null || permissions == null) {
            throw new IllegalArgumentException(
                "Roles and permissions must not be null"
            );
        }

        if (jwtExpiration <= 0) {
            throw new IllegalStateException(
                "JWT expiration must be greater than zero"
            );
        }

        if (!StringUtils.hasText(jwtIssuer)) {
            throw new IllegalStateException(
                "JWT issuer must not be empty"
            );
        }

        Date now = new Date();
        Date expiry = new Date(now.getTime() + jwtExpiration);

        Map<String, Object> claims = new HashMap<>();
        claims.put(CLAIM_STAFF_ID, staffId.toString());
        claims.put(CLAIM_TOKEN_VERSION, tokenVersion);
        claims.put(CLAIM_ROLES, List.copyOf(roles));
        claims.put(CLAIM_PERMISSIONS, List.copyOf(permissions));

        return Jwts.builder()
            .setClaims(claims)
            .setSubject(username)
            .setIssuer(jwtIssuer)
            .setAudience(AUDIENCE)
            .setId(UUID.randomUUID().toString())
            .setIssuedAt(now)
            .setExpiration(expiry)
            .signWith(getSigningKey(), SignatureAlgorithm.HS256)
            .compact();
    }

    public Claims extractAllClaims(String token) {
        if (!StringUtils.hasText(token)) {
            throw new IllegalArgumentException(
                "JWT token must not be empty"
            );
        }

        return Jwts.parserBuilder()
            .setSigningKey(getSigningKey())
            .requireIssuer(jwtIssuer)
            .requireAudience(AUDIENCE)
            .build()
            .parseClaimsJws(token)
            .getBody();
    }

    public String extractJti(String token) {
        String jti = extractAllClaims(token).getId();

        if (!StringUtils.hasText(jti)) {
            throw new IllegalArgumentException(
                "JWT ID is missing"
            );
        }

        return jti;
    }

    public String extractUsername(String token) {
        String username = extractAllClaims(token).getSubject();

        if (!StringUtils.hasText(username)) {
            throw new IllegalArgumentException(
                "JWT subject is missing"
            );
        }

        return username;
    }

    public UUID extractStaffId(String token) {
        String staffId = extractAllClaims(token)
            .get(CLAIM_STAFF_ID, String.class);

        if (!StringUtils.hasText(staffId)) {
            throw new IllegalArgumentException(
                "Staff ID claim is missing"
            );
        }

        try {
            return UUID.fromString(staffId);
        } catch (IllegalArgumentException ex) {
            throw new IllegalArgumentException(
                "Staff ID claim has an invalid UUID format",
                ex
            );
        }
    }

    public long extractTokenVersion(String token) {
        Object value = extractAllClaims(token)
            .get(CLAIM_TOKEN_VERSION);

        if (!(value instanceof Number)) {
            throw new IllegalArgumentException(
                "Token version claim is missing or invalid"
            );
        }

        Number number = (Number) value;
        long version = number.longValue();

        if (version < 0
                || number.doubleValue() != (double) version) {
            throw new IllegalArgumentException(
                "Token version must be a non-negative integer"
            );
        }

        return version;
    }

    public List<String> extractRoles(String token) {
        return extractStringList(
            extractAllClaims(token), CLAIM_ROLES
        );
    }

    public List<String> extractPermissions(String token) {
        return extractStringList(
            extractAllClaims(token), CLAIM_PERMISSIONS
        );
    }

    private List<String> extractStringList(
            Claims claims, String claimName) {

        Object value = claims.get(claimName);

        if (!(value instanceof List<?> values)) {
            throw new IllegalArgumentException(
                "JWT claim '" + claimName + "' is missing or invalid"
            );
        }

        for (Object item : values) {
            if (!(item instanceof String)) {
                throw new IllegalArgumentException(
                    "JWT claim '" + claimName
                        + "' must contain only strings"
                );
            }
        }

        @SuppressWarnings("unchecked")
        List<String> result = (List<String>) values;

        return List.copyOf(result);
    }

    public boolean isTokenValid(String token) {
        try {
            Claims claims = extractAllClaims(token);

            if (!StringUtils.hasText(claims.getSubject())
                    || !StringUtils.hasText(claims.getId())) {
                return false;
            }

            String staffId = claims.get(
                CLAIM_STAFF_ID, String.class
            );

            if (!StringUtils.hasText(staffId)) {
                return false;
            }

            UUID.fromString(staffId);

            Object versionValue = claims.get(CLAIM_TOKEN_VERSION);

            if (!(versionValue instanceof Number versionNumber)) {
                return false;
            }

            long version = versionNumber.longValue();

            if (version < 0
                    || versionNumber.doubleValue() != (double) version) {
                return false;
            }

            extractStringList(claims, CLAIM_ROLES);
            extractStringList(claims, CLAIM_PERMISSIONS);

            return true;

        } catch (ExpiredJwtException ex) {
            log.debug("JWT rejected: expired");
        } catch (MalformedJwtException ex) {
            log.debug("JWT rejected: malformed");
        } catch (JwtException ex) {
            log.debug("JWT rejected: verification failed");
        } catch (IllegalArgumentException ex) {
            log.debug("JWT rejected: invalid claims");
        }

        return false;
    }
}
