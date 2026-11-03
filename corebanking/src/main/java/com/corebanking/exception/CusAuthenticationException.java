package com.corebanking.exception;

import org.springframework.security.authentication.BadCredentialsException;

public class CusAuthenticationException
        extends BadCredentialsException {

    public CusAuthenticationException(
            String message) {

        super(message);
    }
}