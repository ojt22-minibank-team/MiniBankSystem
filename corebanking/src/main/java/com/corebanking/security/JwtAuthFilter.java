package com.corebanking.security;

import com.corebanking.entity.StaffUsers;
import com.corebanking.repository.StaffUsersRepository;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import lombok.RequiredArgsConstructor;

import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;

    private final StaffUsersRepository staffUsersRepository;


    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain
    ) throws ServletException, IOException {


        // =================================================
        // Get Authorization Header
        // =================================================

        final String authHeader =
                request.getHeader("Authorization");


        if (authHeader == null ||
                !authHeader.startsWith("Bearer ")) {

            filterChain.doFilter(
                    request,
                    response
            );

            return;
        }


        // =================================================
        // Extract JWT
        // =================================================

        final String jwt =
                authHeader.substring(7);


        try {

            // =================================================
            // Check JWT
            // =================================================

            if (!jwtService.isTokenValid(jwt)) {

                response.setStatus(
                        HttpServletResponse.SC_UNAUTHORIZED
                );

                return;
            }


            // =================================================
            // Extract JWT Data
            // =================================================

            String username =
                    jwtService.extractUsername(jwt);

            Long staffId =
                    jwtService.extractStaffId(jwt);

            Integer tokenVersion =
                    jwtService.extractTokenVersion(jwt);

            List<String> roles =
                    jwtService.extractRoles(jwt);

            List<String> permissions =
                    jwtService.extractPermissions(jwt);


            // =================================================
            // Get Staff From Database
            // =================================================

            StaffUsers staff =
                    staffUsersRepository
                            .findById(staffId)
                            .orElse(null);


            if (staff == null) {

                response.setStatus(
                        HttpServletResponse.SC_UNAUTHORIZED
                );

                return;
            }


            // =================================================
            // Check Account Status
            // =================================================

            if (!"ACTIVE".equals(
                    staff.getStatus()
            )) {

                response.setStatus(
                        HttpServletResponse.SC_UNAUTHORIZED
                );

                return;
            }


            // =================================================
            // Check Token Version
            // =================================================

            if (!tokenVersion.equals(
                    staff.getToken_version()
            )) {

                response.setStatus(
                        HttpServletResponse.SC_UNAUTHORIZED
                );

                return;
            }


            // =================================================
            // Check Security Context
            // =================================================

            if (SecurityContextHolder
                    .getContext()
                    .getAuthentication() == null) {


                List<GrantedAuthority> authorities =
                        new ArrayList<>();


                // Roles
                if (roles != null) {

                    roles.forEach(role ->

                            authorities.add(
                                    new SimpleGrantedAuthority(
                                            "ROLE_" + role
                                    )
                            )
                    );
                }


                // Permissions
                if (permissions != null) {

                    permissions.forEach(permission ->

                            authorities.add(
                                    new SimpleGrantedAuthority(
                                            permission
                                    )
                            )
                    );
                }


                // =================================================
                // Create Authentication
                // =================================================

                UsernamePasswordAuthenticationToken authToken =

                        new UsernamePasswordAuthenticationToken(
                                username,
                                null,
                                authorities
                        );


                SecurityContextHolder
                        .getContext()
                        .setAuthentication(authToken);
            }


        } catch (Exception e) {

            response.setStatus(
                    HttpServletResponse.SC_UNAUTHORIZED
            );

            return;
        }


        filterChain.doFilter(
                request,
                response
        );
    }
}