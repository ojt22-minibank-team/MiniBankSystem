package com.corebanking.exception;

public class CusEmailException extends RuntimeException {

    public CusEmailException(String message) {
        super(message);
    }

    public CusEmailException(
            String message,
            Throwable cause) {

        super(message, cause);
    }
}