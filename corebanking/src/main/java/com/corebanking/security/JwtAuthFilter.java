
package com.corebanking.security;

import com.corebanking.dto.CoreApiResponse;
import com.corebanking.entity.StaffUsers;
import com.corebanking.entity.enums.StaffUserStatus;
import com.corebanking.repository.JWTRevokedTokensRepository;
import com.corebanking.repository.StaffUsersRepository;

import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final JWTRevokedTokensRepository jwtRevokedTokensRepository;
    private final StaffUsersRepository staffUsersRepository;
    private final ObjectMapper objectMapper;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,

            FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);


        if (!StringUtils.hasText(header)
                || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7).trim();

        if (!StringUtils.hasText(token)) {
            sendUnauthorizedResponse(
                response, "Authentication token is missing"
            );
            return;
        }

        try {
            if (!jwtService.isTokenValid(token)) {
                sendUnauthorizedResponse(
                    response, "Invalid or expired authentication token"
                );
                return;
            }

            // Parse the claims for this request.
            var claims = jwtService.extractAllClaims(token);

            String jti = claims.getId();

            if (jwtRevokedTokensRepository.existsByJti(jti)) {
                sendUnauthorizedResponse(
                    response, "Authentication token has been revoked"
                );
                return;
            }

            UUID staffId = UUID.fromString(
                claims.get("staff_id", String.class)
            );

            long tokenVersion = ((Number)
                claims.get("token_version")).longValue();

            String username = claims.getSubject();

            StaffUsers staff = staffUsersRepository.findById(staffId)
                .orElse(null);

            if (staff == null) {
                sendUnauthorizedResponse(
                    response, "Staff account was not found"
                );
                return;
            }

            if (staff.getStatus() != StaffUserStatus.ACTIVE) {
                sendUnauthorizedResponse(
                    response, "Staff account is not active"
                );
                return;
            }

            if (staff.getTokenVersion() != tokenVersion) {
                sendUnauthorizedResponse(
                    response, "Authentication token is no longer valid"
                );
                return;
            }

            if (SecurityContextHolder.getContext()
                    .getAuthentication() == null) {

                List<SimpleGrantedAuthority> authorities =
                    new ArrayList<>();

                List<?> roles = claims.get("roles", List.class);
                List<?> permissions = claims.get("permissions", List.class);

                for (Object role : roles) {
                    if (!(role instanceof String roleName)) {
                        sendUnauthorizedResponse(
                            response, "Invalid role claim"
                        );
                        return;
                    }

                    String authority = roleName.startsWith("ROLE_")
                        ? roleName
                        : "ROLE_" + roleName;

                    authorities.add(
                        new SimpleGrantedAuthority(authority)
                    );
                }

                for (Object permission : permissions) {
                    if (!(permission instanceof String permissionName)) {
                        sendUnauthorizedResponse(
                            response, "Invalid permission claim"
                        );
                        return;
                    }

                    authorities.add(
                        new SimpleGrantedAuthority(permissionName)
                    );
                }

                UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                        username,
                        null,
                        authorities
                    );

                authentication.setDetails(
                    new WebAuthenticationDetailsSource()
                        .buildDetails(request)
                );

                SecurityContextHolder.getContext()
                    .setAuthentication(authentication);
            }

            filterChain.doFilter(request, response);

        } catch (JwtException | IllegalArgumentException ex) {
            SecurityContextHolder.clearContext();

            sendUnauthorizedResponse(
                response, "Invalid or expired authentication token"
            );

        } catch (Exception ex) {
            SecurityContextHolder.clearContext();

            log.error(
                "Unexpected error while processing authentication",
                ex
            );

            sendServerErrorResponse(response);
        }
    }

    private void sendUnauthorizedResponse(
            HttpServletResponse response,
            String message) throws IOException {

        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        CoreApiResponse<Void> apiResponse =
            CoreApiResponse.<Void>builder()
                .success(false)
                .message(message)
                .data(null)
                .build();

        objectMapper.writeValue(response.getWriter(), apiResponse);
    }

    private void sendServerErrorResponse(
            HttpServletResponse response) throws IOException {

        response.setStatus(
            HttpServletResponse.SC_INTERNAL_SERVER_ERROR
        );
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");

        CoreApiResponse<Void> apiResponse =
            CoreApiResponse.<Void>builder()
                .success(false)
                .message("An internal authentication error occurred")
                .data(null)
                .build();

        objectMapper.writeValue(response.getWriter(), apiResponse);
    }
}

