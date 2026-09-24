package com.corebanking.exception;

public class CusAuthenticationException
        extends RuntimeException {

    public CusAuthenticationException(
            String message) {

        super(message);
    }
}