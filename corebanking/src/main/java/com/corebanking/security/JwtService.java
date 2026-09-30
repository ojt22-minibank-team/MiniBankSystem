package com.corebanking.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    private static final String SECRET_KEY =
            "my-core-banking-secret-key-must-be-at-least-32-characters";

    private static final long EXPIRATION_TIME =
            15 * 60 * 1000;

    private Key getSigningKey() {
        return Keys.hmacShaKeyFor(
                SECRET_KEY.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String generateToken(
            UUID staffId,
            String username,
            long tokenVersion,
            List<String> roles,
            List<String> permissions
    ) {

        Date now = new Date();

        Date expiry = new Date(
                now.getTime() + EXPIRATION_TIME
        );

        Map<String, Object> claims = new HashMap<>();

        claims.put("staff_id", staffId.toString());
        claims.put("token_version", tokenVersion);
        claims.put("roles", roles);
        claims.put("permissions", permissions);

        return Jwts.builder()
                .setClaims(claims)
                .setSubject(username)

                // Unique ID for this JWT
                .setId(UUID.randomUUID().toString())

                .setIssuedAt(now)
                .setExpiration(expiry)

                .signWith(
                        getSigningKey(),
                        SignatureAlgorithm.HS256
                )
                .compact();
    }

    public Claims extractAllClaims(String token) {

        return Jwts.parserBuilder()
                .setSigningKey(getSigningKey())
                .build()
                .parseClaimsJws(token)
                .getBody();
    }

    public String extractJti(String token) {

        return extractAllClaims(token).getId();
    }

    public String extractUsername(String token) {

        return extractAllClaims(token)
                .getSubject();
    }

    public UUID extractStaffId(String token) {

        String staffId =
                extractAllClaims(token)
                        .get("staff_id", String.class);

        return UUID.fromString(staffId);
    }

    public long extractTokenVersion(String token) {

        Number tokenVersion =
                extractAllClaims(token)
                        .get("token_version", Number.class);

        return tokenVersion.longValue();
    }

    @SuppressWarnings("unchecked")
    public List<String> extractRoles(String token) {

        return extractAllClaims(token)
                .get("roles", List.class);
    }

    @SuppressWarnings("unchecked")
    public List<String> extractPermissions(String token) {

        return extractAllClaims(token)
                .get("permissions", List.class);
    }

    public boolean isTokenValid(String token) {

        try {

            return !extractAllClaims(token)
                    .getExpiration()
                    .before(new Date());

        } catch (Exception e) {

            return false;
        }
    }
}