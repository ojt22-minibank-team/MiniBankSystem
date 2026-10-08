package com.corebanking.exception;

public class CusAccountLockedException extends RuntimeException {

    public CusAccountLockedException(String message) {
        super(message);
    }
}