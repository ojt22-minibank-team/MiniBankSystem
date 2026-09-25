package com.corebanking.security;

import java.io.IOException;
import java.util.List;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import com.corebanking.entity.AuthSessions;
import com.corebanking.repository.CusJwtRevokedTokensRepository;
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


@Component
@RequiredArgsConstructor
public class CusJwtAuthenticationFilter
        extends OncePerRequestFilter {


    private final CusJwtService cusJwtService;

    private final CusSessionService cusSessionService;

    private final CusJwtRevokedTokensRepository
            jwtRevokedTokensRepository;


    // =========================================================
    // JWT FILTER
    // =========================================================

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain)
            throws ServletException, IOException {


        System.out.println(
                "CUS JWT FILTER RUNNING: "
                        + request.getRequestURI()
        );


        // =====================================================
        // 1. AUTHORIZATION HEADER
        // =====================================================

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


        // =====================================================
        // 2. EXTRACT TOKEN
        // =====================================================

        String token =
                authorizationHeader
                        .substring(7)
                        .trim();


        try {


            // =================================================
            // 3. JWT SIGNATURE + EXPIRATION VERIFY
            // =================================================

            Claims claims =
                    cusJwtService.getClaims(
                            token
                    );


            // Temporary Debug
            System.out.println(
                    "JWT SUBJECT = "
                            + claims.getSubject()
            );

            System.out.println(
                    "JWT SID = "
                            + claims.get("sid")
            );

            System.out.println(
                    "JWT TOKEN TYPE = "
                            + claims.get("tokenType")
            );

            System.out.println(
                    "JWT TOKEN VERSION = "
                            + claims.get("tokenVersion")
            );

            System.out.println(
                    "JWT JTI = "
                            + claims.getId()
            );


            // =================================================
            // 4. TOKEN TYPE MUST BE ACCESS
            // =================================================

            String tokenType =
                    claims.get(
                            "tokenType",
                            String.class
                    );


            if (!"ACCESS".equals(
                    tokenType)) {

                unauthorized(
                        response,
                        "Access token is required."
                );

                return;
            }


            // =================================================
            // 5. JTI CHECK
            // =================================================

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


            // =================================================
            // 6. REVOKED TOKEN CHECK
            // =================================================

            if (jwtRevokedTokensRepository
                    .existsByJti(jti)) {

                unauthorized(
                        response,
                        "Authentication token has been revoked."
                );

                return;
            }


            // =================================================
            // 7. VALIDATE DB SESSION
            // =================================================

            AuthSessions session =
                    cusSessionService
                            .validateAccessSession(
                                    claims
                            );


            // =================================================
            // 8. CUSTOMER ID
            // =================================================

            String customerId =
                    session
                            .getCustomer()
                            .getCustomerId()
                            .toString();


            // =================================================
            // 9. CREATE SPRING AUTHENTICATION
            // =================================================

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


            // =================================================
            // 10. SAVE AUTHENTICATION
            // =================================================

            SecurityContextHolder
                    .getContext()
                    .setAuthentication(
                            authentication
                    );


            // =================================================
            // 11. CONTINUE REQUEST
            // =================================================

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


            System.out.println(
                    "JWT ERROR: "
                            + ex.getMessage()
            );


            unauthorized(
                    response,
                    "Invalid authentication token."
            );


        } catch (RuntimeException ex) {


            System.out.println(
                    "JWT FILTER ERROR: "
                            + ex.getMessage()
            );


            ex.printStackTrace();


            unauthorized(
                    response,
                    ex.getMessage()
            );
        }
    }


    // =========================================================
    // WHICH URLs SHOULD SKIP THIS FILTER?
    // =========================================================

    @Override
    protected boolean shouldNotFilter(
            HttpServletRequest request) {


        String uri =
                request.getRequestURI();


        // =====================================================
        // 1. CUSTOMER API မဟုတ်ရင်
        // JWT Filter မစစ်ဘူး
        //
        // Swagger UI
        // v3 api docs
        // staff APIs
        // other APIs
        // =====================================================

        if (!uri.startsWith(
                "/api/customer/")) {

            return true;
        }


        // =====================================================
        // 2. PUBLIC CUSTOMER AUTH APIs
        // =====================================================

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


    // =========================================================
    // UNAUTHORIZED RESPONSE
    // =========================================================

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