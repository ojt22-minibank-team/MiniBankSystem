package com.corebanking.exception;

import org.springframework.security.authentication.BadCredentialsException;

public class CusAuthenticationException
        extends RuntimeException {

    public CusAuthenticationException(
            String message) {

        super(message);
    }
}