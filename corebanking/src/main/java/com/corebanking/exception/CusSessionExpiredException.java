package com.corebanking.exception;

public class CusSessionExpiredException extends RuntimeException {

    public CusSessionExpiredException(String message) {
        super(message);
    }
}