package com.corebanking.security;

import com.corebanking.entity.AuthSessions;
import com.corebanking.service.CusJwtService;
import com.corebanking.service.CusSessionService;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import com.corebanking.repository.CusJwtRevokedTokensRepository;
import java.io.IOException;
import java.util.List;

@Component
@RequiredArgsConstructor
public class CusJwtAuthenticationFilter
        extends OncePerRequestFilter {

    private final CusJwtService cusJwtService;

    private final CusSessionService cusSessionService;
    private final CusJwtRevokedTokensRepository jwtRevokedTokensRepository;

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {


        String authorizationHeader =
                request.getHeader(
                        "Authorization"
                );


        if (authorizationHeader == null
                || !authorizationHeader
                        .startsWith("Bearer ")) {

            unauthorized(
                    response,
                    "Authentication token is required."
            );

            return;
        }


        String token =
                authorizationHeader
                        .substring(7)
                        .trim();


        try {

            // JWT signature + expiration verify
            Claims claims =
                    cusJwtService.getClaims(
                            token
                    );
            
         // =====================================================
         // JWT REVOKED / BLACKLIST CHECK
         // =====================================================

         String jti =
                 claims.getId();

         if (jti == null
                 || jti.isBlank()) {

             unauthorized(
                     response,
                     "Invalid authentication token."
             );

             return;
         }


         if (jwtRevokedTokensRepository
                 .existsByJti(jti)) {

             unauthorized(
                     response,
                     "Authentication token has been revoked."
             );

             return;
         }


            // DB session + timeout + revoke check
            AuthSessions session =
                    cusSessionService
                            .validateAccessSession(
                                    claims
                            );


            String customerId =
                    session
                            .getCustomer()
                            .getCustomerId()
                            .toString();


            // Spring Security Authentication
            UsernamePasswordAuthenticationToken authentication =
                    new UsernamePasswordAuthenticationToken(
                            customerId,
                            null,
                            List.of(
                                    new SimpleGrantedAuthority(
                                            "ROLE_CUSTOMER"
                                    )
                            )
                    );


            authentication.setDetails(
                    new WebAuthenticationDetailsSource()
                            .buildDetails(
                                    request
                            )
            );


            SecurityContextHolder
                    .getContext()
                    .setAuthentication(
                            authentication
                    );


            filterChain.doFilter(
                    request,
                    response
            );


        } catch (ExpiredJwtException ex) {

            unauthorized(
                    response,
                    "Access token has expired."
            );


        } catch (JwtException
                 | IllegalArgumentException ex) {

            unauthorized(
                    response,
                    "Invalid authentication token."
            );


        } catch (RuntimeException ex) {

            unauthorized(
                    response,
                    "Authentication session is invalid or expired."
            );
        }
    }


    // =========================================================
    // PUBLIC CUSTOMER AUTH URLs → FILTER မစစ်
    // =========================================================

    @Override
    protected boolean shouldNotFilter(
            HttpServletRequest request) {

        String uri =
                request.getRequestURI();


        // Customer API မဟုတ်ရင်
        // ဒီ customer filter မသုံး
        if (!uri.startsWith(
                "/api/customer/")) {

            return true;
        }


        return uri.equals(
                    "/api/customer/auth/login"
                )

                || uri.equals(
                    "/api/customer/auth/verify-otp"
                )

                || uri.equals(
                    "/api/customer/auth/resend-otp"
                )

                || uri.equals(
                    "/api/customer/auth/first-login/change-password"
                )

                || uri.equals(
                    "/api/customer/auth/first-login/setup-pin"
                )

                || uri.equals(
                    "/api/customer/auth/refresh"
                );
    }


    private void unauthorized(
            HttpServletResponse response,
            String message)
            throws IOException {

        response.setStatus(
                HttpServletResponse.SC_UNAUTHORIZED
        );

        response.setContentType(
                "application/json"
        );

        response.getWriter().write(
                "{\"success\":false,"
                        + "\"message\":\""
                        + message
                        + "\"}"
        );
    }
}